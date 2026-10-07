# Train vs Eval Mode

!!! tldr
    `model.eval()` before validation, testing and inference. `model.train()` before training. Also wrap evaluation in `torch.no_grad()`; they do different things.

## What `eval()` changes

Only layers that behave differently while training:

| Layer | `train()` | `eval()` |
|---|---|---|
| Dropout | randomly zeros activations | does nothing |
| BatchNorm | uses current batch stats, updates running averages | uses stored running averages |

A model with neither layer behaves identically in both modes. See [Normalization Layers](../neural-networks/normalization.md).

## `eval()` vs `no_grad()`

| | Changes layer behaviour | Stops gradient tracking (memory, speed) |
|---|---|---|
| `model.eval()` | ✓ | ✗ |
| `torch.no_grad()` | ✗ | ✓ |

## Pattern

```python
for epoch in range(EPOCHS):
    model.train()
    for x, y in train_loader:
        ...

    model.eval()
    with torch.no_grad():
        for x, y in val_loader:
            ...
```

!!! warning
    Forgetting `eval()`: Validation scores become noisy (dropout still on), and BatchNorm's running stats get updated with validation data.
