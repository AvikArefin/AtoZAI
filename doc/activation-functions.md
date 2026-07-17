# Activation Functions   
## What is AF? and Why do we need them and where to use which one:   


https://www.youtube.com/watch?v=Y9qdKsOHRjA&t=30s


### Binary Classification
$$
\sigma(x) = \frac{1}{1 + e^{-x}}
$$
   
The Sigmoid function maps any real number to the range (0, 1). Used in Binary Classification   


### Multiclass Classification
$$
\text{Softmax}(x_i) = \frac{e^{x_i}}{\sum_{j=1}^n e^{x_j}}

$$
   
The Soft-max function converts a vector of real numbers into a probability distribution, i.e. it shows how much each value is likely to occur as a percentage value. Hence, here, the sum of outputs for all the categories is 1.   

$$
\text{ReLU}(x) = \max(0, x)
$$
The ReLU function outputs the input if it is positive; otherwise, it outputs zero.   
   
