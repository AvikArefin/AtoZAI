# RNN: Recurrent Neural Networks

For our explanation we can divide data in the structure below (This is not a complete structure):   
1. Unordered:   
    1. Collection of data points [Where their position respect to other data points does not matter, what matters is only the data points values]. Classical regression problems fall under this category.   
2. Ordered   
    1. 2D → Images   
    2. 1D → Also known as sequences   
        1. Time Series   
        2. Natural Language   
   
     
This diagram of the famous Recurrent Neural Network   
   
So, how does it work?   
The NN takes an initial state and an input and gives one output and a new state. This new state replaces the old state for the next iteration.   

$$
\begin{aligned}
x_{\text{mod}} &= w_1 \cdot x \\
\text{out} &= \tanh(x_{\text{mod}} + \text{hidden}_{\text{prev}} + b) \\
\text{hidden}_{\text{new}} &= w_2 \cdot \text{out}
\end{aligned}
$$
   
# Types of RNN   
There are four types of RNN are:   
1. One to One   
2. One to Many   
3. Many to One   
4. Many to Many   
   
   
# TORCH RANDN   
```python
torch.randn(hidden_size, input_size, device=device)
```
```python
rows, columns = 5, 2
c = torch.randn(rows, columns, device=device)
print(c)
print(c[rows-1][columns-1]) # Last item
```
tensor([[ 0.3669, -0.8879],
[ 0.6068, 0.6522],
[-0.9409, 0.3379],
[-1.0983, 2.2320],
[ 1.3791, -0.0643]], device='cuda:0')
tensor(-0.0643, device='cuda:0')   
   
```python
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import matplotlib.pyplot as plt
```
```python
device = 'cuda'
```
   
