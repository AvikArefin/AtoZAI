# Understanding PyTorch Datasets & DataLoader

## Responsibilities

1. Deterministic Transformation (in `__init__`) See: [feature scaling](feature_scaling.md)
2. Non-deterministic Transformation / Data Augmentation (in `__getitem__`)
3. Shuffling `DataLoader`
4. Parallel data loading `DataLoader`
5. Batch loading `DataLoader`

## The Core Concept

To create your own custom dataset, you must subclass `torch.utils.data.Dataset` and implement three key methods:

1. `__init__`: Initializes the dataset.
2. `__len__`: Returns the total number of samples.
3. `__getitem__`: Retrieves a single sample (and its label) at a specific index.

## Implementing a Custom Dataset

### 1. `__init__(self, ...)`
The initialization method is run once when instantiating the Dataset object. Here, you typically:
- Load the dataset into memory if it's small enough, or load metadata/file paths if the dataset is large.
- Define `deterministic` transformations or preprocessing steps that should be applied to the data.
- Set up categorical mappings (e.g., mapping string labels to integer indices).

### 2. `__len__(self)`
Returns the total number of samples in your dataset. It allows the Python `len()` function to work on your dataset object (`len(dataset)`), which is necessary for batching and tracking epochs during training.

### 3. `__getitem__(self, idx)`
It is called when you index the dataset (`dataset[idx]`). It should:
- Fetch the data sample corresponding to the integer index `idx`.
- Apply any necessary `non-deterministic` transformations (rotation, skew, randomize etc.) for data augmentation purpose
- Return the sample and its label (usually converted to PyTorch Tensors).

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
        self.classes = list(set(self.labels))
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

# 3. Iterate through the dataloader in your training loop
for batch_idx, (batch_data, batch_labels) in enumerate(my_dataloader):
    print(f"Batch {batch_idx}:")
    print(f"Data: {batch_data}")
    print(f"Labels: {batch_labels}")
```
