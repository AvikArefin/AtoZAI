# Datasets & DataLoader

## Responsibilities

1. Deterministic Transformation (in `__init__` if the data fits in memory, otherwise in `__getitem__`) e.g. normalization, using statistics computed on the **training set only**. See: [feature scaling](../fundamentals/feature_scaling.md)
2. Non-deterministic Transformation / Data Augmentation (in `__getitem__`, training set only)
3. Shuffling `DataLoader`
4. Parallel data loading `DataLoader`
5. Batch loading `DataLoader`
6. Padding / merging samples into a batch (in `collate_fn`)

## The Core Concept

To create your own custom dataset, you must subclass `torch.utils.data.Dataset` and implement three key methods:

1. `__init__(self)`: Initializes the dataset.
2. `__len__(self) -> int`: Returns the total number of samples.
3. `__getitem__(self, idx: int)`: Retrieves a single sample (and its label) at a specific index. with a possible return type of `tuple[Tensor, Tensor]`

`collate_fn`: Used at the last step to merge samples into a batch, specifically useful when samples have different lengths and need padding (`batch_size` > 1).

## Implementing a Custom Dataset

### `__init__(self, ...)`
The initialization method is run once when instantiating the Dataset object. Here, you typically:
- Load the dataset into memory if it's small enough, or load metadata/file paths if the dataset is large.
- Define `deterministic` transformations or preprocessing steps that should be applied to the data.
- Set up categorical mappings (e.g., mapping string labels to integer indices).


### `__getitem__(self, idx)`
It is called when you index the dataset (`dataset[idx]`). It should:
- Fetch the data sample corresponding to the integer index `idx`.
- Apply any necessary `non-deterministic` transformations (rotation, skew, randomize etc.) for data augmentation purpose
- Return the sample and its label (usually converted to PyTorch Tensors).


### `collate` 
Collate is specifically useful when we use batch operations. After the dataloader gets a batch of data (say 32) using `__getitem__` one by one, it passes the whole thing as a list to the collate function. This is why the input of the collate function is a `list` of whatever `__getitem__` returns.

The default collate stacks samples into tensors, which fails if samples have different shapes. In that case pass your own `collate_fn` to the `DataLoader`. Pad to the longest sample **in the batch** (not a global max length), and build the mask here, since only the collate function sees the whole batch.

```python
from torch import Tensor
from torch.nn.utils.rnn import pad_sequence

def collate_fn(batch: list[tuple[Tensor, int]]) -> tuple[Tensor, Tensor, Tensor]:
    xs: list[Tensor] = []
    labels: list[int] = []
    lengths: list[int] = []
    for x, label in batch:
        xs.append(x)                 # one variable-length sequence
        labels.append(label)
        lengths.append(len(x))       # real length before padding

    x_batch = pad_sequence(xs, batch_first=True)    # (B, T_max), zero-padded
    return x_batch, torch.tensor(lengths), torch.tensor(labels)

DataLoader(dataset, batch_size=32, collate_fn=collate_fn)
```

### Example Implementation

```python
import torch
from torch.utils.data import Dataset

class CustomTextDataset(Dataset):
    def __init__(self, data_list, labels_list, transform=None):
        """
        Initialize the dataset with data and labels.
        """
        self.data = data_list
        self.labels = labels_list
        self.transform = transform
        
        # Example mapping of text labels to integers
        self.classes = sorted(set(self.labels))  # sorted: set order can change between runs
        self.class_to_idx = {cls_name: i for i, cls_name in enumerate(self.classes)}
        
    def __len__(self):
        """
        Return the total number of samples.
        """
        return len(self.data)
        
    def __getitem__(self, idx):
        """
        Retrieve a sample and its label at the specified index.
        Apply `non-deterministic` transformations (rotation, skew, randomize etc.) for data augmentation purpose
        """
        # Fetch the raw data
        text = self.data[idx]
        label = self.labels[idx]
        
        # Apply transformation
        if self.transform:
            text = self.transform(text)
            
        # Preprocess (e.g., map string label to integer)
        label_idx = self.class_to_idx[label]
        
        # Return as a tuple (or dictionary)
        return text, label_idx
```

## Integration with DataLoader

While a `Dataset` retrieves only one sample at a time, `DataLoader` class wraps `Dataset` to handle batching, shuffling, parallel data loading, multiprocessing.

```python
from torch.utils.data import DataLoader

# 1. Instantiate your custom dataset
my_dataset = CustomTextDataset(
    data_list=["hello", "world", "test"], 
    labels_list=["greet", "greet", "other"]
)

# 2. Wrap it in a DataLoader
my_dataloader = DataLoader(
    dataset=my_dataset, 
    batch_size=2,      # Process 2 samples at a time
    shuffle=True,      # Shuffle data every epoch
    num_workers=0      # Number of subprocesses to use for data loading
)
# Use shuffle=False for validation/test loaders.
# Don't call .to(device) inside __getitem__; move each batch in the training loop.

# 3. Iterate through the dataloader in your training loop
for batch_idx, (batch_data, batch_labels) in enumerate(my_dataloader):
    print(f"Batch {batch_idx}:")
    print(f"Data: {batch_data}")
    print(f"Labels: {batch_labels}")
```

## Getting a subset of a dataset: Non-randomized

Useful when you want to do the very initial overfitting test of a pipeline. See: [ML performance](../fundamentals/diagnosing_model_performance.md)

```python
torch.utils.data.Subset(datast, range(10))
```