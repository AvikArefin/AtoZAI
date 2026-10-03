# **From SGD to AdamW**

## **1\. ADAM (Adaptive Moment Estimation)**

### **Core Concept & Evolution**

In 2014, Kingma & Ba proposed **Adam** by combining two powerful optimization ideas into a single update rule:

* **Momentum (First Moment):** Accumulates velocity to smooth out updates and handle noise.  
* **RMSProp (Second Moment):** Scales the learning rate based on gradient variance to handle sparse data and flat loss surfaces.  

### **Mathematical Equations**

#### **1\. Momentum Update (First Moment)**

${m}_{t}={\beta }_{1}{m}_{t-1}+(1-{\beta }_{1}){g}_{t}$

**Problem Solved:** **Noise & Zig-Zag Behavior.** In standard SGD, mini-batch updates oscillate wildly back and forth across steep ravines. Momentum acts like physical inertia—giving the optimizer memory, smoothing out mini-batch noise, turning zig-zag trajectories into straight lines, and helping parameter updates barrel through local minima.  

#### **2\. RMSProp Update (Second Moment)**

${v}_{t}={\beta }_{2}{v}_{t-1}+(1-{\beta }_{2}){g}_{t}^{2}$

**Problem Solved:** **Ill-conditioned Surfaces & Flat Beds.**  

  * On **flat loss surfaces (plateaus/saddle points)**, gradients become tiny, causing training to stall. Dividing by $\sqrt{{v}_{t}}$ increases the effective step size so the model can quickly escape the flat bed.  
  * On **steep surfaces**, gradients become huge; dividing by $\sqrt{{v}_{t}}$ scales the step size down to prevent overshooting.  

  * This ensures rare parameters learn as fast as frequent ones, creating a "level playing field".  

#### **3\. Standard Combined Update Rule**

${\theta }_{new}={\theta }_{old}-\frac{\alpha }{\sqrt{{v}_{t}}+\epsilon }\cdot {m}_{t}$

* **$\alpha$:** Learning rate.  

* **$\epsilon$:** Tiny constant (e.g., $1{0}^{-8}$) to prevent division by zero.  


### **The Bias Correction Mechanism**

#### **The Problem: "Cold Engine Start"**

Because $m$ and $v$ are initialized to $0$ at step $t=0$, early updates are severely biased toward zero:

$Att=1:{m}_{1}=0.9(0)+0.1(g)=0.1g$  
This creates a "cold engine" start where initial updates are artificially tiny.

#### **The Solution: Correction Factors**

Adam introduces dynamic correction factors:

${\hat{m}}_{t}=\frac{{m}_{t}}{1-{\beta }_{1}^{t}},{\hat{v}}_{t}=\frac{{v}_{t}}{1-{\beta }_{2}^{t}}$

* **At $t=1$:** ${\hat{m}}_{1}=\frac{{m}_{1}}{1-0.{9}^{1}}=\frac{{m}_{1}}{0.1}=10\cdot {m}_{1}$. This scales the magnitude back up to its correct scale.  
 
* **As $t\rightarrow \infty$:** Since ${\beta }_{1},{\beta }_{2}\in (0,1)$, ${\beta }^{t}\rightarrow 0$, making $(1-{\beta }^{t})\rightarrow 1$. The correction factor automatically fades away ("warm-up" built into the math).  


## **2\. AdamW: Fixing Adam's Weight Decay**

### **The Problem with Standard Adam**

While Adam became the default optimizer, empirical evidence showed that **SGD \+ Momentum** often generalized better on tasks like ImageNet.

#### **The Culprit: Incorrect L2 Regularization**

In Classical SGD, L2 Regularization (adding a loss penalty $\frac{1}{2}\lambda {w}^{2}$) and Weight Decay (directly shrinking weights by subtracting $\alpha \lambda w$) are mathematically identical:

${w}_{new}={w}_{old}-\alpha (g+\lambda w)$  
In Standard Adam, however, L2 penalty is added directly to the gradient $g$ **before** dividing by $\sqrt{{v}_{t}}$:

* **High Variance ($\sqrt{{v}_{t}}$ is large):** Weight decay gets **crushed** (divided by a large number).  

* **Low Variance ($\sqrt{{v}_{t}}$ is small):** Weight decay gets artificially **boosted**.  


**Analogy:** Weight decay should act like gravity—a constant downward force regardless of an object's current horizontal speed. Scaling weight decay based on gradient variance breaks this fundamental property.

### **The Solution: Decoupled Weight Decay (Loshchilov & Hutter, 2017\)**

AdamW fixes this flaw by decoupling weight decay from the gradient update calculation.

#### **Mechanism:**

1. **Calculate Standard Adam Step** using raw gradient ${g}_{t}$ (without adding L2 penalty to the gradient).  
2. **Apply Weight Decay Separately** directly to the parameters:  
 
$\theta =\theta -AdamStep$  

$\theta =\theta -\alpha \cdot \lambda {\theta }_{old}$

#### **Impact & Practical Takeaways**

* **Restores Weight Decay Power:** Ensures consistent regularization independent of gradient scale/variance.  

* **LLM & Transformer Essential:** Enabled stable training of foundational models like BERT, GPT, and ViT.  

* **Practical Rule:** Avoid using standard torch.optim.Adam for deep networks with weight decay; default to torch.optim.AdamW.  


## **3\. Summary & Key Takeaways**

| Feature | Intuition | Core Function |
| :---- | :---- | :---- |
| **1\. Momentum** | **Inertia**   | Gives optimizer memory; turns zig-zags into straight lines; barrels through local minima.  |
| **2\. RMSProp** | **Adaptation**   | Handles scaling; speeds up progress in flat beds; flattens steep gradients.  |
| **3\. AdamW** | **The Modern Standard**   | Combines Momentum \+ RMSProp \+ Decoupled Weight Decay to fix generalization and regularization flaws. |

