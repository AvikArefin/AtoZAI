# Everything about shape

## Data

There is a long standing issue with shapes, errors related to shape missmatches and whatnot.
In this article, we will go over the basics:

In PyTorch: BeaCheS format is used (Batch, Channel, Sequence Length). And it is the most intuitive format.

```python
print(torch.ones([5, 3, 8]))
```

It can also be thought of as a list of 5 bundle of list of 3 pack where each pack contains 8 items.

For Images,

```python
print(torch.rand([2, 3, 8, 8]))
```

2 image of 3 channel (rgb) of 8x8 (height x width)


## Opeations

The Rule:

$$
Output = floor((Input + 2* Padding - Kernal) / Stride ) + 1
$$
### Conv1d

```python
conv1 = nn.Conv1d(in_channels=3, out_channels=5, kernel_size=3, stride=0, padding=1)
print(conv1(torch.ones(2, 3, 10)))
```


Let's first go over what was very strict, which had some flexibility and which had full flexibility:

In the (B, C, S) form, the channel (3) has to be the same as the model layer's input chnnel, they are intended for each other. They must match.

The Sequence length has some flexiblity (10) but it must follow the output rule, it has to be something that does not give any illegal value. Here the `Input` in the rule and `Sequence Length` represent the same thing. Later, in 2d data `Input` could mean `Height` or `Width`

And B (2) has the most flexibility, it does not matter what the value of b is. (In this context).

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
