# Equivariant Neural Networks

!!! TLDR
    An equivariant network has a symmetry built into its layers, so it holds exactly, for every input, without being learned. The math that describes symmetries is **group theory**. Start with [Equivariance & Invariance](../fundamentals/equivariance-and-invariance.md) if the words are new.

Watch: Equivariant Neural Networks (DeepFindr)

1. [Part 1/3: Introduction](https://www.youtube.com/watch?v=2bP_KuBrXSc)
2. [Part 2/3: Generalized CNNs](https://www.youtube.com/watch?v=r0xyxe31QgU)
3. [Part 3/3: Transformers and GNNs](https://www.youtube.com/watch?v=RBKERHaiEKY)

## Groups: the language of symmetry

A **group** is a set of transformations that:

1. can be combined: rotate 90°, then 90° again = rotate 180°,
2. include "do nothing" (the identity),
3. can all be undone (every transformation has an inverse),
4. combine associatively: `(a·b)·c = a·(b·c)`.

| Group | Transformations | Typical data |
|---|---|---|
| ℤ² (translations) | Shifts of an image | Images |
| C₄ | Rotations by 0°, 90°, 180°, 270° | Images with no "up" |
| p4 | Shifts + 90° rotations | Images with no "up" |
| SO(2) / SO(3) | All rotations in 2D / 3D | Point clouds |
| E(3) | 3D rotations, reflections and translations | Molecules, proteins, physics |
| Sₙ | All orderings of n items | Sets, graphs |

## The formal definition

For a transformation `g` from the group, a function `f` is:

- **invariant** if `f(g·x) = f(x)`,
- **equivariant** if `f(g·x) = g·f(x)`: transforming the input and then applying `f` gives the same result as applying `f` and then transforming the output.

Invariance is the special case where `g` acts on the output by doing nothing. Equivariant layers compose: if every layer is equivariant, the whole network is. So you build each layer to be equivariant, and add one invariant layer (a pooling) at the end if the output should be invariant.

## Group CNNs (G-CNNs)

A normal convolution slides a filter over every **position**. A G-CNN slides it over every position **and** every rotation:

1. **Lifting layer.** Correlate the image with the filter in each of 4 rotations. The output gets a new axis: `(C, H, W)` → `(C, 4, H, W)`.
2. **Group convolutions.** Later layers convolve over position and the rotation axis together. Rotating the input shifts features along the rotation axis (and rotates them in space) instead of changing them.
3. **Pooling over rotations** (max or mean over the 4) gives a rotation-invariant output.

The same filter weights are reused for every rotation, so the network gets rotation for free in parameters but pays roughly 4× in compute. **Steerable CNNs** extend this to all angles (SO(2)) by building filters from rotation-friendly basis functions; the [escnn](https://github.com/QUVA-Lab/escnn) library implements them.

## GNNs and Transformers: permutations

A graph has no natural node order, so the output must not depend on how the nodes are numbered.

- **GNNs** are permutation-equivariant: each node sums (or averages) the messages from its neighbours, and a sum doesn't care about order.
- **Transformers without positional encoding** are permutation-equivariant too: attention treats the input as a set. That's exactly why sequences need [positional encoding](../sequence-models/positional-encoding.md): it deliberately breaks the symmetry, because word order matters.

## E(3)-equivariant networks: 3D

For molecules, rotating or moving the whole molecule must not change its energy (invariant) and must rotate its forces (equivariant).

- **EGNN** updates node features using only distances between atoms (which don't change under rotation) and updates positions along relative vectors `xᵢ − xⱼ` (which rotate with the molecule). Simple, and exactly E(3)-equivariant.
- **Tensor-field networks / SE(3)-Transformer / e3nn** carry features as vectors and higher-order tensors that rotate with the input. More expressive, more math (spherical harmonics, irreducible representations).

## When to use one

| Use it when | Skip it when |
|---|---|
| The symmetry holds exactly (physics, chemistry, microscopy) | The symmetry is only approximate, or false (digits, upright photos) |
| Data is scarce or expensive | You have enough data to just augment |
| You need the guarantee for every input, not just on average | Speed and simple code matter more |

## Sources

- [Group Equivariant Convolutional Networks — Cohen & Welling, 2016](https://arxiv.org/abs/1602.07576)
- [E(n) Equivariant Graph Neural Networks — Satorras et al., 2021](https://arxiv.org/abs/2102.09844)
- [Geometric Deep Learning — Bronstein et al., 2021](https://arxiv.org/abs/2104.13478)
- [escnn](https://github.com/QUVA-Lab/escnn) · [e3nn](https://e3nn.org)
