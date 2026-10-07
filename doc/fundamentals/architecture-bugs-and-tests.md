# Architecture Bugs and Their Tests

An architecture bug is a mistake that is not in hyperparameters or data rather in the structure (shapes, connections, masking, normalization, or flow) of the model. The model still trains, and the loss often goes down for train, val, and test. But performs poorly in real world often as much as 50%.

Tests are grouped by **when** they run (before training, after training, in production) and by **what they check** (invariance, sensitivity, interface and limits, gradients and learning, repeatability, data, joining parts, production).

Read every row as: *what you change → what must then stay the same or change → the bug it catches*.

## Bugs and Why They Hide

| Family | Failure | Why you don't notice |
| :--- | :--- | :--- |
| Shapes / broadcasting | Shapes are legal but wrong | PyTorch broadcasts almost anything |
| Flatten / head dim | Features get scrambled | Shape stays valid |
| Connections | A layer is never used, a skip goes to the wrong place, weights are shared by accident | Runs fine; loss still falls |
| Masking | The model sees the future or the padding | Training loss looks good |
| Loss / padding | The mean divides by the padded length | The loss still falls, just at a different rate |
| Normalization | BatchNorm uses batch stats | Output changes with the batch |
| Train/eval mode | Dropout/BN still on at test time | Test outputs are random |
| Initialization | Dead units, identical units, signal fades | Learns slowly or noisily |
| Head / loss match | Softmax twice, wrong output activation | Loss settles at the wrong value |
| Wrong axis | Pooling or softmax over the wrong dimension | Values look plausible |

## Invariance

Change the input in a way that should not matter to the model. That is, it's output or learning should not change. If it does, the model is using something it should ignore.

Two types:

- **Eval-time invariance** Ex: For a padded and a non padded input, the output is unchanged. `f(T(x)) == f(x)`
- **Train-time invariance**  Ex: For a padded and a non padded input, the gradient, and therefore the learning, is unchanged. `∇L(T(x)) == ∇L(x)`

### Eval-time invariance (output)

| Test | You change | Must then stay the same | Bug it catches |
| :--- | :--- | :--- | :--- |
| Padding | Same 3 real tokens, padded to length 8 with `<pad>` | Output at the 3 real positions equals the unpadded run | Model reads the `<pad>` tokens hence output depends on batch length |
| Same meaning, new word | "Mark was great" → "Samantha was great" | Same prediction | The model latches onto an irrelevant word |
| Batch neighbours | Run one sample alone, then inside a batch of 8 | That sample's output is the same | BatchNorm uses the batch's stats at test time |
| Device / dtype | Same input on CPU, then on CUDA or fp16 | Outputs are close | A hidden `.cpu()` / `.float()` |
| Position shift (CNN) | Move the image content by k pixels | The feature map moves by k, values unchanged | Padding or pooling that shifts the picture |

### Train-time invariance (gradients)

| Test | You change | Must then stay the same | Bug it catches |
| :--- | :--- | :--- | :--- |
| Gradient padding | Same 3 real tokens, padded to length 8 with `<pad>` | `p.grad` after backward on the real positions equals the unpadded run | Anything below — this row fails as soon as any of the others is wrong |
| Loss aggregation | Manual `mean` (or `sum`) over all positions, pads included, vs mean over real tokens only | The gradient per real token is unchanged | The divisor counts the pads, so pad count silently scales the step size and the effective learning rate |
| Mask strength | Additive attention mask of `-1e9` instead of `-inf` | Pad keys and values get exactly zero gradient | A finite mask leaves a nonzero weight; gradient leaks into `K`/`V` of the pads, and the leak grows with pad count |
| All-pad row | A fully padded sequence inside the batch | Gradients are finite | Softmax over an all-masked row is `-inf`/`-inf` → NaN; if the loss includes that row, one pad NaNs the whole batch's gradient |
| Reduce over the sequence | Mean-pool / BatchNorm over `(B, T)` with and without pads | Stats and gradients see real tokens only | Pads enter the mean and the variance, so every real token's gradient and the running stats move with padding |
| Dropout | Padded vs unpadded tensor at the same seed | Real tokens receive the same dropout mask | The mask is drawn over the padded shape, so pad count changes the draw |
| Gradient accumulation | The same data cut into micro-batches of different padding | Accumulated gradient equals the single-pass gradient | Per-micro-batch normalization makes the total depend on how the data was cut |
| Pad positions | Pads appended vs prepended | Same result for the real tokens | Absolute positional encodings and position-dependent slices tie the learning to where the pads sit |

Why the two forms come apart:

- **The forward pass is masked, the loss is not.** Real outputs can be bit-identical while the loss still averages over pad rows or divides by the padded length. The gradient carries that divisor; the output does not.
- **A mask that is only approximately zero is not a mask.** `-inf` gives weight exactly `0` and gradient exactly `0`. `-1e9` gives weight `≈0` and gradient `≈0`, and the error scales with the number of masked entries.
- **Anything that reduces over `T` mixes pads into every real token.** LayerNorm is per-token and invariant; BatchNorm and mean-pooling are not, and their running stats are a function of padding.
- **Stochastic layers consume randomness over the padded shape.** Even a perfectly masked model trains on different realized gradients for the same real tokens, because dropout's mask and the RNG draw depend on tensor size and layout. This is variance rather than bias, but it is why the gradient test must run with dropout off (`.eval()`) or at a fixed seed.
- **Gradient invariance does not imply output invariance either.** A `detach()`, an `argmax`, or a straight-through estimator changes the output while leaving the gradient as if it had not. The two forms fail independently in both directions, so test both.

To make it pass: mask the loss as well as the attention (`ignore_index` or an explicit token mask), normalize by the number of real tokens, use `-inf` rather than a large negative constant for masked keys, keep pads out of any reduction over `T`, and keep the padded shape stable across steps.

The backward form applies to any transformation claimed irrelevant — masking, padding, cropping, batching, device, dtype. The claim is about the step taken, not only about the number printed at the end.

## Sensitivity (directional expectation)

The opposite of invariance: a change that *does* matter must move the output, in the expected direction. If it doesn't, the model is ignoring that input.

| Test | You change | Must then change | Bug it catches |
| :--- | :--- | :--- | :--- |
| Direction | Raise `#bathrooms`, keep all else | Price does not drop | The model learned the wrong direction; a biased dataset |
| Input is used | Change a feature that clearly matters | Output moves | A dead unit, a branch cut off from gradients, an ignored input |
| Causality — past | Change only the last token | Outputs at earlier positions stay the same | The model sees the future (missing causal mask) |
| Causality — present | Change only the last token | The last output changes | The model ignores its input |
| More capacity helps | Add depth / heads / trees, retrain | Train score does not get worse | The extra layer is not connected |

Sensitivity needs both causality rows. Row 3 alone passes for a model that always outputs the same thing. Row 4 alone passes for a model that reads the future.

## Interface and limits (contract and edge)

Shapes, types and value ranges are fixed; so is behaviour at the boundaries.

| Test | You do | Expected Outcome| Bug it catches |
| :--- | :--- | :--- | :--- |
| Shape check | Run one dummy batch | Output shape is `(B, classes)` | Shape, broadcast and flatten mistakes |
| Value range | Run any input | Probabilities in `[0,1]`, sum to 1 | Wrong output activation |
| Against a trusted version | Load the same weights into your layer and into a known-good one (e.g. `nn.MultiheadAttention`) | The outputs match | A small math error: scaling, axis, or mask |
| Parameter count | Count all parameters | Equals the known number | A layer added or shared by accident |
| Boundary sizes | Batch 1, sequence 1, max length | No crash, sane output | Batch stats from one sample; off-by-one |
| Empty / all-pad | Feed a fully padded sequence | No crash, no NaN | An edge case that was never handled |
| Export and new size | Load the TorchScript/ONNX model and run a new batch size | Runs, same result | Shapes that only work for one size |
| Loss check | Random logits, random labels | Loss ≈ `ln(C)` | Softmax twice, or wrong output activation |

The loss check works because an untrained model outputs nearly equal probabilities, so its average loss is `ln(C)`.

## Gradient Flow

Gradient flow means the information from the loss backpropagates through the model so its parameters receive useful gradients during training.

| Test | You do |Expected Outcome| Otherwise |
| :--- | :--- | :--- | :--- |
| Overfit on one small dataset | Train on one small batch | Loss → ≈0 | it could be dead paths, unused layers, broken connections, incorrect shapes, wrong loss/optimizer wiring or wrong-but-learnable inductive biases.
| Every parameter gets a gradient | One backward pass | Each parameter has a gradient that is not `None` and not zero | A dead layer, a `detach()`, an unused module |
| Gradient check | Compare your gradients with a slow numeric estimate | They match | A hand-written backward that is wrong |
| One step helps | Take one optimizer step | Loss goes down | Optimizer or loss wired wrong |
| Frozen parameters | Freeze one parameter, then train | It stays exactly the same | A parameter you froze still updates |
| Gradient size | Look at gradient sizes | Within normal bounds | Gradients that vanish or explode |

## Repeatability and stability

Same seed, same result; no NaN or Inf.

| Test | You do | Must then hold | Bug it catches |
| :--- | :--- | :--- | :--- |
| Eval repeatability | Run the same input twice with `.eval()` | Identical outputs | Dropout still on at test time (forgot `.eval()`) |
| Seed repeatability | Two runs with the same seed | Identical outputs | Random ops that were never seeded |
| Train twice | Train twice with the same config | Identical metrics | Results that cannot be repeated |
| NaN / Inf check | Forward pass at input scales 1e-6 and 1e6 | All outputs are finite | Unstable softmax/log/exp; overflow |

## Data and leakage

Inputs must be valid and must not contain the answer.

| Test | You do | Must then hold | Bug it catches |
| :--- | :--- | :--- | :--- |
| Duplicate rows | Look for the same row in both train and test | No overlap | Test data leaked into training |
| Scaling scope | Fit the scaler on train only | Val/test never used in the fit | Preprocessing leakage |
| Time order | Split a time series in time order | No future sample in train | Time leakage |
| Feature check | Correlate each feature with the target | Nothing suspiciously high | A feature that leaks the target |
| Distribution check | Compare each feature's distribution in train vs val | They match | A split that does not look like the data |
| Label check | Rank samples by how unsure the model is out-of-fold | Suspect labels are flagged | Noisy or mislabeled data |

## Joining parts (integration and end-to-end)

The pieces must fit together.

| Test | You do | Must then hold | Bug it catches |
| :--- | :--- | :--- | :--- |
| Loader → model | Feed a real loader batch into the model | Shapes and types match | A mismatch between the two |
| Save and restore | Save mid-training, restore, continue | Training continues correctly | A state or loading bug |
| Train vs serve | Send the same raw sample through both feature paths | Feature values are identical | Training and serving compute features differently |
| Pipeline smoke | Data → train → eval → serve | The whole chain runs | Parts that do not join |
| Short real run | About 100 real training steps | Eval loss goes down | A failure only the full system shows |

## Production and monitoring

Behaviour in production, tested or watched.

| Test | You do | Must then hold | Bug it catches |
| :--- | :--- | :--- | :--- |
| Speed | Time training and serving | Slowest 5% of runs within budget (p95/p99) | A slowdown |
| Memory / throughput | Measure peak memory and samples per second | Within budget | Rising resource use |
| NaN / Inf in serving | Run real production inputs | Outputs are finite | NaN or Inf on live data |
| Shift over time | Watch features and predictions over time | Stable | Slow, silent decay |

## Bug → Test

| Bug | Test |
| :--- | :--- |
| Shapes / broadcasting | Shape check; parameter count |
| Flatten / head dim | Against a trusted version; shape check |
| Dead / unused layer | Every parameter gets a gradient |
| Wrong skip connection | Every parameter gets a gradient; fit one batch |
| Missing causal mask | Causality — past |
| Missing padding mask | Padding |
| Pads change the gradient | Gradient padding |
| Loss mean counts pad rows | Loss aggregation |
| Soft mask (`-1e9`) instead of `-inf` | Mask strength |
| NaN from an all-pad row | All-pad row |
| Pads enter BatchNorm / mean-pool stats | Reduce over the sequence |
| Dropout mask drawn over pads | Dropout |
| BatchNorm at test time | Batch neighbours |
| Dropout at test time | Eval repeatability |
| All units identical at init | Gradient size; more capacity helps |
| Softmax twice | Loss check |
| Wrong output activation | Value range; loss check |
| Mean vs sum pooling | Against a trusted version |
| Not repeatable | Seed repeatability |
| NaN / Inf | NaN / Inf check |
| Data leakage | Duplicate rows; scaling scope |
| Wiring drift | Parameter count |
| Shape valid for one size only | Export and new size |

## Starter tests

```python
import math
import pytest
import torch

B, C, H, W, K = 2, 3, 32, 32, 10


@pytest.fixture
def model():
    from my_project import MyNet
    return MyNet()


def test_shape(model):
    assert model(torch.randn(B, C, H, W)).shape == (B, K)


def test_param_count(model):
    assert sum(p.numel() for p in model.parameters()) == 123_456


def test_gradients_reach_all_params(model):
    model(torch.randn(B, C, H, W)).sum().backward()
    missing = [n for n, p in model.named_parameters() if p.grad is None]
    assert not missing, missing


def test_overfits_one_batch(model):
    x, y = torch.randn(8, C, H, W), torch.randint(0, K, (8,))
    opt = torch.optim.Adam(model.parameters(), lr=1e-2)
    for _ in range(200):
        opt.zero_grad()
        loss = torch.nn.functional.cross_entropy(model(x), y)
        loss.backward()
        opt.step()
    assert loss.item() < 1e-2


def test_eval_repeatability(model):
    model.eval()
    x = torch.randn(B, C, H, W)
    with torch.no_grad():
        torch.testing.assert_close(model(x), model(x))


def test_batch_neighbours(model):
    model.eval()
    x = torch.randn(B, C, H, W)
    with torch.no_grad():
        torch.testing.assert_close(model(x[:1])[0], model(x)[0])


def test_loss_sanity():
    logits, y = torch.randn(256, K), torch.randint(0, K, (256,))
    loss = torch.nn.functional.cross_entropy(logits, y)
    assert abs(loss.item() - math.log(K)) < 0.3


def test_finite_on_extremes(model):
    model.eval()
    with torch.no_grad():
        for s in (1e-6, 1e6):
            assert torch.isfinite(model(torch.randn(B, C, H, W) * s)).all()


def test_seed_repeatability():
    def run():
        torch.manual_seed(42)
        from my_project import MyNet
        return MyNet()(torch.ones(B, C, H, W))
    torch.testing.assert_close(run(), run())
```

### For sequence models

Three tests worth writing by hand, because the shape checks above miss all three bugs.

```python
def test_causality(model):
    model.eval()
    x = torch.randn(1, 6, 16)
    with torch.no_grad():
        y1 = model(x)
        x2 = x.clone()
        x2[:, -1] += 5.0
        y2 = model(x2)
    torch.testing.assert_close(y1[:, :-1], y2[:, :-1])   # past stays the same
    assert not torch.allclose(y1[:, -1], y2[:, -1])      # last token changes


def test_padding_invariance(model):
    model.eval()
    ids = torch.randint(1, 100, (1, 3))          # 3 real tokens, never <pad>
    pad = torch.zeros(1, 5, dtype=torch.long)    # 5 <pad> tokens
    with torch.no_grad():
        bare = model(ids)
        padded = model(torch.cat([ids, pad], dim=1))
    torch.testing.assert_close(bare, padded[:, :3])


def test_padding_gradient_invariance(model):
    model.eval()                                     # dropout off: the comparison must be deterministic
    ids = torch.randint(1, 100, (1, 3))              # 3 real tokens
    pad = torch.zeros(1, 5, dtype=torch.long)        # 5 <pad> tokens

    def grads(x):
        model.zero_grad()
        model(x)[:, :3].mean().backward()            # loss sees the real positions only, in both runs
        return [p.grad.clone() for p in model.parameters()]

    for a, b in zip(grads(ids), grads(torch.cat([ids, pad], dim=1)), strict=True):
        torch.testing.assert_close(a, b)
```

The gradient test compares like with like: the loss is restricted to the real positions, so both runs divide by the same count and whatever difference remains comes from the model. Change `[:, :3].mean()` to `.mean()` and it fails on purpose — the divisor is `3` in one run and `8` in the other. That failure is the loss-aggregation bug, which is exactly the bug the eval-time padding test cannot see.

## Sources

- [Beyond Accuracy: Behavioral Testing of NLP Models with CheckList](https://homes.cs.washington.edu/~marcotcr/acl20_checklist.pdf)
- [Effective Testing for Machine Learning Systems — Jeremy Jordan](https://www.jeremyjordan.me/testing-ml/)
- [How to Test Machine Learning Code and Systems — Eugene Yan](https://eugeneyan.com/writing/testing-ml/)
- [The ML Test Score: A Rubric for ML Production Readiness](https://research.google/pubs/the-ml-test-score-a-rubric-for-ml-production-readiness-and-technical-debt-reduction/)
- [torchtest / mltest — unit testing for neural networks](https://github.com/suriyadeepan/torchtest)
- [Chex — JAX testing utilities](https://github.com/google-deepmind/chex)
