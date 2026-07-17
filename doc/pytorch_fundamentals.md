## Adding dimentionality to a tensor:

```python
torch.tensor([[1, 2, 3],
        [4, 5, 6]])
```

#### 1. Unsqueeze(0)

*Wrap the entire tensor in a list* i.e. create a new dimension at dimension index 0
```
tensor([[[1, 2, 3],
         [4, 5, 6]]])
```

#### 2. Unsqueeze(-1)

*Wrap each value in a as a list* 
```
tensor([[[1], [2], [3]],
         [[4], [5], [6]]])
```


#### 3. Unsqueeze(1) 

Wrap each inner list in a list, i.e. create a new dimension at dimension index 1

```
tensor([[[1, 2, 3]],
        [[4, 5, 6]]])
```

## Slicing a tensor

For each dimension selection `(start:stop:step)` is followed, tho often times, it is abbreviated to simply a single `:` or `::` or `::-1` etc, depending on the requirement.

An example would clear things up:

```
image_list = torch.rand(2, 3, 4, 4)
```

Here, we have two images, 3 channels and where each image is of size (height and width) of 4x4.

If we only want to take the first channel from all the images:

```
red_image_list = image_list[:, 0:1, :, :]
red_image_list.shape
```

Output:

```
torch.Size([2, 1, 4, 4])
```

Note 1: `:` is a shorthand for 0:N:1 where `N` is the size of the dimension and `1` is the step.

Note 2: If we use `image_list[:, 0, :, :]` we will get a tensor of shape `(2, 4, 4)`. The only reason we use `0:1` is to keep the channel dimension, which is often required for compatibility with downstream convolutional layers that expect a 4D input.



### Max, Min

```
torch.max(range2d)
```
given,

```
range2d = torch.tensor([[[1, 2, 3],
                        [4, 5, 6]]])
```




When you call torch.max() on a tensor without specifying a dimension (dim), PyTorch flattens the tensor and finds the global maximum across all elements