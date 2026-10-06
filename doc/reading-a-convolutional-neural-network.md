# Reading a Convolutional Neural Network     
   
First things first,
Image are structured as:

$$
(Batch, Feature, Height, Width)
$$

Usually you would see Feature witten as Channel.

Annotation:
`1@28x28`
1 Channel and 28 by 28 pixels


How convolution, pooling, BatchNorm, ReLU etc. change the size is covered in one place:

!!! ticket "The output rule"
    [$O = \lfloor (I + 2P - K) / S \rfloor + 1$](shape.md#the-output-rule)

Let's take LeNet as an example:   
```python
num_classes = 9
# Define the sequential model
cnn1 = nn.Sequential(
    # Block 1: 1@28x28 -> 16@28x28 -> 16@14x14
    nn.Conv2d(in_channels=1, out_channels=16, kernel_size=3, padding=1), # (28 + 2*1 - 3)/1 + 1
    nn.BatchNorm2d(16),
    nn.ReLU(),
    nn.MaxPool2d(kernel_size=2, stride=2),  # (28 + 2*0 - 2)/2 + 1
    
    # Block 2: 16@14x14 -> 32@14x14 -> 32@7x7
    nn.Conv2d(in_channels=16, out_channels=32, kernel_size=3, padding=1), # (14 + 2*1 - 3)/1 + 1
    nn.BatchNorm2d(32),
    nn.ReLU(),
    nn.MaxPool2d(kernel_size=2, stride=2), # (14 + 0 - 2)/2 +1 # Output size: 32 x 7 x 7
    
    # Flatten the output to feed into fully connected layer
    nn.Flatten(), # 32x7x7 # 1D tensor
    
    # Fully connected layers
    nn.Linear(32 * 7 * 7, 128),  # Flattened size matches pooling output
    nn.ReLU(),
    nn.Linear(128, num_classes)
)
```
   
Input : 28x28 image   
Output : Num\_classes ( 9 in this case )   
   
## Input Size

!!! reader
    What if I don't know the input size? 

!!! author
    Work backwards from the first fully connected layer (the `32*7*7` value), one layer at a time, asking at each layer: "what input would give me this output?"

### Step 0: Throw away what doesn't change the size

Only convs and pools change height and width. BatchNorm and ReLU don't ([the output rule](shape.md#the-output-rule)), so cross them out:

```
Conv2d(k=3, p=1)
MaxPool2d(k=2, s=2)
Conv2d(k=3, p=1)
MaxPool2d(k=2, s=2)
Flatten
Linear(32*7*7, ...)
```

### Step 1: Simplify each layer once

Put each layer's numbers into [the output rule](shape.md#the-output-rule), $O = \lfloor (I + 2P - K) / S \rfloor + 1$:

| Layer | Plug in | Simplifies to |
|---|---|---|
| Conv `k=3, p=1, s=1` | $(I + 2 - 3)/1 + 1$ | **O = I** (size unchanged) |
| MaxPool `k=2, s=2` | $\lfloor (I - 2)/2 \rfloor + 1$ | **O = ⌊I / 2⌋** (halves, rounding down) |

So the whole network is: **same, halve, same, halve.**

### Step 2: Start at the end and read the `Linear`

`Linear(32*7*7, 128)` expects `channels × H × W = 32 × 7 × 7`.

The last conv has `out_channels=32`, so the channels part is 32. That leaves `H × W = 7 × 7`. **The last map is 7×7.**

### Step 3: Walk backwards, undoing each layer

| Going up through... | Output (known) | Ask | Input |
|---|---|---|---|
| MaxPool 2 (halve) | 7 | which $I$ gives $\lfloor I/2 \rfloor = 7$? | **14 or 15** |
| Conv 2 (same) | 14 or 15 | which $I$ gives the same size? | **14 or 15** |
| MaxPool 1 (halve) | 14 or 15 | $\lfloor I/2 \rfloor = 14$ → 28, 29; $= 15$ → 30, 31 | **28 to 31** |
| Conv 1 (same) | 28 to 31 | same size | **28 to 31** |

**Answer: the network accepts 28×28 up to 31×31.** It was built for 28×28 (MNIST), which is the smallest size that fits.

The only tricky part is undoing a pool. Because it rounds down, two inputs give the same output (14 and 15 both become 7). So going backwards, one number becomes two: double it, and also double it plus one.

### Step 4: Check it forwards

Pick the edges of the range and run them down:

- **28:** 28 → 28 → 14 → 14 → 7 ✓
- **31:** 31 → 31 → 15 → 15 → 7 ✓
- **32 (one too big):** 32 → 32 → 16 → 16 → 8 ✗. That gives 32×8×8 = 2048, but the `Linear` wants 1568.

## Finding the input size by brute force

If working backwards is too troublesome (eh..), let the computer do it: try every size and keep the ones the model accepts.

```python
import torch

@torch.no_grad()  # no gradients needed, much faster
def find_input_sizes(model, in_channels=1, max_size=256):
    model.eval()  # BatchNorm in train mode fails on a batch of 1
    device = next(model.parameters()).device
    sizes = []
    for size in range(1, max_size + 1):
        try:
            model(torch.zeros(1, in_channels, size, size, device=device))
            sizes.append(size)
        except RuntimeError:  # shape errors only; other bugs still surface
            pass
    return sizes
```

## Making a CNN input-size agnostic

As shown above, a regular CNN only accepts a narrow range of input sizes, because the first `Linear` needs a fixed number of features.

One way to remove that limit is adaptive pooling. `nn.AdaptiveAvgPool2d(1)` averages each channel down to 1x1, whatever size it gets (Global Average Pooling, GAP), so the `Linear` always sees the same number of features:

```python
lenet32_agnostic = nn.Sequential(
    # Block 1: 1@32x32 -> 6@32x32 -> 6@16x16
    nn.Conv2d(in_channels=1, out_channels=6, kernel_size=3, padding=1), # 32 - 3 + 2*1 + 1 = 32
    nn.ReLU(),
    nn.MaxPool2d(kernel_size=2), # 32 / 2 = 16
    
    # Block 2: 6@16x16 -> 16@12x12 -> 16@6x6
    nn.Conv2d(in_channels=6, out_channels=16, kernel_size=5), # 16 - 5 + 2*0 + 1 = 12
    nn.ReLU(),
    nn.MaxPool2d(kernel_size=2), # 12 / 2 = 6
    
    # Block 3: 16@6x6 -> 200@1x1
    nn.Conv2d(in_channels=16, out_channels=200, kernel_size=6), # 6 - 6 + 2*0 + 1 = 1
    nn.ReLU(),
    
    nn.AdaptiveAvgPool2d(1),  # GAP: [N, 200, 1, 1], whatever the input size
    nn.Flatten(),
    
    # Fully connected layers
    nn.Linear(in_features=200, out_features=84),
    nn.ReLU(),
    nn.Linear(in_features=84, out_features=10)
)
```
```python
size = 256 # Change as you like
image = torch.zeros((1, 1, size, size), dtype=torch.float32)
lenet32_agnostic(image)  # works, although this LeNet was designed for 32x32
```

Note: modern models for vision tasks accept variable size input, such as YOLOv8.

Food for thought: what other ways can this be achieved? Can we dynamically change the architecture based on the input size?
