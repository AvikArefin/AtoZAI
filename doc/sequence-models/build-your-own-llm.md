# Build Your Own LLM   
   
## 1. Clone nanoGPT   
Do not write code from scratch. Clone Andrej Karpathy’s nanoGPT repository. It contains a flawless, pre-built training loop, data loader, and model harness (~300 lines of clean PyTorch).   
## 2. Treat the Block as a Plug-and-Play LEGO   
Isolate your custom idea inside a single PyTorch class inheriting from nn.Module. Do not modify the rest of the network architecture. Ensure it strictly accepts and outputs this exact tensor shape:   
[Batch Size, Sequence Length, Embedding Dimension]   
## 3. Run the 3-Gate Sanity Check   
Before training, pass a random tensor through your custom block to verify:   
- **Shape:** Output shape matches input shape exactly.   
- **Gradients:** Run .backward() on the output to ensure param.grad is populated and contains no NaN values.   
- **Causality:** Change only the *last* token of your input. Ensure the outputs for *earlier* tokens do not change. If they change, future information is leaking.   
   
## 4. Test Convergence on 1 Sentence   
Do not use a large dataset. Feed your model a single sentence.   
- **Success Criteria:** The training loss must drop to virtually zero within a few dozen steps.   
- If it cannot overfit a single sentence, your math or code implementation is fundamentally broken.   
