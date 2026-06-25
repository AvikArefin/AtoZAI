# Practical Advices   
## BATCH SIZE   
Training throughput → the number of examples processed per second.   
Batch size → for DL and ML maximize the amount that the system can handle until the throughput stops increasing.    
Usually for every 2x increase in batch size should also have almost 2x increase in throughput, if that is not the case, ever, then there is a bottle neck in the training pipeline.   
Our goal for increasing batch size is to decrease the training time and nothing more. ALTHOUGH, it is technically possible to use Batch size as a trainable hyper parameters, it must NOT be used as such.    
Because any change in batch size would need changes in tuning of other hyper parameters.   
Also, Batch size would need to be readjusted for every machine, ML/DL model, optimizer, dataset.   
Hence, it is advisable to stick to one setup, and one (highest) batch size (the setup allows).   
   
   
## INITIAL MODEL CONFIGURATION   
> Find a simple, relatively fast, relatively low-resource-consumption configuration that obtains a reasonable performance.   

simple → avoiding unnecessary pipeline features   
reasonable performance → at minimum, much better than random chance on the validation set   
   
Our assumption remains that the setup is performant enough and the model / dataset is simple / short enough that we can train multiple launch candidates in parallel in the next model optimization phase.   
   
## MODEL OPTIMIZATION   
Launch → An update to the last known best configuration (model architecture + hyperparameters)   
   
1. **Pick a goal for the next round of experiments**   
2. Create a checklist to compare against   
3. Do several launch experiments in parallel   
4. Evaluate the experiments against the checklist   
5. Chose the best launch candidate if it a step toward the goal without sacrificing other non-goal at the moment but still important points   
   
   
   
   
   
