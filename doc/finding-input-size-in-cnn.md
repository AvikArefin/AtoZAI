# Finding input size in CNN   
How to find the correct input size for a CNN?   
1. We can back calculate using knowledge from
   
[Reading a Convolutional Neural Network](reading-a-convolutional-neural-network.md)    
   
2. Brute force i   
```

import torch

def find_min_input_size(model, in_channels=1, max_size=256):
    for size in range(1, max_size + 1):
        try:
            x = torch.zeros((1, in_channels, size, size)).to(next(model.parameters()).device)
            model(x)
            return size
        except Exception:
            continue
    return None
```
```
min_size = find_min_input_size(lennet32)
print(f"Minimum input size for model: {min_size}x{min_size}")
```
> Additional Context    

```
lennet32 = nn.Sequential(
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

    nn.Flatten(), # 200 (1D Tensor)
    
    # Fully connected layers
    nn.Linear(in_features=200, out_features=84),
    nn.ReLU(),
    nn.Linear(in_features=84, out_features=10)
).to(device)
```
Note: modern Models for Vision Tasks use Variable Size Input system, such as YOLOv8.   
   
   
