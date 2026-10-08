# OnHR / HWR

OnHR - Online Handwriting Recognition or HWR - Handwriting Recognition.
**Online** = input is pen strokes (a list of `(x, y, pen)` points over time), not pixels. So it is a sequence problem.

## Character vs word level

| | Character model | Word / line model |
|---|---|---|
| Output | one class | a string |
| Head | pool over time → Linear | Linear at every step |
| Loss | `CrossEntropyLoss` | [CTC](#connectionist-temporal-classification-ctc) |
| Decode | `argmax` | merge repeats, drop blanks |
| Metric | accuracy | character error rate (CER) |
| Data | needs per-point labels to cut characters | only needs the text |
| Difficulty | ~1 day | a few more, mostly getting CTC right |

## Connectionist Temporal Classification (CTC)

CTC is a **loss + decoding method**, not an architecture. A sequence model (e.g. `1D CNN → BiGRU → Linear`) outputs one prediction **per step**, usually many more steps than letters: `smart` might come out as `ss-mm-a-rr-t`. CTC lets it learn from just the text, without knowing which step belongs to which character.

### How it works

1. The vocab is every character in the dataset plus a **blank** (`<blank>`, index 0 by convention). Blank is not space: in a line-level model, space is a normal character.
2. At each step the model predicts a distribution over `blank + vocab`.
3. A path collapses to text by **merging repeats, then dropping blanks**:

   `ss-mm-a-rr-t` → `s-m-a-r-t` → `smart`

   A blank between repeats keeps doubles: `sss-mm-a-ll-l` → `s-m-a-l-l` → `small`
4. CTC loss = $-\log \sum P(\text{path})$ over **every** path that collapses to the target (computed efficiently with dynamic programming).

### Using it in PyTorch

```python
ctc = nn.CTCLoss(blank=0, zero_infinity=True)

logits = model(x)                                   # (B, T, C)
log_probs = logits.log_softmax(-1).transpose(0, 1)  # (T, B, C): log-probs, time first
loss = ctc(log_probs, targets, input_lengths, target_lengths)
```

!!! warning "Silent failure modes"
    - Pass **log-probabilities** (`log_softmax`), not raw logits or probabilities.
    - Shape is **time first**: `(T, B, C)`.
    - `input_lengths` / `target_lengths` must be the real (unpadded) lengths.
    - Output length must satisfy $T \geq \text{len(target)} + \text{(number of doubled letters)}$. Downsample too hard and some samples become impossible → loss is `inf` (or silently `0` with `zero_infinity=True`).
    - Never use the blank index for a real character.

### What the loss sees

Example batch: two drawings, both padded to 50 points. A has 41 real points and says `xxvii`; B's label has 6 characters. The vocab is 87 tokens (blank included).

```python
def compute_loss(x_batch: Tensor, y_batch: Tensor, x_lengths: Tensor, y_lengths: Tensor) -> Tensor:
    out = model(x_batch)                                                # (B, T-1, vocab)
    log_probs = out.log_softmax(-1).transpose(0, 1)                     # (T-1, B, vocab) for CTC
    return criterion(log_probs, y_batch, x_lengths - 1, y_lengths)      # conv (kernel 2) drops 1 step
```

- **`log_probs`**: the model's guesses, a score for each of the 87 tokens at each of 49 steps, per drawing.
- **`y_batch`**: the true text as character indices, both labels joined into one list.
- **`x_lengths - 1`**: how many steps are real. The conv turns A's 41 points into 40 steps, so CTC reads steps 0–39 and ignores 40–48 (padding). Without `- 1` it would read one padding step as real.
- **`y_lengths`**: how to split `y_batch`. `[5, 6]` = the first 5 indices are A's text, the next 6 are B's.

For drawing A, CTC asks: how likely is it that these 40 steps spell `xxvii`? No step is tied to a letter, so it sums the probability of every 40-token sequence that collapses to `xxvii`:

```
x x x _ _ x x v v _ i i _ _ i ...   → xxvii  ✓
_ x _ x v v v i _ i i i _ _ _ ...   → xxvii  ✓
x x x v i i _ i ...                 → xxvi   ✗ (the two x's merged; a blank is needed between them)
```

The loss is −log of that total: small when the model favours sequences that spell `xxvii`, large when it reads something else.

### Debugging tips

- **Overfit one batch** (~16 samples) first. If loss won't approach 0, the setup is broken.
- **Print decoded predictions** every epoch, not just loss.
- Early training often predicts **only blanks**. That is normal for a while; decoded text should appear later.

## From model output to a score

The model outputs a table of scores (one row per step, one column per token), not text. Two jobs remain: **decode** it into a string, then **measure** that string against the real text.

### Greedy decode

Pick the most likely token at **each step**, then collapse: `cc-aa-t` → `c-a-t` → `cat`.

```python
def greedy_decode(logits, vocab):          # logits: (T, C) for one sample
    best = logits.argmax(-1).tolist()
    out, prev = [], None
    for k in best:
        if k != prev and k != 0:           # merge repeats, drop blank
            out.append(vocab[k])
        prev = k
    return "".join(out)
```

- **Fast:** one `argmax` per step, no search. This is what you ship by default.
- **Not always the best string:** it picks the best token per step, not the best overall text. CTC gives a string's probability as the sum over *many* paths, and greedy only looks at one.

### Beam search (the step up)

Keep the **top `k` partial strings** (the "beam") at each step instead of just one, extend each, and return the best at the end.

- Roughly `k` times slower than greedy.
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

Why not compare position by position? One missing letter shifts everything after it: `smrt` vs `smart` would look like 3 wrong positions, but it is really 1 missing letter. Edit distance finds the best alignment first.

It is computed with dynamic programming. `d[i][j]` = distance between the first `i` characters of the prediction and the first `j` of the target.

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

`smart` vs `snarrt`: 2 / 5 = **40%**.

- **Can go above 100%:** if the model outputs lots of junk, the insertions can exceed the target length.
- **Over a dataset:** add up all edit distances, divide by the total target characters. Do **not** average per-sample CERs, or a 2-letter word with 1 mistake (50%) counts as much as a 40-letter line.

```python
cer = sum(edit_distance(p, t) for p, t in pairs) / sum(len(t) for _, t in pairs)
```

### WER: Word Error Rate

Same formula, but the units are **words** instead of characters.

`the cat sat` vs `the cot sat`: CER = 1 / 11 ≈ 9%, WER = 1 / 3 ≈ 33%.

One wrong letter ruins the whole word, so WER is much harsher than CER. Report CER while developing (it moves smoothly), and WER when users care about whole words.

### Why not plain accuracy?

Accuracy ("is the whole string exactly right?") works for a character model with one class per sample. For lines it is too harsh: one wrong letter in a 40-character line scores 0, the same as complete garbage. CER gives partial credit.

## Fast + accurate roadmap

Track **CER** and **time per line on the target device** at every step.

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
- **Per-point labels are not needed**: only some sources have them, and a word / line model only needs the text. If you want a character model, use a small purpose-built dataset; it is a toy next to a line model anyway.
- **Save the vocab and the splits.** Changing class indices breaks old checkpoints; changing the test set makes runs incomparable.
- **Split by writer**, and keep resampled copies of a sample on the same side, or validation scores leak.
