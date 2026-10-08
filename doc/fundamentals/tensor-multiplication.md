# Tensor Multiplication

!!! TLDR
    `torch.matmul(A, B)` (or `A @ B`) multiplies the **last two** dims as matrices. Every dim before those is a batch dim.

| A | B | A @ B |
|---|---|---|
| `(m, n, o)` | `(m, o, y)` | `(m, n, y)` |
| `(a, b, c)` | `(c, d)` | `(a, b, d)` |

- A's **last** dim must equal B's **second-to-last** dim (`o`, `c`). That dim disappears from the result.
- Batch dims (`m`) must match or broadcast. A 2D B has no batch dim, so the same matrix is applied to every batch.

## The condition in code

```python
m, n, o, y = 2, 3, 4, 5

A = torch.randn(m, n, o)
B = torch.randn(m, o, y)

AB = torch.matmul(A, B)
print("A shape:", A.shape)
print("B shape:", B.shape)
print("AB shape:", AB.shape)
print("Multiplication valid:", A.shape[-1] == B.shape[-2])
```

```
A shape: torch.Size([2, 3, 4])
B shape: torch.Size([2, 4, 5])
AB shape: torch.Size([2, 3, 5])
Multiplication valid: True
```

## Example: an RNN step

A slightly modified version of the [RNN](../sequence-models/rnn.md) step:

1. $x_{\text{mod}} = w_1 \cdot x$
2. $\text{out} = \tanh(x_{\text{mod}} + \text{hidden}_{\text{prev}} + b)$
3. $\text{hidden}_{\text{new}} = w_2 \cdot \text{out}$

```python
class SimpleRNN(nn.Module):
    def __init__(self, input_size, hidden_size):
        super(SimpleRNN, self).__init__()
        self.input_size = input_size
        self.hidden_size = hidden_size

        # Make weights as parameters so they can be optimized
        self.w1 = nn.Parameter(torch.randn(input_size, hidden_size, device=device))
        self.w2 = nn.Parameter(torch.randn(hidden_size, hidden_size, device=device))
        # Initialize b with shape (1, 1, hidden_size) for proper broadcasting
        self.b = nn.Parameter(torch.zeros(1, 1, hidden_size, device=device))

    def forward(self, x, hidden):
        mod_x = torch.matmul(x, self.w1)
        out = torch.tanh(mod_x + hidden + self.b)
        hidden = torch.matmul(out, self.w2.T)
        return hidden
```

Why `matmul(x, self.w1)` for line 1, and not `matmul(self.w1, x)` or `matmul(x, self.w1.T)`? Check the inner dims, with `x`: `(batch, seq, input_size)` and `w1`: `(input_size, hidden_size)`:

| Call | Inner dims | Result |
|---|---|---|
| `matmul(x, w1)` | `input_size` = `input_size` | ✓ `(batch, seq, hidden_size)` |
| `matmul(w1, x)` | `hidden_size` vs `seq` | ✗ |
| `matmul(x, w1.T)` | `input_size` vs `hidden_size` | ✗ |

The ✗ calls only run when those sizes happen to be equal, and then they compute the wrong thing.

## Fixing shapes with transpose

If the shapes don't line up, rearrange them first:

| Op | `(m, n, o)` becomes | Use for |
|---|---|---|
| `A.mT` or `A.transpose(-2, -1)` | `(m, o, n)` | matmul: swaps only the matrix dims |
| `A.T` | `(o, n, m)` | 2D weights like `w2.T`; reverses **all** dims, deprecated on 3D+ tensors |
