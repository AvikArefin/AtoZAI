# Equivariance & Invariance

!!! TLDR
    **Invariant**: transform the input, the output stays the same. **Equivariant**: transform the input, the output transforms the same way.

A cat moved 10 px left is still a cat. This is called `translational symmetry`. Building a symmetry into the model is a kind of [inductive bias](inductive-bias.md).

## Invariant vs equivariant

- **Invariant**: transform the input, and the output stays the **same**. Rotate a dog → still the label "dog".
- **Equivariant**: transform the input, and the output transforms the **same way**. In a rotation-equivariant network, rotate a dog image → the feature map rotates too, in a predictable way. (The model knows: it's a dog, just rotated by x degrees.)

Which one you want depends on the output. A class label should be invariant. A segmentation mask, a bounding box or a force vector should be equivariant: it has to move with the object.

Usually the layers are equivariant (they keep track of *where* things are), and a final pooling step makes the output invariant.

## CNNs: shift yes, rotation no

A convolution is shift-equivariant by construction: it applies the same filter everywhere, so a shifted input gives a shifted feature map. Global pooling at the end makes the class prediction (roughly) shift-invariant.

Nothing in a convolution knows about rotation. A filter that learned "upright ear" doesn't fire on a sideways ear. So a CNN trained on upright dogs does worse on an upside-down dog, and it has to see rotated dogs to learn them.

!!! note "Only roughly shift-invariant"
    Strided convolutions and pooling skip pixels, so a 1-pixel shift can change the output. This is why the shift test in [Architecture Bugs & Tests](architecture-bugs-and-tests.md#the-rest-of-the-catalogue) shifts by a multiple of the stride.

## Getting a symmetry the model doesn't have

| Fix | How | Trade-off |
|---|---|---|
| [Data augmentation](../machine-vision/data_augmentation.md) | Show the model randomly rotated images during training | Simple; the model *learns* the symmetry, approximately, and spends capacity on it |
| [Equivariant network](../topics/equivariant-networks.md) | Build the symmetry into the layers | Exact and more data-efficient, but harder to build. Hurts if the symmetry only holds approximately |

Only add a symmetry that really holds. A "6" rotated 180° is a "9", so a digit classifier should **not** be rotation-invariant.

## Sources

- [Making Convolutional Networks Shift-Invariant Again — Richard Zhang](https://richzhang.github.io/antialiased-cnns/)
