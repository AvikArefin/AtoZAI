# LOSS   
Loss can be seen as a type of difference between real value and predicted value by the model. The actual definition depends on the type of loss. An Important differentiator between a loss and regular performance indicator is that loss must be **differentiable. **The math needs smooth derivatives so the model can calculate gradients and learn. This is used *during* the training.   
# Types of Loss Functions   
1. **Regression Loss Functions** — used in regression neural networks; given an input value, the regression model predicts a corresponding output value (rather than pre-selected labels); Examples of RLF: 

**Mean Squared Error (MSE), Mean Absolute Error (MAE), Huber loss etc.

**   
2. **Classification Loss Functions** — used in classification neural networks; given an input, the classification neural network produces a vector of probabilities of the input belonging to various pre-set categories — can then select the category with the highest probability of belonging; Examples of CLF:
**
Binary Cross-Entropy, Categorical Cross-Entropy, Sparse Categorical Cross-Entropy**   
   
    
![image](files/image_p.png)    
   
   
# MSE   

$$
\text{MSE} = \frac{1}{n} \sum_{i=1}^n (y_i - \hat{y}_i)^2
$$
   
# BCE   

$$
\text{BCE} = -\frac{1}{n} \sum_{i=1}^n \left[ y_i \log(\hat{y}_i) + (1 - y_i) \log(1 - \hat{y}_i) \right]
$$
So, the last layer should always have activation function `sigmoid` (which turns  input value into a value between 0 to 1.) This can be translated as yes (if more than0.5) or no (if less than 0.5)   
   
# CCE   

$$
\text{CCE} = -\frac{1}{n} \sum_{i=1}^n \sum_{c=1}^C y_{i,c} \log(\hat{y}_{i,c})
$$
 the last layer should always have an activation function `softmax` in a multiclass classification model.   
Lets' take a image multiclass classification model. So, the last layer is softm`ax (The` softmax function converts a vector of real numbers (say 2, 4, -2) into a probability distribution where all values are between 0 and 1 and sum to 1, (say 0.3, 0.6, and 0.1) and a threshhold can be used to determined which classes are actually there in the image.   
softmax is like an “interpreter between AI and people. " Softmax functions are mostly used in the “final layer,” where the output values produced by AI are finally converted.   
