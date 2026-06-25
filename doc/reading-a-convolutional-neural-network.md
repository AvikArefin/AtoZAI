# Reading a Convolutional Neural Network   
This is a quick guide on reading a CNN. i.e. calculate the input and output sizes of each layers. Note, although theory should apply in other libraries, this is made specifically for PyTorch and this is not meant to be a full fledge guide on learning CNN.   
   
First things first,   
Image structues,   

$$
(ImagesNumber, Batch Size, Height, Width) = (N, B, H, W)
$$
Annotation:   
1@28x28   
1 Channel and 28 by 28 pixels   
   
   
Now for how convolution, batchnorm, maxpool, ReLU etc affect the pixel size:   
For convolution (with padding and stride) and pooling (with padding and stride)   

$$
Output = floor((Input + 2* Padding - Kernal) / Stride ) + 1
$$
For Batchnorm   
  (For a specified batch size) normalizes the values   

$$
Output = Input

$$
For ReLU   

$$
Output = Input

$$
Let's take lennet as an example:   
```
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
   
But here's how about finding the input size if you don't know? You would have to find it by backtracking from the input layer of fully connected layer. In this case the 32\*7\*7 value.   
   
However, for a practical test, if this might be too troublesome (eh..). So, you could use a brute force method.   
