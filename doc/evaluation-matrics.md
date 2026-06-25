# EVALUATION MATRICS   
These Can be **non-differentiable**. Primarily used for humans to understand how the model is performing. This is used after training, during the evaluation / manual test period. For human understanding of how the model is doing.   
Note: `Classified` should be read as "classified as class a" below.   
   
Accuracy    
  → Correctly Classified / Total Number of Test Datapoints   
   
Precision    
  → Correctly Classified / (Correctly Classified + Incorrectly Classified)   
  → Correctly Classified / Total Classified    
     
Recall    
  → Correctly Classified / (Correctly Classified + Not Classified)   
  → Correctly Classified / Total True Instances   
     
F1   
  → 2 / (( 1 / Recall) + (1 / Precision))   
     
     
Confusion Matrix   
To create a confusion matrix, we need four attributes:   
**True Positives (TP)**:  The model predicted a label and matches correctly as per ground truth.   
**True Negatives (TN)**: The model does not predict the label and is not a part of the ground truth.   
**False Positives (FP)**: The model predicted a label, but it is not a part of the ground truth (Type I Error).   
**False Negatives (FN)**: The model does not predict a label, but it is part of the ground truth. (Type II Error).   
![IMG_0348](files/img_0348.webp)    
   
PR Curve   
  Precision vs Recall Curve. We want the curve to have both a high P and a High R   
  ![image_1779298624165_0](files/image_1779298624165_0.png)    
ROC   
  Receiver Operating Characteristic   
  ![image_1779298833779_0](files/image_1779298833779_0.png)    
   
AUC   
  → Area Under the curve, either for the PR Curve or ROC Curve, but either way, the higher the better.   
     
Variance (of mean)   
  → Average of the squared difference between the datapoints and the mean (of the datapoints).   
  
$$
\sigma^2 = \frac{1}{N} \sum_{i=1}^{N} (x_i - \mu)^2
$$
  → Variance is essentially MSE, except where the    
   
R^2   
  → Ratio of the difference between variance of mean and variance of model's output plotted and the variance of mean   
  It tells us in terms of ratio, how much is the model better than just random guess.   
  → (variance (against mean) - variance (against the model))/ variance (against mean)   
  → (variance - MSE) / variance   
     
  **`variance - MSE` (The Victory):** This is the amount of variation your model successfully figured out and cleaned up and by dividing it by variance again we get the ratio. This also means, if the value is 0, it means that it is no better than the average guess. and if it's 1, the model predicts correctly 100% of the time.   
   
**Cosine Similarity**    
  → when you are comparing complex, high-dimensional concepts, and you want to say, *"I don't care how long or wordy this is, are we talking about the same semantic topic?"* (Semantic Search, Recommendation Systems, Facial Verification, NLP, Vector Embedding).   
     
  $\text{Cosine Similarity} = \frac{A \cdot B}{\\|A\\| \\|B\\|} = \frac{\sum\_{i=1}^{n} A\_i B\_i}{\sqrt{\sum\_{i=1}^{n} A\_i^2} \sqrt{\sum\_{i=1}^{n} B\_i^2}}$   
     
   
There are matrices such as **MSE, MAE, RSME** for Regression Models, **Binary Cross-Entropy, Categorical Cross-Entropy, Sparse Categorical Cross-Entropy for Classification models **and but as they are also used in loss calculation, i.e. they are differentiable and are used during and for training the model, usually not meant for human interpretation, they are written a separate page `LOSS` up next.   
   

$$
https://www.youtube.com/watch?v=LbX4X71-TFI
$$
   
   
   
[https://www.v7labs.com/blog/mean-average-precision](https://www.v7labs.com/blog/mean-average-precision)   
   
Negative predictions in object detection do not mean there are no bounding boxes. Instead, they indicate that the model predicts no object of interest or assigns a bounding box to the background class. Bounding boxes are still generated, but those with negative predictions are considered to contain no relevant objects. This is a key part of distinguishing objects from the background during both training and inference.   
   
   
IoU   
Intersection over Unionindicates the overlap of the [predicted bounding box coordinates](https://www.v7labs.com/blog/bounding-box-annotation) to the ground truth box. Higher IoU indicates the predicted bounding box coordinates closely resembles the ground truth box coordinates.   
![IMG_0350](files/img_0350.jpeg)    
   
   
mAP    
or in some cases refered to as simply AP   
The idea of mAP is pretty simple -> Consider a set of thresholds in AP calculation.   
Calculate AP across a set of IoU thresholds for each class **k** and then take the average of all AP values. This eliminates the necessity of picking an optimal IoU threshold by using a set of IoU thresholds that covers tail ends of precision and recall values.   
![IMG_0349](files/img_0349.jpeg)    
