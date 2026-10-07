# Normalization Layers

## What is normalization?

Rescaling values so they have **mean 0 and standard deviation 1**, then letting the network learn its own scale and shift:

$$
\hat{x} = \frac{x - \mu}{\sigma + \epsilon}, \qquad y = \gamma \hat{x} + \beta
$$

This keeps activations in a healthy range, so training is faster and more stable.

The only question that matters is: **which values do we compute $\mu$ and $\sigma$ over?** That is exactly what separates BatchNorm from LayerNorm.

## Batch Normalization

Computes the mean and variance **across the batch**.

- In `(N, F)` (e.g. a linear layer) it normalizes over `N`, per feature `F`.
- In `(N, C, H, W)` (e.g. a conv layer) it normalizes over `N, H, W`, per channel `C`.

```python
nn.BatchNorm2d(16)   # after a conv layer with 16 output channels
```

Key points:

- One sample's output **depends on the other samples in the batch**.
- At test time the batch is gone, so it uses running averages of the stats collected during training. This is why `model.eval()` matters.
- Great for CNN image models with large batches.
- Breaks on small batches, and on sequences where padding would leak into the stats.

## Layer Normalization

Computes the mean and variance **over the features of each sample, on its own**.

```python
nn.LayerNorm(512)   # normalizes the last 512 features of each sample
```

Key points:

- One sample's output **never depends on the batch**.
- Same behaviour in training and evaluation — no running stats, no mode switch.
- Works with any batch size, and with variable-length sequences.
- The default choice for transformers and RNNs.

## BatchNorm vs LayerNorm

| | BatchNorm | LayerNorm |
| :--- | :--- | :--- |
| Stats computed over | the batch | the features of one sample |
| Depends on other samples? | Yes | No |
| Train vs eval | Different (running stats) | Same |
| Small batches | Unstable | Fine |
| Typical use | CNNs | Transformers, RNNs |

## Where to place them

- **CNN block:** `Conv → BatchNorm → ReLU`. Normalizing before the activation keeps the input in ReLU's active range.
- **Transformer block:** LayerNorm is placed either **before** each sub-layer (pre-LN, more stable, the modern default) or **after** it (post-LN, as in the original paper).

## Common variants

- **GroupNorm** — like LayerNorm over groups of channels; works well for CNNs with small batches.
- **InstanceNorm** — BatchNorm per sample; used in style transfer.
- **RMSNorm** — LayerNorm without the mean subtraction; cheaper, used in modern LLMs.

!!! note
    [Feature Scaling](../fundamentals/feature_scaling.md) rescales the **input data** once, before training. Normalization layers rescale **activations inside the network** on every forward pass.
