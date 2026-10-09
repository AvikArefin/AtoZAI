# Einsum

!!! TLDR
    `torch.einsum("ik,kj->ij", A, B)` is `A @ B`. Each letter names an axis. Letters on the right of `->` are **kept**; letters that appear only on the left are **multiplied and summed away**.

## The rules

Read `"ik,kj->ij"` as: "`A` has axes `i, k`; `B` has axes `k, j`; the result has axes `i, j`."

1. **Same letter in two inputs** → those axes line up (sizes must match) and are multiplied element by element.
2. **Letter in the output** → the axis survives.
3. **Letter missing from the output** → it is summed over.

That's the whole language. A mental model: einsum loops over every combination of all letters, multiplies the matching elements, and adds the results into the output slot.

```python
# "ik,kj->ij" written as loops
for i in range(I):
    for j in range(J):
        for k in range(K):          # k is not in the output, so it is summed
            C[i, j] += A[i, k] * B[k, j]
```

## Common operations

| Operation | einsum | Plain PyTorch |
|---|---|---|
| Transpose | `"ij->ji"` | `A.T` |
| Sum of all | `"ij->"` | `A.sum()` |
| Row sums | `"ij->i"` | `A.sum(1)` |
| Column sums | `"ij->j"` | `A.sum(0)` |
| Elementwise | `"ij,ij->ij"` | `A * B` |
| Dot product | `"i,i->"` | `a @ b` |
| Outer product | `"i,j->ij"` | `torch.outer(a, b)` |
| Matrix × vector | `"ij,j->i"` | `A @ v` |
| Matrix × matrix | `"ik,kj->ij"` | `A @ B` |
| Batched matmul | `"bik,bkj->bij"` | `torch.bmm(A, B)` |
| Diagonal | `"ii->i"` | `A.diagonal()` |
| Trace | `"ii->"` | `A.trace()` |
| Bilinear `xᵀWy` | `"bi,ij,bj->b"` | `((x @ W) * y).sum(1)` |
| Attention scores | `"bhqd,bhkd->bhqk"` | `q @ k.transpose(-2, -1)` |

A letter repeated **within one input** (`"ii"`) walks the diagonal.

## `...` for "whatever comes before"

`...` stands for any number of leading axes, so one pattern works for any batch shape:

```python
torch.einsum("...ik,...kj->...ij", A, B)   # (2,3,4)@(2,4,5) or (7,2,3,4)@(7,2,4,5)
```

## Things to know

- **No arrow = implicit mode.** `"ij,jk"` outputs the letters that appear once, sorted alphabetically. Always write the `->`, so the output order is explicit.
- **No reshaping.** einsum can't split or merge axes (`(h d)`), can't take a mean or max, and can't repeat. Use [einops](../coding/einops.md) for that.
- **Single letters only** in `torch.einsum` (`a–z`, `A–Z`). [`einops.einsum`](../coding/einops.md#einsum) allows full names like `"batch head q d"`.
- **Speed.** With two tensors it becomes permutes plus one `bmm`, about as fast as `@`. With three or more, the order of contractions matters a lot; PyTorch picks a good order if the `opt_einsum` package is installed.

```python
import torch

A, B = torch.randn(3, 4), torch.randn(4, 5)
torch.testing.assert_close(torch.einsum("ik,kj->ij", A, B), A @ B)

q, k = torch.randn(2, 8, 10, 64), torch.randn(2, 8, 12, 64)    # (b, h, t, d)
scores = torch.einsum("bhqd,bhkd->bhqk", q, k)                  # (2, 8, 10, 12)
```

## Sources

- [Einsum and Einops — Mechanistic Interpretability 101, Episode 4](https://www.youtube.com/watch?v=LTlyZWj74d4)
- [Einsum & einops video](https://www.youtube.com/watch?v=pkVwUVEHmfI)
- [`torch.einsum` documentation](https://pytorch.org/docs/stable/generated/torch.einsum.html)
