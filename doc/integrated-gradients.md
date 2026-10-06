# Integrated Gradients

Integrated Gradients (IG) answers one question: **how much did each input feature contribute to this prediction?** It gives every pixel, token or tabular feature a score. Positive scores pushed the output up, negative scores pushed it down.

It comes from [Axiomatic Attribution for Deep Networks](https://arxiv.org/abs/1703.01365) (Sundararajan et al., 2017) and is one of the most used attribution methods in [Captum](explainable-ai.md).

## Why not just use the gradient?

The simplest attribution is the gradient of the output with respect to the input (called a *saliency map*): "if I nudge this pixel, how much does the output change?"

The problem is **saturation**. Once a feature has done its job, the gradient around it can be flat. Think of a ReLU or sigmoid that is already fully "on": the feature clearly matters, but nudging it a little changes nothing, so its gradient is about 0.

IG fixes this by not looking at the gradient at one point only. It looks at the gradients along the whole path from "no information" to the real input.

## The idea

1. Pick a **baseline** $x'$: an input that means "nothing", e.g. a black image, all-zero features, or padding tokens.
2. Walk in a straight line from the baseline $x'$ to the real input $x$.
3. At each step along the way, compute the gradient.
4. Average those gradients and multiply by how far each feature moved, $(x_i - x'_i)$.

$$
\text{IG}_i(x) = (x_i - x'_i) \times \int_0^1 \frac{\partial F\big(x' + \alpha (x - x')\big)}{\partial x_i} \, d\alpha
$$

- $F$ is the model's output for the class you care about.
- $\alpha$ goes from 0 (baseline) to 1 (real input).
- In practice the integral is approximated with a sum over `n_steps` points (a Riemann sum), usually 50 to 300.

## The nice property: completeness

The attributions add up to the change in the output:

$$
\sum_i \text{IG}_i(x) = F(x) - F(x')
$$

So if the model says 0.92 for "cat" on the image and 0.10 on a black image, the pixel scores add up to 0.82. Nothing is lost or made up. Captum returns a **convergence delta**, the gap between the two sides. If it's large, increase `n_steps`.

## Example 1: tabular data with Captum

```python
import torch
import torch.nn as nn
from captum.attr import IntegratedGradients

torch.manual_seed(0)

# a toy classifier: 4 features -> 3 classes
model = nn.Sequential(nn.Linear(4, 16), nn.ReLU(), nn.Linear(16, 3))
model.eval()

x = torch.tensor([[5.1, 3.5, 1.4, 0.2]])   # one sample (batch of 1)
baseline = torch.zeros_like(x)               # "no information"

ig = IntegratedGradients(model)
attributions, delta = ig.attribute(
    x,
    baselines=baseline,
    target=0,                   # explain class 0
    n_steps=100,
    return_convergence_delta=True,
)

print(attributions)  # shape [1, 4]: one score per feature
print(delta)         # should be close to 0
```

The `target` is which output you are explaining. For a classifier that's usually the predicted class: `target=model(x).argmax(dim=1)`.

## Example 2: an image classifier

```python
import torch
from torchvision.models import resnet18, ResNet18_Weights
from captum.attr import IntegratedGradients, visualization as viz

weights = ResNet18_Weights.DEFAULT
model = resnet18(weights=weights).eval()
preprocess = weights.transforms()

img = preprocess(pil_image).unsqueeze(0)   # [1, 3, 224, 224]
pred = model(img).argmax(dim=1)

ig = IntegratedGradients(model)
attr = ig.attribute(img, baselines=torch.zeros_like(img), target=pred, n_steps=50)

# [1, 3, H, W] -> [H, W, 3] for plotting
viz.visualize_image_attr(
    attr.squeeze(0).permute(1, 2, 0).detach().numpy(),
    img.squeeze(0).permute(1, 2, 0).numpy(),
    method="blended_heat_map",
    sign="positive",
)
```

Heads up: the image is already normalized, so `torch.zeros_like(img)` is the *mean* image, not a black one. Both are common baselines. Just know which one you chose.

## Example 3: time series (gestures drawn in 2D)

Say a model reads a gesture as a sequence of pen or finger positions, `[T, 2]` with one `(x, y)` per time step, and decides whether it's a circle or a swipe. IG tells us **which moments of the stroke** the decision rested on.

```python
import math
import torch
import torch.nn as nn
from captum.attr import IntegratedGradients

class GestureNet(nn.Module):
    def __init__(self, n_classes=2, hidden=32):
        super().__init__()
        self.gru = nn.GRU(input_size=2, hidden_size=hidden, batch_first=True)
        self.head = nn.Linear(hidden, n_classes)

    def forward(self, x):            # x: [B, T, 2]
        _, h = self.gru(x)           # h: [1, B, hidden], the last hidden state
        return self.head(h[-1])      # [B, n_classes]

model = GestureNet().eval()          # in real use: load your trained weights

# one gesture: a circle sampled at 64 time steps
t = torch.linspace(0, 2 * math.pi, 64)
stroke = torch.stack([torch.cos(t), torch.sin(t)], dim=-1).unsqueeze(0)   # [1, 64, 2]

# baseline: the finger resting at the stroke's starting point, so "no movement"
baseline = stroke[:, :1].expand_as(stroke)

ig = IntegratedGradients(model)
attr, delta = ig.attribute(stroke, baselines=baseline, target=0,   # 0 = "circle"
                           n_steps=100, return_convergence_delta=True)

# [1, 64, 2] -> one score per time step: how much that moment mattered
per_step = attr.squeeze(0).abs().sum(dim=-1)
print(per_step.shape, delta)        # torch.Size([64]), close to 0
```

Draw the stroke and colour each point by its score. The bright parts are where the model "looked":

```python
import matplotlib.pyplot as plt

xy = stroke.squeeze(0)
plt.scatter(xy[:, 0], xy[:, 1], c=per_step.detach(), cmap="magma")
plt.colorbar(label="attribution")
plt.gca().set_aspect("equal")
plt.show()
```

A few notes on time series:

- **The baseline matters even more here.** An all-zeros baseline means "the gesture sat at the origin", which can be a real position. "Not moving from the start point" (above) or "the mean position" is usually a more honest "nothing".
- **Keep the sign if you want direction.** `.abs()` shows *where* the model looked. Summing without `.abs()` shows whether each step pushed *towards* or *away from* the target class.
- **If you feed deltas instead of positions** (`dx, dy` per step, common for handwriting), IG works the same way. Use an all-zeros baseline, which then really does mean "no movement".
- **On a GPU, a GRU/LSTM in `eval()` can't run backward with cuDNN.** Wrap the call in `with torch.backends.cudnn.flags(enabled=False):` or run IG on the CPU.
- **For text,** the input is token ids, which you can't take a gradient of. Use `LayerIntegratedGradients(model, model.embedding)` to attribute to the embeddings instead.

## Things to watch out for

!!! warning
    IG explains the prediction *relative to the baseline*. A black-image baseline says nothing about dark pixels, because they didn't move. Try a couple of baselines (zeros, blurred input, random noise). `NoiseTunnel` (SmoothGrad) on top of IG also helps reduce noisy maps.

- **Batch size and memory**: IG runs the model `n_steps` times per input. Use `internal_batch_size` in `attribute()` if you run out of memory.
- **It explains the model, not the world**: a high score means the *model* relied on that feature, not that the feature truly causes the label.
- **`model.eval()`**: dropout and batch-norm in training mode make the attributions random.
