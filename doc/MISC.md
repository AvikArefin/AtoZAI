## Base model vs Instruction Model

there is 
1. base model 2. instruction model

base models are not finetuned to inject / play "roles". i.e. "agent" "user" "system", hence they work as autocomplete
give code in, get the rest of the code compeleted.

instruction models are finetuned for these task, hence they can be asked questions

---

## Perplexity

perplexity = exponent of standard cross-entropy loss (of a output sequence of an llm)

Low Perplexity means the model is very confident in its predictions.

Perplexity is the average number of plausible next tokens the model is guessing between.

A perplexity of 10 means that, on average, the model is as confused as if it were rolling a 10-sided die to pick the next word.
A perplexity of 1 (the perfect score) means the model is 100% certain of the next word every time.

It is not strictly necessary to monitor, but it gives a much more intuitive intuition about the model's performance.

---

## Decoder Only Model vs Encoder-Decoder Model

### Encoder-Decoder Model:
+ Small-to-Medium Parameter Models (Edge Computing)

+ Where the output needs to be in very specific format. (such as JSON format)

+ Purpose-built translation models often still rely on encoder-decoders (like Meta's NLLB - No Language Left Behind)

+ Vision and Multimodal Tasks: Example dedicated video encoder is used.

+ Audio and Speech Processing (e.g., OpenAI's Whisper)


### Decoder Only Model:

- chatty, this might or might not what you want.

+ Zero-Shot and Few-Shot "In-Context" Learning
A massive turning point was the release of GPT-3. Historically, if you wanted an encoder-decoder model to summarize text, you had to explicitly fine-tune it on a dataset of summaries. GPT-3 proved that a sufficiently large decoder-only model could perform tasks it was never explicitly trained to do, just by reading a prompt (In-Context Learning)

+ Simplicity and a Unified Objective

+ KV Caching: When generating text word-by-word, decoder models use a trick called KV (Key-Value) caching to remember past context without recomputing it

+ FlashAttention & Systems Optimization: Because decoder-only models became so popular, the entire hardware and software ecosystem (NVIDIA kernels, vLLM, FlashAttention) optimized aggressively for them


---

Various File Formats

Old format: .ckpt

.pt: by PyTorch: default for saving, sufferes from same issues as .ckpt for using pickle

.pte: by PyTorch: optimized for edge inference

.tflite: by Google: optimized for edge inference

.litert-lm: by Google: Large Language Models (LLMs) on the edge.

Safetensors: .safetensors: secure, with lazy-loading, zero-copy reading file format.

gguf: .gguf: highly compressed, quantized ideal for inference on CPUs and edge devices

----

Autoregressive model

Autoregressive modeling is a machine learning technique most commonly used for time series analysis and forecasting that uses one or more values from previous time steps in a time series to create a regression.

---

### Seperate dataset for training and validation. Data should not change / rotate for validation set.

When training a model, the validation and the training dataset should be different. The training dataset can have augmented dataset init, but the validation dataset should not, otherwise, it would be hard to compare, one model to another or less epoch with more epoch, since we don't know if the model genuinely improved or just got lucky.


---

### use .to(device) after loading data using DataLoader, Not before.

Transfer Overhead: The GPU is incredibly fast at math, but sending data from RAM to the GPU is slow. If you move data in __getitem__, you are sending 1 tiny item to the GPU at a time. By waiting until the DataLoader has stitched 32 items together into a massive batch, you can transfer them all to the GPU in one single, highly-optimized bulk transfer.

---

