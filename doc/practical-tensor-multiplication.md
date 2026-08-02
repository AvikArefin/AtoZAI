# Practical: Tensor Multiplication   
TLDR;    
For TenssorA \* TensorB to be valid they must be   
TensorA =  mno   
TensorB =  moy   
and the result will be TensorAB → mny   
   
Let's say our neural network has the operations:   
1. $x_{\text{mod}} = w_1 \cdot x$    
2. $\text{out} = \tanh(x_{\text{mod}} + \text{hidden}_{\text{prev}} + b)$   
3. $\text{hidden}_{\text{new}} = w_2 \cdot \text{out}$   
   
(Taken from the previous RNN page; a slightly, simply for the sake of it, modified version of the original RNN)   
And we wish to replicate the 1st line in our forward propogation:   
```python
class SimpleRNN(nn.Module):    
	def __init__(self, input_size, hidden_size):
        super(SimpleRNN, self).__init__()
        self.input_size = input_size
        self.hidden_size = hidden_size
        
        # Make weights as parameters so they can be optimized
        self.w1 = nn.Parameter(torch.randn(input_size, hidden_size, device=device))
        self.w2 = nn.Parameter(torch.randn(hidden_size, hidden_size, device=device))
        # Initialize b with shape (1, 1, hidden_size) for proper broadcasting
        self.b = nn.Parameter(torch.zeros(1, 1, hidden_size, device=device))
        
    def forward(self, x, hidden):
        mod_x = torch.matmul(x, self.w1)
        out = torch.tanh(mod_x + hidden + self.b)
        hidden = torch.matmul(out, self.w2.T)
        return hidden
```
   
But why exactly like this?   
Why not  (self.w1, x) or some other combination like (x, self.w1.T)?   
   
Good question: this is due to the tensor multiplication condition, very similar to matrix multiplication condition.   
   
# TENSOR MULTIPLICATION CONDITION:   
   
TensorA =  mno   
TensorB =  moy   
   
and the resulting Tensor[AB] will be of dimension → mny   
```python
m, n, o, y = 2, 3, 4, 5

## Define new tensors
TensorA = torch.randn(m, n, o)
TensorB = torch.randn(m, o, y)

# Perform multiplication
Result_AB = torch.matmul(TensorA, TensorB)
print("TensorA shape:", TensorA.shape)
print("TensorB shape:", TensorB.shape)
print("Result_AB shape:", Result_AB.shape)  # Should be (3 × 2 × 2)
print("Multiplication valid:", TensorB.shape[-1] == TensorA.shape[0])
```
TensorA shape: torch.Size([2, 3, 4])
TensorB shape: torch.Size([2, 4, 5])
Result\_AB shape: torch.Size([2, 3, 5])
Multiplication valid: False   
   
   
and if they are not in their correct shape we would have to perform operations, one of them is transpose.   
   
TensorA.T → onm   
TensorB.T → yom   
   
when    
TensorA → abc   
TensorB → cd   
TensorAB → abd   
   
