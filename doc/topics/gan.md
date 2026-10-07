# GAN

General Adversarial Network is a type of system to make generator model through discrimination.

In a GAN there are two models. One model is a generator and the other model is a discriminator.
On the first half of the training, the discriminator is trained to detect from real and fake data apart. 
These first part is supervised learning. On the second half, generator is given an input from which it genrates output.
the discriminator then inferences on it. If it is able to detect the fake, the generator model is updated, if the generator model can not detect, the discriminator model is updated.
 