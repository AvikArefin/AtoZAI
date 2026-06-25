# Input Size Agnostic CNN   
from the previous page    
[Finding input size in CNN](finding-input-size-in-cnn.md)    
we know regular CNN has an input size contraint.    
   
One of the ways we can solve this is by using    
`AdapdiveAveragePool`    
```
lennet32Agnostic = nn.Sequential(
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
    
    nn.AdaptiveAvgPool2d(1),  # GAP: [N, 32, 1, 1]
    nn.Flatten(),
    
    # Fully connected layers
    nn.Linear(in_features=200, out_features=84),
    nn.ReLU(),
    nn.Linear(in_features=84, out_features=10)
).to(device)
```
```
size = 256 # Change as you like
imageAgnostic = torch.zeros((1, 1, size, size), dtype=torch.float32)
lennet32Agnostic.forward(imageAgnostic.to(device)) # This lennet model was originally for 32x32 input
```
   
Food for thought: what other ways can this be achieved? Can we dynamically change the architecture based on the input size?   
   
   
