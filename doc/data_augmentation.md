# PyTorch Transforms

**Math vs. PyTorch:** Math uses column vectors ($M \cdot v$). PyTorch uses row vectors ($v \cdot M^T$). Transpose the matrix.


### Full Affine (Transform + Translate)

Leaves the 3rd dimension (pen state) untouched. They can be used together by passing the transformation matrix as `A` to the `affine` function:

```python
def affine(t, A, trans_vec):
    # A is 2x2. trans_vec is length 2.
    xy, pen = t[..., :2], t[..., 2:]
    return torch.cat([(xy @ A) + trans_vec, pen], dim=-1)

# 1. Create the transformation matrix A
transform_mat = torch.tensor([
    [scale_x * (math.cos(angle) + skew_y * math.sin(angle)),   scale_y * (math.sin(angle) + skew_y * math.cos(angle))],
    [scale_x * (-math.sin(angle) + skew_x * math.cos(angle)),  scale_y * (math.cos(angle) - skew_x * math.sin(angle))]
], dtype=t.dtype)

# 2. Define the translation vector
trans_vec = torch.tensor([translate_x, translate_y], dtype=t.dtype)

# 3. Apply the transformation
augmented_t = affine(t, transform_mat, trans_vec)
```

### 3. Why translate centered data?

1. **Augmentation:** Forces the network to learn shape, not absolute position.
2. **Canvas Placement:** Moving a locally-centered letter to a global word position.
3. **Realism:** Humans rarely start writing exactly at $(0,0)$.