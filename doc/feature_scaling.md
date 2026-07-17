# Feature Scaling

## What is feature scaling?
Mapping the values of a feature into a specific range.

Example: suppose we have a dataset with 2 features - 

```
age: [10, 100]
income: [1000, 10000]
```

## Min Max Scaling

Maps the range directly to [x, y]

Formula: [0, 1]
$$normalized\_values = (values - min(values))/(max(values)-min(values))$$

Formula: [-1, 1]
$$normalized\_values = (values - min(values))/(max(values) - min(values)) * 2 - 1$$


## Aspect ratio preserving Min Max Scaling

The previous methods apply the scaling on each feature independently. This means, if we apply scaling on both features, the aspect ratio between the features will be distroyed. This is not an issue when the data points are independent. However, if the data points are not independent (such as for image data, where the aspect ratio is important), then we need to use aspect ratio preserving Min Max Scaling.

1. Center the data
2. take the max range from both features and use it scale them both to [x,y]
