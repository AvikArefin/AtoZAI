# Online Handwriting Recognition

**Online** = input is pen strokes (a list of `(x, y, pen)` points over time), not pixels. So it is a sequence problem.

## Character vs word level

| | Character model | Word / line model |
|---|---|---|
| Output | one class | a string |
| Head | pool over time → Linear | Linear at every step |
| Loss | `CrossEntropyLoss` | [CTC](ctc.md) |
| Decode | `argmax` | merge repeats, drop blanks |
| Metric | accuracy | character error rate (CER) |
| Data | needs per-point labels to cut characters | only needs the text |
| Difficulty | ~1 day | a few more, mostly getting CTC right |

## From model output to a score

A word / line model does not output text directly. It outputs a table of scores: one row per time step, one column per character (plus blank). Two jobs remain:

1. **Decode:** turn that table into a string.
2. **Measure:** compare that string to the real text.

### Greedy decode

Pick the most likely token at **each step**, then collapse it the [CTC](ctc.md) way (merge repeats, drop blanks).

| Step | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| Most likely token | `c` | `c` | `-` | `a` | `a` | `-` | `t` |

`cc-aa-t` → `c-a-t` → `cat`

- **Fast:** one `argmax` per step, no search. This is what you ship by default.
- **Not always the best string:** it picks the best token per step, not the best overall text. CTC gives a string's probability as the sum over *many* paths, and greedy only looks at one.

### Beam search (the step up)

Instead of keeping only the single best guess, keep the **top `k` partial strings** (the "beam") at each step and extend each of them. At the end, return the best one.

- Slower than greedy (roughly `k` times the work).
- Main benefit: lets you add a **language model** that scores "does this look like a real word?". `helo` vs `hello`: the ink may be ambiguous, but the language model knows which is a word.
- Without a language model, gains over greedy are usually small.

### Edit distance (Levenshtein distance)

The **smallest number of single-character edits** needed to turn the prediction into the target. Three kinds of mistake, each costs 1 (named from the model's side):

| Mistake | Target → prediction | Meaning |
|---|---|---|
| **Substitution** (S) | `cat` → `cot` | wrong character |
| **Insertion** (I) | `cat` → `caat` | model added an extra character |
| **Deletion** (D) | `cat` → `ct` | model missed a character |

Example: target `smart`, prediction `snarrt`.

```
target:      s  m  a  r  -  t
prediction:  s  n  a  r  r  t
                S        I
```

`m` read as `n` (1 substitution) + an extra `r` (1 insertion) = **edit distance 2**.

Why not just compare position by position? Because one missing letter shifts everything after it: `smrt` vs `smart` would look like 3 wrong positions, but it is really 1 missing letter. Edit distance finds the best alignment first.

How it is computed: dynamic programming. `d[i][j]` = distance between the first `i` characters of the prediction and the first `j` of the target.

```python
def edit_distance(pred: str, target: str) -> int:
    prev = list(range(len(target) + 1))          # "" vs target[:j]: j missing characters
    for i, p in enumerate(pred, 1):
        cur = [i]                                # pred[:i] vs "": i extra characters
        for j, t in enumerate(target, 1):
            cur.append(min(
                prev[j] + 1,                     # p is extra (insertion)
                cur[j - 1] + 1,                  # t is missing (deletion)
                prev[j - 1] + (p != t),          # match (free) or substitution
            ))
        prev = cur
    return prev[-1]
```

In practice use a library (`editdistance`, `rapidfuzz`, `jiwer`); they are much faster.

### CER: Character Error Rate

$$
\text{CER} = \frac{\text{edit distance}}{\text{number of characters in the target}}
$$

`smart` vs `snarrt`: 2 / 5 = **40%**. Lower is better; 0% is perfect.

- **Can go above 100%:** if the model outputs lots of junk, the insertions can exceed the target length.
- **Over a dataset:** add up all edit distances, divide by the total target characters. Do **not** average per-sample CERs, or a 2-letter word with 1 mistake (50%) counts as much as a 40-letter line.

```python
cer = sum(edit_distance(p, t) for p, t in pairs) / sum(len(t) for _, t in pairs)
```

### WER: Word Error Rate

Same formula, but the units are **words** instead of characters.

`the cat sat` vs `the cot sat`: CER = 1 / 11 ≈ 9%, WER = 1 / 3 ≈ 33%.

One wrong letter ruins the whole word, so WER is always much harsher than CER. Report CER while developing (it moves smoothly), and WER when users care about whole words.

### Why not plain accuracy?

Accuracy ("is the whole string exactly right?") works for a character model with one class per sample. For lines it is too harsh: one wrong letter in a 40-character line scores 0, the same as complete garbage. CER gives partial credit and shows steady progress.

## Fast + accurate roadmap

Each step is a small, measurable change. Track **CER** and **time per line on the target device** at every step.

1. **Baseline:** `1D CNN → BiGRU → Linear`, CTC loss.
2. **Cheap wins:** strided conv at the input (2–4× shorter sequence), augmentation (slant, scale, rotate, jitter, dropped points), input features (`dx, dy, pen`).
3. **Better encoder:** small Conformer (conv + self-attention, 4–8 blocks). Parallel over time; check speed on CPU, where a small GRU can still win.
4. **Training-only extras:** auxiliary attention-decoder loss (dropped at deploy), distillation from a big model.
5. **Deploy:** greedy CTC decode (or small beam + char LM), export (ONNX / TorchScript), int8 quantization.

| Generation | Approach |
|---|---|
| Classic | CNN / BiLSTM + CTC |
| Modern | Conformer / Transformer encoder, CTC + attention hybrid |
| Frontier | Vision-language models reading ink (needs huge pretraining; slow) |

## Future-proof dataset design

Different datasets (BRUSH, Deepwriting, OnHW, MathWriting, …) store ink differently. Convert all of them into **one shared format**, and keep everything else source-agnostic.

- **Adapters only convert** (incl. coordinate conventions). Normalization lives in transforms, so it can change without rebuilding caches.
- **Per-point labels are not needed**: only some sources have them. and ultimately we need a sentence / word level model, if a character level dataset is needed, a manually made (or purpose prebuilt) simpler dataset can be used. But ultimately that would a toy compared to a sentence level model.
- **Save the vocab and the splits.** Changing class indices breaks old checkpoints; changing the test set makes runs incomparable.
- **Split by writer**, and keep resampled copies of a sample on the same side, or validation scores leak.
