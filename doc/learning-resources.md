# Learning Resources   

1. [byhand.ai](https://www.byhand.ai/)    
1. [Google's Deep Learning Tuning Playbook](https://developers.google.com/machine-learning/guides/deep-learning-tuning-playbook)    
1. [ARENA Education](https://learn.arena.education/)
1. [Interpretable Machine Learning Book](https://christophm.github.io/interpretable-ml-book/)
1. [Distill.pub](https://distill.pub/)
1. [Wandb Reports](https://wandb.ai/wandb_fc/articles/reportlist/)
1. [Dive into Deep Learning](https://d2l.ai/index.html)

Example: 

[Debugging Neural Networks with PyTorch and W&B Using Gradients and Visualizations](https://wandb.ai/wandb_fc/articles/reports/Debugging-Neural-Networks-with-PyTorch-and-W-B-Using-Gradients-and-Visualizations--Vmlldzo1NDQxNTA5)
 
[Sequence Modeling with CTC](https://distill.pub/2017/ctc/)

   
## Academic Papers 
1. "Attention Is All You Need" 
1. "Generating Sequences With Recurrent Neural Networks" (Alex Graves, 2013)   
    - **Why look at it:** You already know the math and code for RNNs, so **skip the equations entirely**. Instead, scroll straight to **Section 5 (Handwriting Generation)**.   
    - **The Goal:** Look at the visual diagrams of the coordinates and the loss plots. See how the author structures an "Experimental Results" section to prove a model simulates human style. This is exactly the kind of graph-to-insight mapping your startup wants to see.   

1. Skim Any Modern "Ablation Study" Section   
    - **Why look at it:** Search Google Scholar for any recent sequence modeling paper and skip straight to the table labeled **"Ablation Study."**   
    - **The Goal:** An ablation study is where researchers systematically remove or change one hyperparameter or layer (e.g., turning off dropout, altering weight decay, changing optimizers) to prove its performance impact. Familiarizing yourself with how these tables look gives you a template for how to communicate your experimental data during the interview.   

## Graph-to-Code Mapping   
### "PyTorch Custom Training Loop Tutorial"   
- **What to watch:** Keep it brief (videos under 15 minutes from creators like *Aladdin Persson* or *Patrick Loeber*).   
- **The Goal:** Watch how they visually set up the step-by-step loop structure, handle the loss computation, and step the optimizer. This visual reinforcement bridges the gap between high-level conceptual understanding and concrete structural execution.   

### "Mixture Density Networks PyTorch"   
- **What to watch:** Look for short, conceptual code-walkthroughs (such as old visual explainers from channels like *Siraj Raval* or step-by-step notebook walk-throughs).   
- **The Goal:** Focus on how an ordinary model output is converted into a mixture of multiple Gaussians. Watch how the changing loss values visually correlate with the output distributions shifting from scattered noise to clean, structured paths.   
