# Optimizer   
We will talk about Adam and other kinds of optimizers on another day, for now we are interested in something called EMA.   
   
EMA (Exponential Moving Average)   

$$
New\ Average\ =\ α⋅(New Value)+(1−α)⋅(Old Average)
$$
   
In machine learning, we use EMA to update the weights of a **Target Encoder** (the "Teacher") using the weights of the **Online Encoder** (the "Student"):   

$$
θ _{target} ←m⋅θ_{target} +(1−m)⋅θ_{online}


$$
- θ target: The weights of the Target Encoder (with no gradients calculated).   
- θ online: The active weights of the Online Encoder (updated by backpropagation).   
- m: The **momentum decay rate** (usually a high value like 0.98 or 0.999).   
   
**Why do this?** If the Target Encoder immediately copied the Online Encoder (m=0), the network would suffer from representation collapse (it would learn to output useless constants).   
   
Note:   
**Transformer Encoder:** A specific Lego brick (Self-Attention + FFN + Norm).   
**Target/Online Encoder:** The label we give to the parts of the model that convert input text into vectors for the JEPA comparison game.   
   
**Representation collapse**   
   
   
