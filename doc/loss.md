# LOSS   
Loss can be seen as a type of difference between real value and predicted value by the model. The actual definition depends on the type of loss. An Important differentiator between a loss and regular performance indicator is that loss must be **differentiable. **The math needs smooth derivatives so the model can calculate gradients and learn. This is used *during* the training.
  
# Types of Loss Functions   
1. **Regression Loss Functions** — used in regression neural networks; given an input value, the regression model predicts a corresponding output value (rather than pre-selected labels); Examples of RLF: 

**Mean Squared Error (MSE), Mean Absolute Error (MAE), Huber loss etc.

**   
2. **Classification Loss Functions** — used in classification neural networks; given an input, the classification neural network produces a vector of probabilities of the input belonging to various pre-set categories — can then select the category with the highest probability of belonging; Examples of CLF:
**
Binary Cross-Entropy, Categorical Cross-Entropy, Sparse Categorical Cross-Entropy**   
   
   
   
# MSE   

$$
\text{MSE} = \frac{1}{n} \sum_{i=1}^n (y_i - \hat{y}_i)^2
$$
   
# BCE   

$$
\text{BCE} = -\frac{1}{n} \sum_{i=1}^n \left[ y_i \log(\hat{y}_i) + (1 - y_i) \log(1 - \hat{y}_i) \right]
$$
So, the last layer should always have activation function `sigmoid` (which turns  input value into a value between 0 to 1.) This can be translated as yes (if more than0.5) or no (if less than 0.5)

**PyTorch Implementation:**
* **`nn.BCELoss`**: Requires a `sigmoid` activation at the end of your model.
* **`nn.BCEWithLogitsLoss`**: Combines `sigmoid` and BCE into a single function. This is more numerically stable and is the recommended approach. When using this, **do not** put a `sigmoid` activation at the end of your model (it expects raw "logits").
   
# CCE   

$$
\text{CCE} = -\frac{1}{n} \sum_{i=1}^n \sum_{c=1}^C y_{i,c} \log(\hat{y}_{i,c})
$$
 the last layer should always have an activation function `softmax` in a multiclass classification model. See: [Activation Functions](activation-functions.md) 

**PyTorch Implementation (`nn.CrossEntropyLoss`):**
PyTorch's `nn.CrossEntropyLoss` is the implementation of Categorical Cross-Entropy (CCE). 
**Crucial Note:** PyTorch's `nn.CrossEntropyLoss` automatically combines `nn.LogSoftmax()` and `nn.NLLLoss()` (Negative Log Likelihood Loss) into a single function for better mathematical stability. 
Therefore, when using `nn.CrossEntropyLoss` in PyTorch, **you must NOT add a `softmax` activation at the end of your model**. The final layer should simply output the raw, unnormalized numbers (logits).
