# EVALUATION METRICS   
These can be **non-differentiable**. Primarily used for humans to understand how the model is performing. This is used after training, during the evaluation / manual test period.

Note: `Classified` should be read as "classified as class A" below.   

### Accuracy    
- $\text{Correctly Classified} / \text{Total Number of Test Datapoints}$

### Precision      
- $\text{Correctly Classified 'A'} / \text{Total 'A's the model Classified}$
- $\text{Correctly Classified 'A'} / (\text{Correctly Classified 'A'} + \text{Falsely Classified 'A'})$

### Recall    
- $\text{Correctly Classified 'A'} / \text{Total Actual 'A' Instances}$
- $\text{Correctly Classified 'A'} / (\text{Correctly Classified 'A'} + \text{Remaining 'A' Instances})$

### F1 Score
- $2 / (( 1 / \text{Recall}) + (1 / \text{Precision}))$

### Confusion Matrix   
To create a confusion matrix, we need four attributes:   
- **True Positives (TP)**: The model predicted a label and matches correctly as per ground truth.   
- **True Negatives (TN)**: The model does not predict the label and is not a part of the ground truth.   
- **False Positives (FP)**: The model predicted a label, but it is not a part of the ground truth (Type I Error).   
- **False Negatives (FN)**: The model does not predict a label, but it is part of the ground truth (Type II Error).   

### PR Curve   
Precision vs Recall Curve. We want the curve to have both a high Precision and a high Recall.

### ROC   
Receiver Operating Characteristic.

### AUC   
Area Under the Curve, either for the PR Curve or ROC Curve. The higher, the better.

### Variance (of Mean)   
Average of the squared difference between the datapoints and the mean ($\mu$).

$$
\sigma^2 = \frac{1}{N} \sum_{i=1}^{N} (x_i - \mu)^2
$$

Variance is essentially MSE against the mean value.

### $R^2$ Score
Ratio of the difference between variance of mean and variance of model's output plotted against the variance of mean. It tells us in terms of ratio how much better the model is than just a random guess:
- $\frac{\text{Variance(against mean)} - \text{Variance(against model)}}{\text{Variance(against mean)}}$
- $\frac{\text{Variance} - \text{MSE}}{\text{Variance}}$

**`variance - MSE` (The Victory):** This is the amount of variation your model successfully figured out and cleaned up. Dividing it by variance gives the ratio. A value of 0 means it is no better than average guess; a value of 1 means the model predicts correctly 100% of the time.

### Cosine Similarity    
When you are comparing complex, high-dimensional concepts, and you want to say: *"I don't care how long or wordy this is, are we talking about the same semantic topic?"* (Semantic Search, Recommendation Systems, Facial Verification, NLP, Vector Embedding).

$$
\text{Cosine Similarity} = \frac{A \cdot B}{\|A\| \|B\|} = \frac{\sum_{i=1}^{n} A_i B_i}{\sqrt{\sum_{i=1}^{n} A_i^2} \sqrt{\sum_{i=1}^{n} B_i^2}}
$$

There are metrics such as **MSE, MAE, RMSE** for Regression Models, and **Binary Cross-Entropy, Categorical Cross-Entropy, Sparse Categorical Cross-Entropy** for Classification models, but as they are also used in loss calculation (differentiable and used during training), they are documented on a separate page: [Loss Functions](loss.md).

[Watch: Mean Average Precision (mAP) Video Guide](https://www.youtube.com/watch?v=LbX4X71-TFI)

[Reference: Mean Average Precision Guide](https://www.v7labs.com/blog/mean-average-precision)

### Object Detection Metrics

Negative predictions in object detection do not mean there are no bounding boxes. Instead, they indicate that the model predicts no object of interest or assigns a bounding box to the background class. Bounding boxes are still generated, but those with negative predictions are considered to contain no relevant objects.

#### IoU (Intersection over Union)
Indicates the overlap of the [predicted bounding box coordinates](https://www.v7labs.com/blog/bounding-box-annotation) to the ground truth box. Higher IoU indicates the predicted bounding box coordinates closely resemble the ground truth box coordinates.

#### mAP (Mean Average Precision)
Also referred to as simply AP. The idea of mAP is to consider a set of thresholds in AP calculation: calculate AP across a set of IoU thresholds for each class $k$ and then take the average of all AP values.
