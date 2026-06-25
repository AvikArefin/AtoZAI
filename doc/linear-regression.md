# Linear Regression   
Linear Regression Model   
  
$$
y = b + wx + \epsilon

$$
  Here, b is the bias   
    w is the weight   
    epsilon is the error   
Let's first take an actual linear model … add some noise to it, then use a random linear regression and use gradient descent to find the original model.   
   
Topic 1:   
Randomness   
```
import numpy as np
np.random.seed(13)
print(np.random.randint(10, 1))
```
   
We use randn (this uses the bell shaped normal distribution) instead of rand (which uses regular distribution) because in the later section internally a sigmoid function will be used.

   
![image](files/image_i.png)    
   
**Why the Uniform Distribution Didn't Work**:   
- The **sigmoid activation function** has a steep slope near 0, but its slope becomes very flat as the input moves away from 0. When the slope is flat, gradients during training become very small.   
- Small gradients lead to **tiny weight updates**, making it hard to train the network (this is called the vanishing gradient problem).   
   
## Topic 2: Scatter plot   
```
import matplotlib.pyplot as plt
plt.scatter(x, y) # x, y must be of same size
plt.show()
```
## Topic 3: Computing the cost function   
```

```
## Topic: They are not the same   
Using b = b - b.grad \* lr would cause the parameter b to be re-assigned to the new value, but the original b would not be updated, therefore, the value of b would be None.   
On the other hand, using b -= b.grad \* lr will update the value of b in place, so the original b will be updated and its value will not be None.   
```
# b = b - lr*b.grad
b -= lr*b.grad

```
## NOTES:   
1. torchviz is no longer maintained, use torchviz2   
