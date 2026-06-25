# Transfer Learning   
Take a pretrained and train only a small part of it to fit your need.   
We can say there are two parts of a CNN.   
Featureiser and Classifier    
We usually only need to train the classifier   
   
```
from torchvision.models import alexnet
from torchvision.models.alexnet import AlexNet_Weights
```
```
def freeze_model(model: nn.Module) -> nn.Module:
    for param in model.parameters():
        param.requires_grad = False
    return model
```
```
alex = alexnet(weights=AlexNet_Weights.IMAGENET1K_V1)
freeze_model(alex)
alex.classifier[6] = nn.Linear(4096, 3) # Unfreeze the last layer

```
```
# To check how the original dataset was normalized
print(AlexNet_Weights.IMAGENET1K_V1.transforms())

# ImageClassification(
#    crop_size=[224]
#    resize_size=[256]
#    mean=[0.485, 0.456, 0.406]
#    std=[0.229, 0.224, 0.225]
#    interpolation=InterpolationMode.BILINEAR
#)
```
If we want to use our custom data we must normalize the same we the original data was normalized.   
```
normalize = transforms.Normalize(mean=[0.485, 0.456, 0.406],
std=[0.229, 0.224, 0.225])
```
   
If our input size (28x28) or color channels (grayscale; channel=1) are lower than the pre-trained model (256x256, channel=1), we would be creating an inefficient model that is comparatively larger and would take significantly more computational power.   
