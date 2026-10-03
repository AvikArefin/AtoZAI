# Practical Advices   
## BATCH SIZE     
> Maximize (for DL & ML) until the throughput (examples processed per second) stops increasing.

Start with batch size = 2. Then, try to increase it by 2x. For every 2x increase in batch size, there should be almost 2x increase in throughput. 

If that is not the case, even the first time (batch size = 4), then there is a bottle neck in the training pipeline.

At a cetain point, the increasing the batch size would not get a 2x improvement. We stop at this point. We have reached the hardware saturation limit.

NOTE: increasing the batch size WILL reduce the update rate (for a dataset of size 100 and batch size=1, it will get updated 100 times per epoch, for a batch size of 10, it will only get updated 10 times), hence for a higher batch size the rate at which the loss decreases will go down.

### Learning Rate
Tune the Learning Rate. Do a few quick 10-20 epoch runs with different learning rates (e.g., 0.001, 0.005, 0.01). Pick the highest learning rate that makes the loss go down steadily without aggressively jumping up and down (which means it's overshooting).

## EPOCH NUMBER
To solve the issue we encounter after increasing batch size, can be solved partially by increasing epoch number.
Train until Validation Loss stops improving (Early Stopping). You don't just set epochs to infinity. You should track your loss on a separate "validation dataset" (data the model isn't training on). When the training loss keeps going down but the validation loss starts going up, your model is overfitting (memorizing the training data). That is exactly when you stop training.

   
## INITIAL MODEL CONFIGURATION   
> Find a simple, relatively fast, relatively low-resource-consumption architecture model configuration that obtains a reasonable performance.   

simple → avoiding unnecessary pipeline features   
reasonable performance → at minimum, much better than random chance on the validation set   
   
Why are we doing this? → Our assumption remains that the setup is performant enough and the model / dataset is simple / short enough that we can train multiple launch candidates in parallel in the next model optimization phase. Otherwise the training will not scale well and will not be cost-effective.
   
## MODEL OPTIMIZATION   
Launch → An update to the last known best configuration (model architecture + hyperparameters)   
   
1. **Pick a goal for the next round of experiments**   
2. Create a checklist to compare against   
3. Do several launch experiments in parallel   
4. Evaluate the experiments against the checklist   
5. Chose the best launch candidate if it a step toward the goal without sacrificing other non-goal at the moment but still important points   
   

   
   
   
