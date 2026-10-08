# Data Bugs and Their Tests

The model is fine and the code is fine, but the data is wrong. Data bugs fail in two directions:

- **The score lies.** Something about the test set leaks into training, so offline numbers are too good. You find out in production.
- **The model learns the wrong thing.** Wrong labels, mismatched preprocessing, or a shortcut in the data. The score may even be honest, and the model is still useless.

A famous case covers both. Pneumonia models trained on chest X-rays from several hospitals learned to recognise *which hospital* an image came from: scanner type, the text markers stamped on the image. One hospital had far more pneumonia, so knowing the hospital was enough to score well. The models were partly reading the logistics, not the lungs.

Unlike [architecture bugs](architecture-bugs-and-tests.md), these usually don't show up as a weird loss curve. The curve is often *better* than it should be.

## Where they hide

| Bug | What it looks like | Why you don't notice | Caught by |
| :--- | :--- | :--- | :--- |
| Duplicates across splits | The same row, or the same photo resized, in train and test | The test score is inflated by memorization. About 3% of CIFAR-10's test images have near-duplicates in its training set | Hash overlap |
| Group leakage | A random row split puts the same patient, user or speaker in both splits | The model recognises the person, not the pattern | Group overlap; `GroupKFold` |
| Time leakage | A random split of time-ordered data; `bfill`, centred rolling windows, features computed with tomorrow's data | Great backtest, bad live performance | Time-ordered split |
| Preprocessing on all data | Scaler, imputer, vocab or PCA fit before the split | Mild optimism. Easy to miss because the gap is small | Do the fit inside `Pipeline` |
| Labels used before the split | Feature selection, target encoding or oversampling done on the full dataset | The score is high even on *random* labels | Random-labels test |
| Target leakage | A column recorded after the outcome, e.g. `refund_issued` when predicting churn | One feature does almost all the work | Leak scan |
| Label noise | Wrong labels. ImageNet's validation set is estimated to be about 6% mislabeled | The model still trains; the ceiling is just lower, and the test score is noisy | Out-of-fold confidence (cleanlab) |
| Label mapping | `ImageFolder` builds `class_to_idx` from the *folders it finds*. A val set missing one class shifts every later index by one | Accuracy collapses for some classes only | Compare the mappings |
| Train/serve skew | Training reads images with PIL (RGB), serving with OpenCV (BGR); `ToTensor` scales to `[0, 1]`, serving sends `0–255` | Offline metrics are perfect; production is not | Same raw input, same tensor |
| Augmentation bugs | The image is rotated but its mask or boxes aren't; a flip turns a `6` into a `9`; random crops left on at eval | The model learns from wrong pairs | Look at a batch |
| Broken alignment | `X` and `y` shuffled separately; a `merge` on a non-unique key duplicates rows | Accuracy near chance, or rows silently counted twice | Look at a batch; `validate=` on merges |
| Sentinel values | Missing data stored as `-999` or `0` and treated as a real number | The model finds a "pattern" in missingness | Range checks |

## The six tests that catch most of it

**1. Look at a batch, after the loader.** Not the raw files: the tensors the model actually receives, after augmentation and normalization, with their labels printed next to them. BGR colours, unrotated masks, wrong labels and `0–255` inputs are obvious within a second of looking. This catches more data bugs than any other test on the page.

**2. Check the splits are clean.** No identical rows, no shared groups, no future data in train. These are cheap set operations.

**3. Run the whole pipeline on random labels.** Shuffle `y` *before anything else*, then run the split, preprocessing, feature selection, training and scoring unchanged. The score must drop to chance. If it doesn't, some step uses the labels before the split. With 100 samples of 5,000 pure-noise features, selecting the best 50 on all the data and then cross-validating reports **91%** accuracy. The correct pipeline, which selects inside each fold, reports 42%: chance, give or take noise.

**4. Scan for one-feature leaks.** Train a small model on one feature at a time. A single feature with an AUC near 1.0 almost always knows the answer for the wrong reason.

**5. Beat a dumb baseline.** Predict the majority class, or the mean. 99% accuracy means nothing when 99% of the samples are one class. If your model barely beats the baseline, check the labels before the architecture.

**6. Same raw input, same tensor.** Send one raw sample through the training preprocessing and through the serving code. The two tensors must match exactly. This is the only test that catches train/serve skew before users do.

```python
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import cross_val_score


def row_hashes(df):
    return set(pd.util.hash_pandas_object(df, index=False))


def test_no_row_in_both_splits(train, test):
    shared = row_hashes(train[FEATURES]) & row_hashes(test[FEATURES])
    assert not shared, f"{len(shared)} test rows also appear in train"


def test_no_group_in_both_splits(train, test):
    shared = set(train[GROUP]) & set(test[GROUP])
    assert not shared, f"{len(shared)} {GROUP}s appear in both splits"


def test_train_is_before_test(train, test):
    assert train[TIME].max() < test[TIME].min()


def test_random_labels_score_at_chance(X, y, evaluate):
    """`evaluate(X, y)` is your whole pipeline: split, preprocess, select, train, score."""
    y_random = np.random.default_rng(0).permutation(y)
    chance = pd.Series(y).value_counts(normalize=True).max()
    assert evaluate(X, y_random) < chance + 0.1


def leak_scan(X, y, top=5):
    """AUC of a model that sees one feature at a time. Near 1.0 = suspect."""
    auc = {c: cross_val_score(HistGradientBoostingClassifier(max_iter=50), X[[c]], y,
                              cv=3, scoring="roc_auc").mean()
           for c in X}
    return sorted(auc.items(), key=lambda kv: -kv[1])[:top]
```

`row_hashes` only finds *exact* duplicates. A resized or re-encoded image hashes differently. For near-duplicates, compare perceptual hashes (images) or embeddings (anything), and flag pairs above a similarity threshold.

The random-labels margin of `0.1` is loose on purpose: a small test set fluctuates around chance. A leak doesn't land near chance, though. In a 200-sample run, the leaky feature-selection pipeline still scored 0.87 on random labels, and the correct one scored 0.55.

## Leakage: when the score is too good

Leakage is the worst data bug because it rewards you. Every number improves, so nobody goes looking. A 2023 review found leakage in nearly 300 published papers across 17 scientific fields.

The rule: **anything that learns from data learns from the training split only.** That includes the obvious things (the model) and the easily missed ones:

| Step | Wrong | Right |
| :--- | :--- | :--- |
| Scaling, imputation, PCA | `fit` on the full dataset, then split | Put them in a `Pipeline`; `cross_val_score` refits them per fold |
| Feature selection | Pick features by their correlation with the full `y` | Inside the `Pipeline` |
| Target / mean encoding | `df.groupby("city")["y"].transform("mean")` on everything | Out-of-fold encoding (`sklearn.preprocessing.TargetEncoder` does this) |
| Oversampling (SMOTE) | Oversample, then split: synthetic test points are interpolated from training points | Split, then oversample the training fold only (`imblearn.pipeline.Pipeline`) |
| Hyperparameter tuning | Pick the best model on the test set | Tune on validation; touch the test set once |
| Splitting | `train_test_split` on rows that share a patient, user or date | `GroupKFold`, `StratifiedGroupKFold` or `TimeSeriesSplit` |

!!! warning "Target encoding fit on all data"
    With 500 categories and completely *random* labels, a target encoding computed on the full dataset gives 68% cross-validated accuracy. The encoded column already contains the answer for every row the model is tested on. The random-labels test catches this immediately.

## Train/serve skew: when the inputs change

The model was trained on one function of the raw data and is served on another. Everything offline matches, because offline never runs the serving code.

- **Colour order.** `cv2.imread` returns BGR. PIL and torchvision use RGB.
- **Scale.** `transforms.ToTensor()` divides by 255. A serving path built on NumPy often doesn't.
- **Normalization.** ImageNet `mean`/`std` applied in training and forgotten in serving, or applied twice.
- **Orientation.** Phone photos store their rotation in EXIF metadata. PIL ignores it unless you call `ImageOps.exif_transpose`.
- **Resizing.** PIL, OpenCV and `torch` resize with different interpolation and antialiasing. Small numeric differences can still flip predictions near the decision boundary.
- **Text.** A different tokenizer version, or lowercasing in training but not in serving.

The fix is structural: **one preprocessing function, imported by both training and serving.** Then a test that sends a fixed raw sample through both paths and requires identical tensors.

## The rest of the catalogue

| Check | Do | Expect | Catches |
| :--- | :--- | :--- | :--- |
| Schema | Assert dtypes, ranges, allowed categories and null rates at load time | Pass | Sentinel values; a new category; a unit change upstream |
| Row counts | `merge(..., validate="many_to_one")` and compare `len` before and after | No `MergeError`; counts as expected | Joins that silently duplicate or drop rows |
| Label mapping | `train_ds.class_to_idx == val_ds.class_to_idx` | Equal | Shifted class indices |
| Split distributions | Compare each feature and the label rate across splits | Similar | A split that doesn't look like the data |
| Class balance | Look at the label counts per split | Every class present in every split | Rare classes missing from validation (stratify) |
| Shuffling | Plot the labels in loader order for the first few batches | Mixed | Sorted data fed in order: the model chases one class at a time |
| Label errors | Rank samples by out-of-fold confidence in their given label | Review the top suspects | Mislabeled data ([cleanlab](https://github.com/cleanlab/cleanlab)) |
| Slices | Score per group: hospital, device, language, region | No group far below the rest | A shortcut that only works for the majority |
| Drift (production) | Compare live input and prediction distributions to training | Stable | Data that slowly stopped looking like training |

## So do people really test all this?

Again, mostly not as a formal suite. In practice:

1. **They look at the data.** Karpathy's first step in training any network is "become one with the data": hours of looking at examples before writing any model code. It is still the highest-yield habit.
2. **They let the tools make the right thing the default.** An sklearn `Pipeline` with `cross_val_score` makes fit-on-train automatic. `GroupKFold` and `TimeSeriesSplit` make the split honest. pandas `validate=` makes joins check themselves.
3. **They validate the schema at the boundary.** [pandera](https://pandera.readthedocs.io/) or [Great Expectations](https://greatexpectations.io/) for tables. At Google scale, TensorFlow Data Validation infers a schema from training data and flags anomalies and train/serve skew automatically.
4. **They use off-the-shelf checks.** [Deepchecks](https://github.com/deepchecks/deepchecks) has ready-made train/test leakage and drift checks. [cleanlab](https://github.com/cleanlab/cleanlab) finds label errors. [Evidently](https://github.com/evidentlyai/evidently) monitors drift.
5. **They distrust good news.** A result that is suddenly much better gets the random-labels test and a leak scan before anyone celebrates.

## Sources

- [Leakage and the Reproducibility Crisis in ML-based Science — Kapoor & Narayanan](https://arxiv.org/abs/2207.07048)
- [Leakage in Data Mining: Formulation, Detection, and Avoidance — Kaufman et al.](https://dl.acm.org/doi/10.1145/2382577.2382579)
- [Variable Generalization Performance of a Deep Learning Model to Detect Pneumonia in Chest Radiographs — Zech et al.](https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.1002683)
- [Pervasive Label Errors in Test Sets Destabilize Machine Learning Benchmarks — Northcutt et al.](https://arxiv.org/abs/2103.14749)
- [Do We Train on Test Data? Purging CIFAR of Near-Duplicates — Barz & Denzler](https://arxiv.org/abs/1902.00423)
- [The Elements of Statistical Learning §7.10.2, "The Wrong and Right Way to Do Cross-validation"](https://hastie.su.domains/ElemStatLearn/)
- [scikit-learn: Common pitfalls and recommended practices](https://scikit-learn.org/stable/common_pitfalls.html)
- [Data Validation for Machine Learning — Breck et al. (TFDV)](https://mlsys.org/Conferences/2019/doc/2019/167.pdf)
- [A Recipe for Training Neural Networks — Andrej Karpathy](https://karpathy.github.io/2019/04/25/recipe/)
