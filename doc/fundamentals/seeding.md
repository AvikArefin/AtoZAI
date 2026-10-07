# Seeding

!!! tldr
    Always set **one fixed seed** across the whole project.

A random seeds control initialized weights, data shuffling, dropout, augmentation rate etc. If it does not remain constant throughout the experiment, then any recorded variation in performance or efficiency during experimenting with model architecture / hyperparameter tuning could actually be due to the random seed variation.

```python
import random
import numpy as np
import torch

SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)                                                      
g = torch.Generator().manual_seed(SEED)
```

- Wait, why do we need to seed so many places?

the libraries do not share their SEED, hence we have to initialization explicitly.

- But why `torch.manual_seed(SEED) AND torch.Generator().manual_seed(SEED)`?

Before that we have to know how this works. When we create a seed, it actually creates a series of numbers

like `[0.81, 0.14, 0.92, 0.47, 0.33, ...]`, if we use a code snippet that "eats" i.e uses 
one of them then the next one "eats" the next value. hence the your order of code will 
determine what each system got inialized with even if you have the same global seed.

so, 

```python
model = nn.Linear(55, 10)

# Load a dataset
dataset = BrushDataset()
dataloader = DataLoader(dataset=dataset, batch_size=1, shuffle=True)
```

and 


```python
# Load a dataset
dataset = BrushDataset()
dataloader = DataLoader(dataset=dataset, batch_size=1, shuffle=True)

model = nn.Linear(55, 10)
```

will give different shuffled values.

To fix this we can inject a 'generator' into the dataloader so that regardless how the code shuffles the Dataloader has it's independent random number that is fixed.

```python
dataloader = DataLoader(dataset=dataset, batch_size=1, shuffle=True, generator=g)
```