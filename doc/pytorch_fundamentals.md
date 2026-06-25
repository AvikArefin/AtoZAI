## Adding dimentionality to a tensor:

```python
torch.tensor([[1, 2, 3],
        [4, 5, 6]])
```

#### 1. Unsqueeze(0)

*Wrap the entire tensor in a list* 
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

```
tensor([[[1, 2, 3]],
        [[4, 5, 6]]])
```

