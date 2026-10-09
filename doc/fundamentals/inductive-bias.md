# Inductive Bias

!!! TLDR
    Inductive bias is a hint built into the model, so it doesn't have to learn that thing from data.

A finite dataset can be fit by infinitely many functions. The model's built-in assumptions decide which one it picks, and so how it behaves on inputs it hasn't seen.

| Model | Built-in assumption |
|---|---|
| Linear regression | The output is a weighted sum of the inputs |
| CNN | Nearby pixels are related; a pattern means the same thing anywhere in the image |
| RNN | Data comes in order; the same rule applies at every step |
| Transformer | Almost none: any token can look at any other; position must be added |
| k-NN | Similar inputs have similar outputs |
| Weight decay | Smaller weights (simpler functions) are better |

**Strong bias** learns from less data, as long as the assumption is true; if it's false, it hurts. **Weak bias** is more flexible but needs much more data. This is why Vision Transformers needed far more images than CNNs to catch up.

## Symmetries

The most common kind of inductive bias is a **symmetry**: a change to the input that shouldn't change the answer. A cat moved 10 px left is still a cat, so a CNN uses the same filter everywhere and never has to learn that. See [Equivariance & Invariance](equivariance-and-invariance.md).

## Sources

- [Geometric Deep Learning — Bronstein et al., 2021](https://arxiv.org/abs/2104.13478)
