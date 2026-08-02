# Multi-Task Learning (MTL)   
### Model Design   
- **Backbone**:   
    - Use a **shared feature extractor** (e.g., ResNet, EfficientNet) to learn generic features across datasets.   
    - Fine-tune the backbone to adapt to medical imaging tasks (e.g., transfer learning using pre-trained models on ImageNet or medical datasets like CheXpert).   
- **Task-Specific Heads**:   
    - Add dataset-specific output layers for classification, multi-label classification, or ordinal regression.   
    - Design each head to handle its corresponding dataset’s requirements (e.g., softmax for multi-class, sigmoid for multi-label, ordinal encoding for ordinal regression).   
- **Shared + Dataset-Specific Features**:   
    - Implement shared layers for generalized feature extraction and dataset-specific layers for modality-specific learning.   
 --- 
   
```python
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
import torchvision.transforms as transforms
import torchvision.models as models

# Example Datasets (Replace with actual dataset loading logic)
class DummyDataset(Dataset):
    def __init__(self, num_samples, num_classes, img_size=(3, 224, 224)):
        self.data = torch.randn(num_samples, *img_size)
        self.labels = torch.randint(0, num_classes, (num_samples,))
    
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        return self.data[idx], self.labels[idx]

# Define datasets
pathmnist_dataset = DummyDataset(100, 9)  # PathMNIST: 9 classes
pneumonia_dataset = DummyDataset(100, 2)  # PneumoniaMNIST: 2 classes

# DataLoaders
path_loader = DataLoader(pathmnist_dataset, batch_size=16, shuffle=True)
pneumonia_loader = DataLoader(pneumonia_dataset, batch_size=16, shuffle=True)

# Multi-Task Learning Model
class MultiTaskModel(nn.Module):
    def __init__(self):
        super(MultiTaskModel, self).__init__()
        # Shared feature extractor (e.g., ResNet18 backbone)
        self.shared_backbone = models.resnet18(pretrained=True)
        self.shared_backbone.fc = nn.Identity()  # Remove the classification head
        
        # Task-specific heads
        self.path_head = nn.Sequential(
            nn.Linear(512, 128),
            nn.ReLU(),
            nn.Linear(128, 9)  # PathMNIST: 9 classes
        )
        self.pneumonia_head = nn.Sequential(
            nn.Linear(512, 128),
            nn.ReLU(),
            nn.Linear(128, 2)  # PneumoniaMNIST: 2 classes
        )
    
    def forward(self, x):
        shared_features = self.shared_backbone(x)
        path_output = self.path_head(shared_features)
        pneumonia_output = self.pneumonia_head(shared_features)
        return path_output, pneumonia_output

# Initialize model, loss functions, and optimizer
model = MultiTaskModel()
criterion_path = nn.CrossEntropyLoss()
criterion_pneumonia = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=1e-4)

# Training loop
def train_epoch(model, loaders, optimizer, criteria, device='cpu'):
    model.train()
    total_loss = 0
    
    # Combine DataLoaders
    loaders = {"path": iter(loaders["path"]), "pneumonia": iter(loaders["pneumonia"])}
    max_batches = min(len(loaders["path"]), len(loaders["pneumonia"]))
    
    for _ in range(max_batches):
        # Load batches from both datasets
        try:
            path_images, path_labels = next(loaders["path"])
        except StopIteration:
            loaders["path"] = iter(loaders["path"])
            path_images, path_labels = next(loaders["path"])
        
        try:
            pneumonia_images, pneumonia_labels = next(loaders["pneumonia"])
        except StopIteration:
            loaders["pneumonia"] = iter(loaders["pneumonia"])
            pneumonia_images, pneumonia_labels = next(loaders["pneumonia"])
        
        # Combine into one batch (for simplicity, not merging datasets here)
        path_images, path_labels = path_images.to(device), path_labels.to(device)
        pneumonia_images, pneumonia_labels = pneumonia_images.to(device), pneumonia_labels.to(device)
        
        # Forward pass
        path_outputs, pneumonia_outputs = model(path_images)
        
        # Compute losses
        loss_path = criteria["path"](path_outputs, path_labels)
        loss_pneumonia = criteria["pneumonia"](pneumonia_outputs, pneumonia_labels)
        loss = loss_path + loss_pneumonia  # Combine losses
        
        # Backward pass and optimize
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        
        total_loss += loss.item()
    
    return total_loss / max_batches

# Training
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = model.to(device)

for epoch in range(10):
    loss = train_epoch(
        model,
        loaders={"path": path_loader, "pneumonia": pneumonia_loader},
        optimizer=optimizer,
        criteria={"path": criterion_path, "pneumonia": criterion_pneumonia},
        device=device,
    )
    print(f"Epoch {epoch+1}, Loss: {loss:.4f}")

```
