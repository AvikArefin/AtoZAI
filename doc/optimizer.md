# Optimizers

We will cover Adam and other gradient-based optimizers in detail on another page; here we focus on **EMA (Exponential Moving Average)**.

## Exponential Moving Average (EMA)

General EMA formula:

$$
\text{New Average} = \alpha \cdot \text{New Value} + (1 - \alpha) \cdot \text{Old Average}
$$

In self-supervised learning architectures (like JEPA and BYOL), we use EMA to update the weights of a **Target Encoder** (the "Teacher") using the weights of the **Online Encoder** (the "Student"):

$$
\theta_{\text{target}} \leftarrow m \cdot \theta_{\text{target}} + (1 - m) \cdot \theta_{\text{online}}
$$

- **$\theta_{\text{target}}$**: The weights of the Target Encoder (with no gradients calculated).
- **$\theta_{\text{online}}$**: The active weights of the Online Encoder (updated by backpropagation).
- **$m$**: The **momentum decay rate** (usually a high value like 0.98 or 0.999).

**Why do this?** If the Target Encoder immediately copied the Online Encoder ($m = 0$), the network would suffer from **representation collapse** (it would learn to output useless constant vectors).

---

### Terminology Notes
- **Transformer Encoder**: A specific building block consisting of Self-Attention, Feed-Forward Network, and Layer Normalization.
- **Target/Online Encoder**: The functional roles assigned to sub-networks when converting inputs into vectors for representation learning.
