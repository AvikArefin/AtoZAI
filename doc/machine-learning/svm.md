# Support Vector Machine (SVM)

SVM is a supervised classifier that finds the **hyperplane** that separates classes with the **maximum margin** — the widest possible gap between the closest points of each class (called **support vectors**).

$$
\min_{w, b} \; \frac{1}{2} \|w\|^2 \quad \text{s.t.} \quad y_i (w \cdot x_i + b) \ge 1
$$

- **Hard margin**: no misclassification allowed — only works on linearly separable data.
- **Soft margin** (`C`): allows some misclassification to handle noisy data. Smaller `C` = wider margin, more violations tolerated.
- **Kernel trick**: when data is not linearly separable, kernels (e.g. `rbf`, `poly`) implicitly project it into a higher dimension where a linear split exists — without ever computing that projection explicitly.

```python
from sklearn.svm import SVC

model = SVC(kernel='rbf', C=1.0)
model.fit(X_train, y_train)
y_pred = model.predict(X_test)
```

!!! note
    Always **scale features** before using SVM, it is distance-based, so unscaled features distort the margin.
