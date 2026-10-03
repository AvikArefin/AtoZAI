# Positional Encoding

Transformers process all tokens **simultaneously** — unlike RNNs, they have no built-in notion of order. A self-attention layer computes pairwise relationships between tokens, but if you permute the input sequence, the output is identically permuted. The model cannot distinguish `"the cat sat"` from `"sat the cat"`.

To fix this, we inject **positional information** directly into the token embeddings before they enter the Transformer. One elegant, parameter-free solution is the **sinusoidal positional encoding** introduced in *"Attention Is All You Need"* (Vaswani et al., 2017).

## The Formula

For a sequence position $pos$ and embedding dimension index $i$:

$$
PE_{(pos,\, 2i)}   = \sin\!\left(\frac{pos}{10000^{2i/d_{\text{model}}}}\right)
$$

$$
PE_{(pos,\, 2i+1)} = \cos\!\left(\frac{pos}{10000^{2i/d_{\text{model}}}}\right)
$$

| Symbol | Meaning |
|---|---|
| $pos$ | Token position in the sequence $(0, 1, 2, \ldots)$ |
| $i$ | Dimension pair index $(0, 1, \ldots, d_{\text{model}}/2 - 1)$ |
| $d_{\text{model}}$ | Total embedding dimensionality (e.g. 512) |
| $10000$ | Large constant controlling wavelength scaling |

The result is a matrix $PE \in \mathbb{R}^{T \times d_{\text{model}}}$ that is **added** (not concatenated) to the token embedding matrix.

## Geometric Intuition

Each dimension pair $(2i,\ 2i+1)$ traces a **2D unit circle** parameterized by position:

$$
\bigl(\sin(\omega_i \cdot pos),\ \cos(\omega_i \cdot pos)\bigr), \quad \omega_i = \frac{1}{10000^{2i/d_{\text{model}}}}
$$

The frequencies $\omega_i$ decrease geometrically across dimensions:

- **Low $i$ (early dims):** high frequency → rapid oscillation → fine-grained, short-range differences  
- **High $i$ (late dims):** low frequency → slow oscillation → coarse, long-range structure  

This is the continuous analogue of a **binary clock** — the least-significant bit flips fastest, the most-significant bit flips slowest.

## Key Properties

**1. Unique encoding per position** — Every $pos$ maps to a unique vector; no two positions collide.

**2. Relative position via linear transform** — For any fixed offset $k$, $PE_{pos+k}$ is a *linear function* of $PE_{pos}$ (via angle-addition identities), so the model can learn to attend by relative offset.

**3. Parameter-free** — No weights to train; the matrix is computed once and reused.

**4. Extrapolation** — Because it's a continuous function of $pos$, the model can handle sequences longer than those seen during training (though performance degrades for very long extrapolations).

## Implementation (PyTorch)

```python
import numpy as np
import torch
import torch.nn as nn

class SinusoidalPositionalEncoding(nn.Module):
    def __init__(self, d_model: int, max_len: int = 5000, dropout: float = 0.1):
        super().__init__()
        self.dropout = nn.Dropout(p=dropout)

        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len).unsqueeze(1)          # (max_len, 1)
        div_term = torch.exp(
            torch.arange(0, d_model, 2) * (-np.log(10000.0) / d_model)
        )  # equivalent to 1 / 10000^(2i/d_model)

        pe[:, 0::2] = torch.sin(position * div_term)   # even dims
        pe[:, 1::2] = torch.cos(position * div_term)   # odd dims

        self.register_buffer('pe', pe.unsqueeze(0))    # (1, max_len, d_model)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (batch, seq_len, d_model)
        x = x + self.pe[:, :x.size(1)]
        return self.dropout(x)
```

`register_buffer` stores `pe` as a non-trainable tensor that automatically moves with `.to(device)`.

## Sinusoidal vs. Learned Positional Embeddings

| | Sinusoidal PE | Learned PE |
|---|---|---|
| Parameters | None | $T_{\max} \times d_{\text{model}}$ |
| Extrapolation | Possible (degrades) | No |
| Interpretability | Mathematically explicit | Opaque |
| Common usage | Original Transformer | GPT-2, BERT, most modern LLMs |

Most modern large language models use **learned** positional embeddings, or more advanced schemes like **RoPE** (Rotary Position Embedding) or **ALiBi**, which build relative position bias directly into attention scores.
