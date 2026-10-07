# Connectionist Temporal Classification (CTC)


CTC is a **loss + decoding method**, not an architecture. It lets a model that outputs one prediction per time step learn from a short target string, without knowing which step belongs to which character.

## The problem it solves

A sequence model (e.g. `1D CNN → BiGRU → Linear`) outputs one prediction **per step**: For a word it would be more than the number of letters.

For example say the actal writing is: `smart`.
And the model outputs `ss-mm-a-rr-t`

CTC goes from the model output to the word, i.e. `ss-mm-a-rr-t` → `smart`

## How it works

1. Count all the characters used in the dataset. Add a **blank** character (`<blank>`, added to the front by convention). This is not space, in a sentence level model, space is also considered a character.
2. At each step the model predicts a distribution over `blank + vocab`.
3. A path collapses to text by **merging repeats, then dropping blanks**:

   `ss-mm-a-rr-t` → `s-m-a-r-t` → `smart`. 

   A blank between repeats keeps doubles: `l-l` → `ll`.

   `sss-mm-a-ll-l` -> `s-m-a-l-l` -> `small`.
4. CTC loss = $-\log \sum P(\text{path})$ over **every** path that collapses to the target (computed efficiently with dynamic programming).

## Using it in PyTorch

```python
ctc = nn.CTCLoss(blank=0, zero_infinity=True)

logits = model(x)                                   # (B, T, C)
log_probs = logits.log_softmax(-1).transpose(0, 1)  # (T, B, C): log-probs, time first
loss = ctc(log_probs, targets, input_lengths, target_lengths)
```

Greedy decoding (fast, usually good enough):

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

!!! warning "Silent failure modes"
    - Pass **log-probabilities** (`log_softmax`), not raw logits or probabilities.
    - Shape is **time first**: `(T, B, C)`.
    - `input_lengths` / `target_lengths` must be the real (unpadded) lengths.
    - Output length must satisfy $T \geq \text{len(target)} + \text{(number of doubled letters)}$. Downsample too hard and some samples become impossible → loss is `inf`.
    - Never use the blank index for a real character.

## Debugging tips

- **Overfit one batch** (~16 samples) first. If loss won't approach 0, the setup is broken.
- **Print decoded predictions** every epoch, not just loss.
- Early training often predicts **only blanks**. That is normal for a while; check that decoded text eventually appears.
- **Metric:** character error rate (CER) = edit distance / target length.


```python
def compute_loss(x_batch: Tensor, y_batch: Tensor, x_lengths: Tensor, y_lengths: Tensor) -> Tensor:
    out = model(x_batch)                                                # (B, T-1, vocab)
    log_probs = out.log_softmax(-1).transpose(0, 1)                     # (T-1, B, vocab) for CTC
    return criterion(log_probs, y_batch, x_lengths - 1, y_lengths)      # conv (kernel 2) drops 1 step
```

1. log_probs: what the model guessed
- At each of 49 time steps, for each drawing, the model gives a score for each of the 87 tokens: "at this step I think it's 'x' with probability ___, 'v' with probability ___, blank with probability ___, …".

2. y_batch: the right answer
- This is the text the drawing actually says, as character indices. Both drawings' labels are joined into one list.

3. x_lengths - 1: how much of the prediction to read
- log_probs has 49 steps for every drawing, but drawing A only had 41 real points.
- The conv reduces 41 points to 40 output steps, so CTC should read steps 0–39 for drawing A. Steps 40–48 were computed from padding and get ignored.
- Without the - 1, CTC would read one padding step as if it were real.

4. y_lengths: how to split y_batch
- [5, 6] tells CTC that the first 5 indices are drawing A's text and the next 6 are drawing B's.

What CTC does with them

For drawing A, CTC's question is: "Given these 40 steps of guesses, how likely is it that they spell xxvii?"

The 40 steps never say which step goes with which letter, so CTC counts every sequence of 40 tokens that collapses to xxvii. To collapse a sequence, merge repeated tokens, then remove the blanks:

x x x _ _ x x v v _ i i _ _ i ...   → xxvii  ✓
_ x _ x v v v i _ i i i _ _ _ ...   → xxvii  ✓
x x x v i i _ i ...                 → xxvi   ✗ (the two x's merged; a blank is needed between them)

It adds up the probabilities of all the valid sequences. The loss is -log of that total:

- the model puts high probability on sequences that spell xxvii → loss is small
- the model thinks it says something else → loss is large
