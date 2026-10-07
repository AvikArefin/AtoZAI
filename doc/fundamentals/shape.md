# Everything about data & shape

## Series Data

Let's think of a piece of data. 

Let's say on the user "wrote" the roman of 3, i.e. (III) on a tablet.
And the tablet stores each stroke as a series of (x, y,) coordinates.

```
input = torch.tensor([
  [
    [1.0, 2.1],
    [1.1, 2.4],
    [2.0, 4.3],
  ],
  [
    [3.0, 4.1],
    [2.1, 3.4],
    [3.1, 5.4],
    [3.3, 1.2],
    [4.0, 5.3],
  ],
  [
    [1.0, 2.1],
    [3.1, 5.4],
    [2.3, 1.2],
    [2.0, 4.3],
  ],
])
```

(these are not actual coordinates. don't focus on that.)

It is a tensor of batch of 3, length dynamic (realistically dynamic, but technically we would pad it to a fixed length see: "padding in series data") and feature (channel) of 2.

!!! note
    Naturally we write things in [Batch, Sequence Length, Feature / Channel] Order. This is also easier to reason about.

## Images Data

In image data the length and feature's place are swapped.

So, we get: 

!!! note
    Images format: [Batch, Feature, Height, Width]. And all operations related to images also follow the same convention.

```python
print(torch.rand([2, 3, 8, 8]))
```

2 image of 3 channel (rgb) of 8x8 (height x width)


## Opeations

### The output rule

For convolution and pooling (with padding and stride):

$$
O = \lfloor (I + 2P - K) / S \rfloor + 1
$$

*(Where $I$ = Input, $P$ = Padding, $K$ = Kernel, $S$ = Stride, $O$ = Output)*

Layers like BatchNorm and ReLU only change the values, not the shape: $O = I$.

### Conv1d

```python
conv1 = nn.Conv1d(in_channels=3, out_channels=5, kernel_size=3, stride=0, padding=1)
print(conv1(torch.ones(2, 3, 10)))
```

In the (B, C, S) form, the channel (3) has to be the same as the model layer's input chnnel. They must match.

The Sequence length has some flexiblity (10) but it must follow the output rule, it has to be something that does not give any illegal value. Here the `Input` in the rule and `Sequence Length` represent the same thing. Later, in 2d data `Input` could mean `Height` or `Width`

And B (2) has the most flexibility, it does not matter what the value of b is. (In this context).

!!! note
    if we wanted to input the first `data` into conv1d then we would have to swap it's sequence length and feature.

### Conv2d

```python
conv2 = nn.Conv2d(in_channels=3, out_channels=16, kernel_size=3, stride=1, padding=1)
print(conv2(torch.rand([2, 3, 64, 64])))
```

The exact same rules apply to `Conv2d`, but they are applied to the spatial dimensions twice (once for Height, once for Width).

**Batch Size (2):** Still has complete flexibility.
**Channels (3):** The second dimension of the tensor *must* match the `in_channels` of the `Conv2d` layer. The math relies on having weights to multiply against every channel.
**Output Channels (16):** This defines how many independent feature detectors (filters) the layer has. If we ask for 16 `out_channels`, the output tensor will have 16 channels, stacking 16 newly created feature maps together.
**Spatial Dimensions (64x64):** The `Output Rule` is applied independently to both the Height and the Width. In this example, the output size for both Height and Width will be:
  `floor((64 + 2*1 - 3) / 1) + 1 = 64`

### Pooling

Pooling layers (like `nn.MaxPool1d` and `nn.MaxPool2d`) behave almost identically to Convolution layers when it comes to spatial shape, but with two major differences:

1. **Channels are untouched:** 
2. **Default Stride:** Kernel Size

```python
pool2d = nn.MaxPool2d(kernel_size=2) # Automatically sets stride=2
print(pool2d(torch.rand([2, 16, 64, 64])))
```

`floor((64 + 2*0 - 2) / 2) + 1 = floor(62 / 2) + 1 = 31 + 1 = 32`

Out shape `(2, 16, 32, 32)`. The channels remained same. For this example, `16`. Often used for the halfing the spatial dimensions.

| Layer | Expected shape |
| --- | --- |
| `nn.Conv1d` | `(B, C, L)` |
| `nn.GRU` (default) | `(L, B, C)` |
| `nn.GRU(batch_first=True)` | `(B, L, C)` |
| `nn.Linear` | `(..., C)`: features last, everything before is left alone |
| `nn.CTCLoss` | `log_probs`: `(L, B, C)` (time first, `log_softmax` over classes), `targets`: `(B, S)`, `input_lengths` & `target_lengths`: `(B,)` |
