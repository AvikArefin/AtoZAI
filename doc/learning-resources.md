# Learning Resources   
   
1. A very good series of articles and videos of AI by hand by professor tom yeh: [https://www.byhand.ai/](https://www.byhand.ai/)    
2. [Google's Deep Learning Tuning Playbook](https://developers.google.com/machine-learning/guides/deep-learning-tuning-playbook)    
   
Read the **"Guide to hyperparameter tuning"** and **"Choosing the learning rate and optimizer"** sections. Pay close attention to their structured process for isolating batch size, finding the optimal learning rate using loss plots, and utilizing learning rate decay schedulers.   
### Weights & Biases (W&B) Gallery & Reports   
**Format:** Website (Gallery / Blog).   
**Why you need it:** W&B is the industry standard for experiment tracking. Their gallery contains real, public R&D project reports where engineers post their raw training graphs and write about how they fixed them.   
**What to look for:**  Look up their case studies on **"Debugging Exploding and Vanishing Gradients"**  or **"Optimizing Learning Rates."** Seeing real dashboard screenshots of failing curves alongside successful runs provides instant visual intuition.   
## 2. Websites for Algorithmic Intuition (Abstracted Code & Visuals)   
### Distill.pub   
- **Format:** Interactive Web Journal.   
- **Why you need it:** It is arguably the best visual AI website ever created. It completely abstracts away heavy math formulas and replaces them with interactive charts.   
- **The Core Article for you:** **"Sequence Modeling with CTC"**. Read this to master how sequence models align inputs with outputs without manual timestamps. You can physically click and drag elements on the graphs to see how the mathematical paths change dynamically.   
   
### PyTorch Official Documentation (The Quickstart)   
- **Format:** Official Web Tutorial.   
- **The Specific Page:** **"Optimization Loop"** under the *Training a Model* guide.   
- **Why you need it:** Do not read this to memorize PyTorch syntax. Read it purely to look at the short, clean code skeleton of the training loop to internalize the precise four-step algorithmic sequence: `zero\_grad()` $\rightarrow$\`backward()\` $\rightarrow$\`step()\`. This anchors your understanding of the training loop's exact order of operations.   
   
## 3. The Only Academic Papers Worth Skimming   
1. "Attention is all you need"   
   
### Skim: "Generating Sequences With Recurrent Neural Networks" (Alex Graves, 2013)   
\*\*\*Why look at it:\*\* You already know the math and code for RNNs, so \*\*skip the equations entirely\*\*. Instead, scroll straight to \*\*Section 5 (Handwriting Generation)\*\*.   
\*\*\*The Goal:\*\* Look at the visual diagrams of the coordinates and the loss plots. See how the author structures an "Experimental Results" section to prove a model simulates human style. This is exactly the kind of graph-to-insight mapping your startup wants to see.   
### Skim Any Modern "Ablation Study" Section   
\*\*\*Why look at it:\*\* Search Google Scholar for any recent sequence modeling paper and skip straight to the table labeled \*\*"Ablation Study."\*\*   
\*\*\*The Goal:\*\* An ablation study is where researchers systematically remove or change one hyperparameter or layer (e.g., turning off dropout, altering weight decay, changing optimizers) to prove its performance impact. Familiarizing yourself with how these tables look gives you a template for how to communicate your experimental data during the interview.   
## 4. Video Tutorials to Solidify the Graph-to-Code Mapping   
### Recommended YouTube Search: "PyTorch Custom Training Loop Tutorial"   
\*\*\*What to watch:\*\* Keep it brief (videos under 15 minutes from creators like \*Aladdin Persson\* or \*Patrick Loeber\*).   
\*\*\*The Goal:\*\* Watch how they visually set up the step-by-step loop structure, handle the loss computation, and step the optimizer. This visual reinforcement bridges the gap between high-level conceptual understanding and concrete structural execution.   
### Recommended YouTube Search: "Mixture Density Networks PyTorch"   
\*\*\*What to watch:\*\* Look for short, conceptual code-walkthroughs (such as old visual explainers from channels like \*Siraj Raval\* or step-by-step notebook walk-throughs).   
\*\*\*The Goal:\*\* Focus on how an ordinary model output is converted into a mixture of multiple Gaussians. Watch how the changing loss values visually correlate with the output distributions shifting from scattered noise to clean, structured paths.   
