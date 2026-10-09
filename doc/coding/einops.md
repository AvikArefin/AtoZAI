# Einops

einops reshapes tensors with a readable pattern: `rearrange(x, "b t (h d) -> b h t d", h=8)`. You write the input axes, an arrow, and the output axes. It does **not** multiply tensors together (that's [einsum](../fundamentals/einsum.md)).

```bash
uv add einops
```

```python
from einops import rearrange, reduce, repeat, einsum, pack, unpack, parse_shape
```

## Pattern syntax

| Syntax | Meaning | Example |
|---|---|---|
| `b c h w` | name each axis, in order | `"b c h w -> b h w c"` |
| `->` | input on the left, output on the right | |
| `(h w)` | merge axes on the right, split on the left | `"b c h w -> b (c h w)"` |
| `h=8` | give a size einops can't infer | `rearrange(x, "(h d) -> h d", h=8)` |
| `1` or `()` | an axis of size 1 | `"b c -> b c 1"` |
| `...` | any number of other axes | `"... h w -> ... (h w)"` |

Names are free: `batch`, `t`, `head` all work. Order inside parentheses matters. `(h d)` means `h` is the outer, slower-changing axis, the same as `.view(h, d)`.

## `rearrange`: move, split, merge axes

| Task | Pattern | Plain PyTorch |
|---|---|---|
| Transpose | `"b c h w -> b h w c"` | `x.permute(0, 2, 3, 1)` |
| Flatten | `"b c h w -> b (c h w)"` | `x.flatten(1)` |
| Add an axis | `"b c -> b 1 c"` | `x.unsqueeze(1)` |
| Remove an axis | `"b 1 c -> b c"` | `x.squeeze(1)` |
| Split heads | `"b t (h d) -> b h t d", h=H` | `x.view(B, T, H, D).transpose(1, 2)` |
| Merge heads | `"b h t d -> b t (h d)"` | `x.transpose(1, 2).reshape(B, T, H * D)` |
| Image to patches (ViT) | `"b c (h p1) (w p2) -> b (h w) (p1 p2 c)", p1=16, p2=16` | `unfold` + several reshapes |
| Stack a list | `"n b c -> b n c"` on `[x1, x2, ...]` | `torch.stack(xs, 1)` |

The split-heads row is where hand-written code goes wrong: `x.view(B, H, T, D)` has the right shape but scrambles heads and positions. The pattern spells out the layout, so a mistake is visible. It can still be wrong, though: `"b t (d h) -> b h t d"` runs and scrambles just the same.

## `reduce`: rearrange, then mean/max/sum

Axes on the left that are missing on the right get reduced. Operations: `"mean"`, `"max"`, `"min"`, `"sum"`, `"prod"`, `"any"`, `"all"`.

| Task | Pattern |
|---|---|
| Global average pool | `reduce(x, "b c h w -> b c", "mean")` |
| Same, keeping dims | `reduce(x, "b c h w -> b c 1 1", "mean")` |
| 2×2 max pool | `reduce(x, "b c (h 2) (w 2) -> b c h w", "max")` |
| Mean over time | `reduce(x, "b t c -> b c", "mean")` |

## `repeat`: copy along an axis

| Task | Pattern |
|---|---|
| Gray to RGB | `repeat(x, "h w -> h w c", c=3)` |
| One token for every sample | `repeat(cls, "1 1 c -> b 1 c", b=B)` |
| 2× nearest upsample | `repeat(x, "b c h w -> b c (h 2) (w 2)")` |

## `einsum`

Same as `torch.einsum`, but axes have full names separated by spaces, and the tensors come **first**:

```python
scores = einsum(q, k, "batch head q d, batch head k d -> batch head q k")
```

It calls the framework's own einsum underneath. The rules are on the [einsum](../fundamentals/einsum.md) page.

## `pack` and `unpack`: concatenate tensors of different shapes

`*` marks the axes to merge. Each tensor can have any number of axes there.

```python
cls = torch.randn(B, C)            # (b, c)
x   = torch.randn(B, 196, C)       # (b, n, c)

tokens, ps = pack([cls, x], "b * c")       # (b, 197, c)
cls, x = unpack(tokens, ps, "b * c")       # back to the original shapes
```

## `parse_shape`: read sizes by name

```python
parse_shape(x, "b c h w")          # {'b': 32, 'c': 3, 'h': 224, 'w': 224}
parse_shape(x, "b _ h w")          # {'b': 32, 'h': 224, 'w': 224}
```

## Layers

`Rearrange` and `Reduce` work as `nn.Module`s inside `nn.Sequential`. `EinMix` is a linear layer that mixes along any named axes (used in MLP-Mixer).

```python
from einops.layers.torch import Rearrange, Reduce

model = nn.Sequential(
    nn.Conv2d(3, 64, 3, padding=1),
    Reduce("b c (h 2) (w 2) -> b c h w", "max"),   # max pool
    Rearrange("b c h w -> b (c h w)"),             # flatten
    nn.LazyLinear(10),
)
```

## Things to know

- **It checks shapes.** A size that doesn't divide (`(h d)` with `h=7` and 512 channels), the wrong number of axes, or a given size that doesn't match all raise a clear error.
- **No speed cost.** `rearrange` becomes `reshape` → `permute` → `reshape`, the calls you'd write by hand, and returns a view when possible. Patterns are parsed once and cached. It works with `torch.compile`.
- **Any framework.** The same code runs on PyTorch, NumPy, JAX, TensorFlow, MLX and others.
- **Where to use it:** anywhere you split or merge axes. A plain `.transpose(1, 2)` with a `# (B, T, C)` comment is fine on its own.

## Sources

- [einops on GitHub](https://github.com/arogozhnikov/einops)
- [Einsum and Einops — Mechanistic Interpretability 101, Episode 4](https://www.youtube.com/watch?v=LTlyZWj74d4)
- [Einsum & einops video](https://www.youtube.com/watch?v=pkVwUVEHmfI)
