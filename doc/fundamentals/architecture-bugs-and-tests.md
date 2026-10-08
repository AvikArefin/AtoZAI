# Architecture Bugs and Their Tests

Architecture bugs don't crash the code. Write a `view` where you needed a `transpose`, leave out the causal mask, or average the loss over padding, and the model will still train. The loss curve looks fine, and the model is quietly wrong.

An architecture bug is in the model's **structure**: shapes, connections, masks, normalization, the train/eval switch. It is not in the data or the hyperparameters, so tuning won't fix it.

The page has four parts: where these bugs hide, the six tests that catch most of them, padding (the place where they hide best), and a catalogue to check when something still seems off.

## Where they hide

| Bug | What it looks like | Why the loss curve won't tell you | Caught by |
| :--- | :--- | :--- | :--- |
| Broadcasting | `pred` is `(B, 1)`, `y` is `(B,)`, so `pred - y` is `(B, B)` | MSE over all B² pairs still goes down | Shape check |
| Head split | `x.view(B, H, T, d)` instead of `x.view(B, T, H, d).transpose(1, 2)` | Shape is right; positions and heads are scrambled | Trusted reference; samples don't mix |
| Missing causal mask | Position `t` sees `t + 1` | Val loss looks *great*: teacher forcing gives the future away at validation too. Generation is garbage | Causality |
| Labels not shifted | The LM predicts token `t` from tokens `≤ t` | Loss drops to ~0 in a few hundred steps, which looks like success | Causality; a loss that is too good |
| Missing padding mask | Real tokens attend to `<pad>` | The same sentence gives a different output in a different batch | Padding changes nothing |
| Multiplicative mask | `scores * mask` instead of `scores.masked_fill(~mask, -inf)` | A score set to 0 still gets weight `exp(0)`, so pads keep real attention, and so does the future if the causal mask is applied the same way | Padding changes nothing |
| Loss over padding | The mean divides by the padded length | Still falls; the step size just depends on how much padding the batch had | Padding doesn't change the step |
| Train/eval mode | Dropout or BatchNorm batch statistics left on at test time | Test outputs depend on chance or on the other samples in the batch | Same input, same answer |
| Softmax twice | `softmax` in the model, then `CrossEntropyLoss` | The loss can't go below `ln(1 + (K−1)/e)`, which is 1.46 for 10 classes | Overfit one batch |
| Dead branch | A layer is built but never called, or its output is `detach`ed | The rest of the model makes up for it | Every parameter gets a gradient |
| Wrong axis | Softmax or pooling over `T` where you meant `C` | Values are in range and look plausible | Trusted reference |
| Bad init | Huge logits, or every unit started identical | Slow, noisy, or stalled training | Loss at init |

## The six tests that catch most of it

Nobody writes fifty checks per model. These six are cheap, run in seconds, and between them they cover almost every row above.

**1. Loss at init.** An untrained classifier should be unsure about everything: probabilities near `1/K`, loss near `ln K` (2.30 for 10 classes). A loss well above that means the output layer starts out confidently wrong. Note that this test does *not* catch softmax twice: squashed logits are close to uniform too, so the loss still starts at exactly `ln K`.

**2. Overfit one batch.** Eight samples and a few hundred steps should drive the loss to about 0. If it can't memorize eight examples, something is disconnected, double-squashed or wired to the wrong target. This is the single most useful test on the page.

**3. Ask the gradient who it depends on.** Backprop from *one* output and see which inputs get gradient. A nonzero gradient means a dependency, and a zero means none. Output `i` must depend on sample `i` only. Output `t` must depend on positions `≤ t` only. A `view` that mixes the batch, a missing or off-by-one causal mask, and BatchNorm left in train mode all break this. All of them leave the shapes valid.

**4. Every parameter gets a gradient.** After one backward pass, any parameter whose `.grad` is `None` or all zero is attached to nothing.

**5. Same input, same answer.** In `.eval()`, the same input twice gives the same output, and a sample gives the same output alone as it does inside a batch. Dropout fails the first check. BatchNorm statistics leaking at test time fail the second.

**6. Compare against a trusted version.** If you write your own attention, layer norm or loss, copy the weights into the PyTorch equivalent (`nn.MultiheadAttention`, `nn.LayerNorm`, `F.cross_entropy`) and check that the outputs match. Missing `1/√d`, a wrong axis or a wrong mask show up immediately.

```python
import math
import pytest
import torch
import torch.nn.functional as F

B, C, H, W, K = 4, 3, 32, 32, 10


@pytest.fixture
def model():
    from my_project import MyNet
    torch.manual_seed(0)
    return MyNet()


def test_shape(model):
    assert model(torch.randn(B, C, H, W)).shape == (B, K)


def test_loss_at_init(model):
    x, y = torch.randn(256, C, H, W), torch.randint(0, K, (256,))
    with torch.no_grad():
        loss = F.cross_entropy(model(x), y).item()
    assert abs(loss - math.log(K)) < 0.5             # ≈ 2.30 for 10 classes


def test_overfits_one_batch(model):
    x, y = torch.randn(8, C, H, W), torch.randint(0, K, (8,))
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    for _ in range(300):
        opt.zero_grad()
        loss = F.cross_entropy(model(x), y)
        loss.backward()
        opt.step()
    assert loss.item() < 0.05


def test_samples_do_not_mix(model):
    model.eval()                                     # BatchNorm in train mode mixes samples on purpose
    x = torch.randn(B, C, H, W, requires_grad=True)
    model(x)[0, 0].backward()                        # one output of sample 0
    assert x.grad[0].abs().sum() > 0                 # depends on sample 0 ...
    assert x.grad[1:].abs().sum() == 0               # ... and on nothing else


def test_every_param_gets_a_gradient(model):
    x, y = torch.randn(B, C, H, W), torch.randint(0, K, (B,))
    F.cross_entropy(model(x), y).backward()
    dead = [n for n, p in model.named_parameters()
            if p.requires_grad and (p.grad is None or not p.grad.any())]
    assert not dead, dead


def test_same_input_same_answer(model):
    model.eval()
    x = torch.randn(B, C, H, W)
    with torch.no_grad():
        torch.testing.assert_close(model(x), model(x))            # no dropout at test time
        torch.testing.assert_close(model(x[:1]), model(x)[:1])    # no batch statistics at test time
```

Don't backprop from `model(x).sum()`. If the model ends in a softmax, the outputs always sum to 1, so every gradient of `.sum()` is zero: the parameter test reports the whole network as dead, and `samples_do_not_mix` reports that sample 0 depends on nothing. Use a real loss, or a single output.

## Padding: the bug that hides in the gradient

Sequence models add a trap: padding. The usual check, "same tokens, padded or not, same output", passes for models that still train wrong. The forward pass can be perfectly masked while the **loss** is not. The outputs are identical, but the step size is not.

| Where padding leaks | What goes wrong | Fix |
| :--- | :--- | :--- |
| The loss divisor | `mean` over all positions divides by the padded length, so a batch with more padding takes a smaller step | `ignore_index=PAD`, or divide by the number of real tokens |
| Gradient accumulation | Each micro-batch averages over its own token count, so the total depends on how the data was cut. Hugging Face shipped this bug until late 2024 | Sum the per-token losses and divide by the total real tokens across all micro-batches |
| A fully padded row | Softmax over a row that is all `-inf` is `NaN`. With an *additive* `-inf` mask, the NaN reaches the gradients **even if the loss ignores that row** | Mask with `torch.finfo(dtype).min`, or use `F.scaled_dot_product_attention` (recent PyTorch returns zeros for such a row) |
| Left padding | Positions computed as `arange(T)` shift every real token when pads are added in front. Batched generation pads on the left | Compute positions from the mask: `mask.cumsum(-1) - 1` |
| Reducing over `T` | Mean-pooling and BatchNorm over `(B, T)` average the pads in. LayerNorm works per token and is safe | Use a masked mean, and keep pads out of the statistics |

!!! note "-1e9 versus -inf"
    In fp32 both give a weight of exactly 0. `exp(-1e9)` underflows to 0, so a large negative constant does not leak. The real leak is the *multiplicative* mask. The real danger is fp16, where `masked_fill(mask, -1e9)` raises an overflow error. `torch.finfo(dtype).min` is finite in every dtype and never produces NaN.

Two tests cover all of it. The first checks the output and the second checks the step. Here the model maps token ids `(B, T)` to logits `(B, T, V)` and treats id 0 as `<pad>`.

```python
PAD, V = 0, 100


def lm_loss(model, ids):                             # your real training loss, unchanged
    logits = model(ids[:, :-1])
    return F.cross_entropy(logits.transpose(1, 2), ids[:, 1:], ignore_index=PAD)


def test_causal(model):
    model.eval()
    ids = torch.randint(1, V, (1, 8))
    t = 4
    changed = ids.clone()
    changed[0, t] = 1 if ids[0, t] != 1 else 2
    with torch.no_grad():
        a, b = model(ids), model(changed)
    torch.testing.assert_close(a[:, :t], b[:, :t])   # the past can't see the change
    assert not torch.allclose(a[:, t], b[:, t])      # the present must


def test_padding_changes_nothing(model):
    model.eval()
    ids, pads = torch.randint(1, V, (1, 5)), torch.full((1, 3), PAD)
    with torch.no_grad():
        bare = model(ids)
        right = model(torch.cat([ids, pads], 1))[:, :5]
        left = model(torch.cat([pads, ids], 1))[:, 3:]
    torch.testing.assert_close(right, bare)
    torch.testing.assert_close(left, bare)


def test_padding_does_not_change_the_step(model):
    model.eval()                                     # dropout off: both runs must be deterministic
    ids = torch.randint(1, V, (1, 6))
    padded = torch.cat([ids, torch.full((1, 4), PAD)], 1)

    def grads(x):
        model.zero_grad()
        lm_loss(model, x).backward()
        return [p.grad.clone() for p in model.parameters()]

    for a, b in zip(grads(ids), grads(padded)):
        torch.testing.assert_close(a, b)
```

Two traps hide in these tests. First, in a decoder the causal mask already hides pads on the *right*, so the `right` check passes even with no padding mask at all. The `left` check is the one that tests your mask. If you never pad on the left, drop it. Second, `test_causal` changes a token in the middle, not the last one, so a mask that is off by one still fails: position `t − 1` would see the change. Swap `ignore_index=PAD` for a plain `.mean()` and `test_padding_does_not_change_the_step` fails, while every forward test still passes.

## The rest of the catalogue

For when the six tests pass and something still seems off.

| Check | Do | Expect | Catches |
| :--- | :--- | :--- | :--- |
| Boundary sizes | Batch 1, sequence length 1, maximum length | No crash, sane output | Off-by-one errors; BatchNorm on a single sample |
| Device and dtype | The same input on CPU and GPU, in fp32 and bf16 | Close outputs | A tensor created without `device=`; fp16 overflow in softmax or variance |
| Extreme inputs | Input scaled by 1e-6 and by 1e6 | All outputs finite | An unstable `log`, `exp` or division |
| Parameter count | Count the parameters | Equals the known number | A layer added, or weights shared, by accident |
| Custom backward | `torch.autograd.gradcheck` in float64 | Passes | A hand-written gradient that is wrong |
| Frozen means frozen | Freeze a block, train a few steps | Its weights *and BatchNorm buffers* are unchanged | BatchNorm running stats still update in `.train()` even when frozen |
| Shift equivariance (CNN) | Shift the image by a multiple of the total stride | The feature map shifts too (compare the interior) | Misaligned padding or cropping, e.g. in U-Net skips |
| Export | Load the TorchScript/ONNX model and run a new batch size | Same result | Shapes traced for one size only |
| Save and resume | Save mid-run, restore, continue | Same curve as an uninterrupted run | Optimizer, scheduler or RNG state that was not saved |
| Reproducibility | Train twice with the same seed | Identical metrics | Unseeded randomness. On GPU, set `torch.use_deterministic_algorithms(True)` |
| Behavioural (after training) | "Mark was great" → "Samantha was great"; add a bathroom | Same sentiment; price doesn't drop | Shortcuts the model learned from data ([CheckList](https://homes.cs.washington.edu/~marcotcr/acl20_checklist.pdf)) |

Shift equivariance needs that "multiple of the stride". A correct CNN with a stride-2 pool is **not** equivariant to a 1-pixel shift, so a test that shifts by an arbitrary amount fails on correct code.

## Not architecture, same silence

These bugs fail just as quietly, but they live in the data and the deployment, not the model. [Data Bugs and Their Tests](data-bugs-and-tests.md) covers them in depth:

- **Leakage:** duplicate rows across train and test splits, a scaler fit on all the data, a time series split at random, a feature that encodes the label.
- **Train/serve skew:** the same raw sample produces different features in the training pipeline and in serving.
- **Labels:** rank samples by out-of-fold confidence to find mislabels ([cleanlab](https://github.com/cleanlab/cleanlab) does this).
- **Drift and production:** watch input and prediction distributions, NaNs on live data, and p95/p99 latency.

## So do ML engineers really write all this?

Mostly not. Here's what they actually do:

1. **Use tested parts.** `F.scaled_dot_product_attention`, `nn.TransformerEncoderLayer`, Hugging Face and timm models have already been tested. Most bugs live in the few hundred lines you write yourself, so that's where the tests go.
2. **Write code that can't have the bug.** `einops.rearrange(x, "b t (h d) -> b h t d", h=H)` names its axes, so the head-split bug cannot be written. A `# (B, T, C)` comment on every tensor line and inline `assert x.shape == ...` do the same job more cheaply. [jaxtyping](https://github.com/patrick-kidger/jaxtyping) checks shapes at runtime, and in JAX, [chex](https://github.com/google-deepmind/chex) does it with `chex.assert_shape`.
3. **Use the framework's switches.** Lightning has `Trainer(overfit_batches=1)` and `fast_dev_run=True`. PyTorch has `torch.autograd.detect_anomaly()` to locate the first NaN and `gradcheck` for custom backward passes.
4. **Watch training, not only the loss.** Watch gradient norms per layer, activation statistics, and sample outputs every few hundred steps. A wrong mask often shows up in the samples before it shows up in any metric.
5. **Run the six tests above.** Usually as a script or a notebook cell rather than a formal suite.

The long suites do exist, in the libraries. Hugging Face `transformers` runs one shared battery on every model it ships, including `test_batching_equivalence` (row 5 above) and `test_left_padding_compatibility` (the `left` check). Experience isn't about not making these mistakes. It's knowing the dozen places they hide and checking those first. The table at the top of this page is that list.

## Sources

- [A Recipe for Training Neural Networks — Andrej Karpathy](https://karpathy.github.io/2019/04/25/recipe/)
- [Beyond Accuracy: Behavioral Testing of NLP Models with CheckList](https://homes.cs.washington.edu/~marcotcr/acl20_checklist.pdf)
- [The ML Test Score: A Rubric for ML Production Readiness](https://research.google/pubs/the-ml-test-score-a-rubric-for-ml-production-readiness-and-technical-debt-reduction/)
- [Making Convolutional Networks Shift-Invariant Again — Richard Zhang](https://richzhang.github.io/antialiased-cnns/)
- [Effective Testing for Machine Learning Systems — Jeremy Jordan](https://www.jeremyjordan.me/testing-ml/)
- [How to Test Machine Learning Code and Systems — Eugene Yan](https://eugeneyan.com/writing/testing-ml/)
- [Hugging Face `transformers` model tests (`test_modeling_common.py`)](https://github.com/huggingface/transformers/blob/main/tests/test_modeling_common.py)
- [einops](https://github.com/arogozhnikov/einops) · [jaxtyping](https://github.com/patrick-kidger/jaxtyping) · [chex](https://github.com/google-deepmind/chex)
