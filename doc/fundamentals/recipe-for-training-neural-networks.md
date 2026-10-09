# A Recipe for Training Neural Networks

!!! note
    This page is essentially a summary of **Andrej Karpathy**'s blog post [A Recipe for Training Neural Networks](https://karpathy.github.io/2019/04/25/recipe/) (April 25, 2019).


## The recipe

Go from simple to complex. At every step, make a concrete hypothesis about what should happen, then either confirm it with an experiment or dig in until you find the problem. Never add a lot of unverified complexity at once.

The steps run **in order**. Each one assumes the previous one is done, so finish a step before starting the next.

### Where am I?

Find your phase from what you **observe**, not from what you'd like to work on next. Go down the table and stop at the **first** row that is true:

| What you observe | Phase | What to do |
|---|---|---|
| You haven't looked through the data yet, or you can't describe its quirks | [1. Data](#1-become-one-with-the-data) | Look at the data before writing model code. |
| No full train + eval loop yet, the loss at init is off, or the model **can't** overfit one small batch | [2. Skeleton](#2-set-up-the-end-to-end-skeleton--get-dumb-baselines) | Something is broken. Debug the pipeline; don't change the model. |
| On the full dataset, the **training** loss stays high (underfitting) | [3. Overfit](#3-overfit) | Make the model fit the training set: train longer, fix the learning rate, add capacity. |
| Training loss is low, but validation loss stalls or rises and the gap keeps growing (**overfitting**) | [4. Regularize](#4-regularize) | Trade some training loss for validation loss: more data, augmentation, dropout, weight decay, early stopping. **Not** a bigger model yet. |
| More regularisation no longer improves the validation loss | [5. Tune](#5-tune) | Search the hyperparameters. |
| Tuned, and you want the last few percent | [6. Squeeze](#6-squeeze-out-the-juice) | Ensembles, train longer. |

**Example.** Train loss keeps falling while val loss bottoms out and then climbs. Rows 1–3 are false (the model *can* fit the training set), row 4 is true: you are in **4. Regularize**. The model overfitting here is a *symptom* to fix, not the "Overfit" step.

**Going back is normal.** If regularizing pushes the training loss back up too far, you are underfitting again: go back to step 3. If val loss looks *lower* than train loss, that is usually a measurement artifact, not a phase; see [Diagnosing Model Performance](diagnosing_model_performance.md#case-2-validation-loss-lower-than-training-loss).

### 1. Become one with the data

**You're here when:** you're starting out, or you can't yet describe the data's quirks. **Done when:** you know its distributions, outliers and label noise, and have a feel for what the model needs to see. **Next:** step 2.

Don't touch model code yet. Spend hours scanning thousands of examples. Look for duplicates, corrupted images or labels, imbalances and biases. Pay attention to how *you* classify the examples, because that hints at the architecture you need. Do you need local features or global context? Which variation is spurious? Does spatial position matter? How far can you downsample? How noisy are the labels?

Then write simple code to search, filter and sort the data, and plot distributions along every axis you can think of. The outliers almost always expose bugs in data quality or preprocessing.

### 2. Set up the end-to-end skeleton + get dumb baselines

**You're here when:** there's no full train + eval loop yet, or you don't trust it. **Done when:** runs are reproducible, the loss at init matches the expected value, the model beats an input-independent baseline, and it can overfit one small batch to near-zero loss. **Next:** step 3. A model that *can't* overfit one batch keeps you here: that's a bug, not a capacity problem.

Build the full training + evaluation loop around a model you can't get wrong, like a linear classifier or a tiny ConvNet. Then gain trust in that loop:

- **Fix the random seed for the entire project** so two runs give the same result, if no model architecture has been changed (or data)
- **Simplify.** Turn off data augmentation and anything else fancy.
- **Evaluate on the full test set** add significant digits to your eval. When plotting the test loss run the evaluation over the entire (large) test set. Do not just plot test losses over batches and then rely on smoothing them in Tensorboard. We are in pursuit of correctness and are very willing to give up time for staying sane.
- **Initialise the output layer and verify the loss at init.** Start the final bias at the best constant guess so you don't get a "hockey stick" loss curve, then check that the step-0 loss matches it (e.g. `log(n_classes)` for a balanced softmax). See [Initialise well](#initialise-well-and-verify-the-loss-at-init) below.
- **Human baseline.** Track a metric people can read, such as accuracy, and compare it with human performance.
- **Input-independent baseline.** Train an input-independent baseline, example: Zero the inputs. Your model with real inputs should do clearly better.
- **Overfit one batch.** With just a few examples, you should reach near-zero loss, and the predictions should line up with the labels.
- **Verify the training loss drops** when you add a little capacity.
- **Visualise just before the net.** Decode exactly what goes into `model(x)`. This is the only source of truth.
- **Visualise prediction dynamics.** Freeze a handful of validation examples, snapshot the model's predictions on them every N steps, and play the snapshots back like a flipbook. The inputs never change, so every frame-to-frame change comes purely from the weight updates. You're watching the network learn in slow motion, something the averaged loss curve smooths away.
  - Healthy: the true-class probability climbs steadily, 0.2 → 0.3 → 0.4 → 0.6, and a predicted box glides onto the object. 
  - Unhealthy: it jitters, 0.2 → 0.1 → 0.25 → 0.15, and the box twitches around. The updates are overshooting, so lower the learning rate.
- **Use backprop to chart dependencies.** Set the loss to depend only on example *i*, then check that only input *i* gets a non-zero gradient. This catches bugs that mix data across the batch (e.g. `view` where you needed `permute`).
- **Generalise a special case.** Write the specific, loopy version first, then generalise or vectorise it while checking the outputs still match.

#### Initialise well and verify the loss at init


We would gladly accept an initialisation that already gives the model the highest accuracy and the lowest loss. But since that not possible, what we want is the **best input-independent guess**: predict the mean of the targets, or the class frequencies. 

**What a wrong init looks like.**  `hockey stick loss curve`: a steep drop at the start (the network fixing the offset or calming down its overconfidence), then a flat stretch where the real learning happens. 
This causes wasted steps.


<div class="scene" data-scene="hockey-stick"></div>

**Prevent it** by starting the output at the best input-independent guess:

- **Regression:** standardise the targets (zero mean, unit variance), or set the final bias to the target mean $\bar{y}$.
- **Classification:** set the final bias to the log class frequencies, $b_c = \log p_c$. For a binary sigmoid that's $b = \log\frac{p}{1-p}$. Balanced classes need nothing: $b = 0$.
- **Shrink the final-layer weights** (e.g. ×0.01), so the output at init is that bias and not confident noise.

```python
with torch.no_grad():
    model.head.weight.mul_(0.01)                   # output ≈ bias
    model.head.bias.copy_(torch.log(class_freqs))  # or y_train.mean() for regression
```

**Check it.** The step-0 loss is then predictable:

- $\log C$ for $C$ balanced classes, e.g. 2.30 for 10 classes or 6.91 for 1000.
- The label entropy $-\sum_c p_c \log p_c$ for imbalanced classes.
- The target variance for MSE.

If the loss is far above that, check the head.

### 3. Overfit

!!! warning "Here, overfit is the goal, not the problem"
    This step asks you to *reach* a model that fits the training set well. If your model is already overfitting (train loss low, val loss rising), this step is done and you're in [step 4](#4-regularize).

**You're here when:** the pipeline works (step 2), but on the full dataset the **training** loss stays high (underfitting). **Done when:** the training loss gets low on the full dataset, usually with val loss starting to lag behind it. **Next:** step 4.

Find a model big enough to drive the *training* loss down, then regularise it. If no model can fit the training set, something is wrong.

- **Don't be a hero.** Copy the simplest well-performing architecture from the most related paper, e.g. ResNet-50 for images.
- **Adam is safe.** Adam with a learning rate of 3e-4 is forgiving. For ConvNets a well-tuned SGD usually does slightly better, but its good learning-rate range is narrow. Sequence models usually use Adam anyway; follow whatever the closest papers do.
- **Add complexity one piece at a time**, and check that each one gives the boost you expected.
- **Don't trust learning rate decay defaults.** Schedules borrowed from other code are often tied to epoch counts from a different dataset. Start with a constant learning rate and tune the decay at the end.

### 4. Regularize

**You're here when:** the training loss is low but the validation loss stalls or rises, and the gap between them grows (**overfitting**). **Done when:** more regularisation no longer improves the validation loss. The goal is the best validation score, not the smallest gap. **Next:** step 5. If regularizing pushes the training loss back up too far, go back to step 3.

First keep the best-val checkpoint so you don't lose the good epoch, then try the items below one at a time, re-checking the curves after each.

Give up some training accuracy to gain validation accuracy:

- **Get more data.** This is by far the most reliable regulariser.
- **Data augmentation**, then more creative options: domain randomisation, simulation, hybrid or synthetic data.
- **Pretrain** when you can.
- **Stick with supervised learning** rather than betting on unsupervised pretraining (his view at the time, outside NLP).
- **Smaller input dimensionality.** Drop features that may carry spurious signal, and use smaller images.
- **Smaller model**, using domain knowledge (e.g. average pooling instead of large FC heads).
- **Smaller batch size**, which regularises more strongly with batch norm.
- **Dropout**, used carefully, since it doesn't mix well with batch norm.
- **Weight decay.**
- **Early stopping.**
- **Try a larger model.** Early-stopped large models often beat small ones.

Visualise the first-layer weights and the activations too. Noisy filters or odd artifacts point to a problem.

### 5. Tune

**You're here when:** train and val are both good and close together. **Done when:** further search stops paying off. **Next:** step 6. If a new setting brings the gap back, return to step 4.

- **Random search over grid search.** Some hyperparameters matter far more than others, and random search covers those better.
- Bayesian hyperparameter tools exist, but a wide, sensible search goes a long way.

### 6. Squeeze out the juice

**You're here when:** the model is tuned and you want the last few percent.

- **Ensembles** reliably add a little accuracy. You can distil them into a single network if inference cost matters.
- **Leave it training.** Networks often keep improving long after the validation loss seems to have levelled off.

## Takeaway

By the end you understand the data, the problem and the tools, you trust your training/evaluation pipeline, and every jump in complexity came with an improvement you predicted. Only then is it time to read lots of papers and run lots of experiments.
