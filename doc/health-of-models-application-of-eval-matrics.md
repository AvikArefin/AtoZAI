# Health of Models / Application of Eval Matrics   
It is not enough to learn about the loss, but rather loss with respect to time, loss of training set and evaluation set is very important. So, as not to overfit or underfit.   
   
In this article we will learn how to understand overfit and underfit using loss vs epoch charts   
   
- **Diagnosing Overfitting vs. Underfitting (The primary use case):**   
    - **Overfitting:** Training loss keeps going down, but evaluation (validation) loss starts going up. The model is memorizing the training data and failing to generalize. Point metrics only tell you the eval score is bad; the graph tells you *why*.   
    - **Underfitting:** Both training and evaluation loss plateau at a high value. The model is too simple or hasn't trained long enough to capture the patterns.   
    - **Good Fit:** Both lines go down and stabilize close to each other.   
- **Checking Convergence:** How do you know when to stop training? A final accuracy score won't tell you if training for 10 more epochs would have helped. A graph showing the loss flattening out (asymptoting) confirms the model has converged.   
- **Debugging Optimization/Learning Rates:**   
    - If the loss graph looks incredibly jagged and erratic, your learning rate might be too high.   
    - If the loss drops incredibly slowly over hundreds of epochs in a straight line, your learning rate might be too low.   
- **Catching Data Leaks or Bugs:** If your training and eval loss immediately drop to zero in the first epoch, you almost certainly have a data leak (e.g., your target variable is accidentally included in your features).   
-    
   
Example:   
Phase 1 and 3 start overfiting from around 2 or 1 epoch.   
But the Phase 2 is a healthy progress, the training loss is smooth, but the val loss has ups and downs in it.   
![image_1779968626823_0](files/image_1779968626823_0.png)    
   
