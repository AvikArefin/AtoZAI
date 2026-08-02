# Feature Scaling

## What is feature scaling?
Mapping the values of a feature into a specific range.

Example: suppose we have a dataset with 2 features:

```
age: [10, 100]
income: [1000, 10000]
```

## Min Max Scaling

Maps the range directly to $[a, b]$.

### Formula for range $[0, 1]$

$$
x_{\text{norm}} = \frac{x - x_{\min}}{x_{\max} - x_{\min}}
$$

### Formula for range $[-1, 1]$

$$
x_{\text{norm}} = \frac{x - x_{\min}}{x_{\max} - x_{\min}} \times 2 - 1
$$


## Aspect Ratio Preserving Min Max Scaling

The standard Min Max scaling applies scaling to each feature independently. If applied independently to image pixels or spatial coordinates, the aspect ratio between dimensions will be distorted.

To preserve the aspect ratio (essential for image data and spatial coordinates):

1. Center the data.
2. Find the maximum range across all dimensions combined.
3. Scale all dimensions uniformly using that single maximum range value.
