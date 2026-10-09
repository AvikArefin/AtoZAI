# Build Your Own LLM

!!! note
    This page walks through **Andrej Karpathy**'s [microgpt](https://karpathy.github.io/2026/02/12/microgpt/) (February 12, 2026), summarised in my own words. The code and ideas are his. Read his post for the full guide, and the [microgpt.py gist](https://gist.github.com/karpathy/8627fe009c40f57531cb18360106ce95) for the code (there's also a [Colab notebook](https://colab.research.google.com/drive/1vyN5zo6rqUp_dYNbT4Yrco66zuWCZKoN?usp=sharing)).

microgpt is one file of about 200 lines of plain Python, with no dependencies, that trains a GPT and samples from it. It holds every piece of the algorithm: dataset, tokenizer, autograd, a GPT-2-style network, the Adam optimizer, the training loop and the inference loop. Everything a production LLM adds on top is about efficiency, not about the algorithm.

## Dataset

An LLM learns from a stream of text split into documents. In production, a document is a web page. In microgpt, each document is one of ~32,000 first names (`emma`, `olivia`, ...) taken from Karpathy's makemore repo.

The model learns the statistics of these documents and then generates new ones that follow the same patterns, i.e. new plausible-sounding names. A chat with ChatGPT works the same way: your prompt starts a document, and the reply is the model completing that document.

## Tokenizer

Networks take numbers, not characters. microgpt uses the simplest possible tokenizer: each unique character (`a`–`z`) gets an integer id. The ids carry no meaning; they are just separate symbols.

There is one extra special token, **BOS** (Beginning of Sequence). It marks where a document starts and ends, so `emma` becomes `[BOS, e, m, m, a, BOS]`. That gives a vocabulary of 27 tokens. Production tokenizers like BPE / tiktoken merge common character chunks into tokens instead, which gives vocabularies of around 100K.

## Autograd

Training needs the gradient of the loss with respect to every parameter: if I nudge this number up, does the loss go up or down, and by how much? microgpt builds this from scratch in a small `Value` class, the same idea as Karpathy's [micrograd](https://www.youtube.com/watch?v=VMj-3S1tku0).

- A `Value` wraps one scalar and remembers which values produced it, plus the **local gradient** of the operation that produced it.
- Each operation is a small block that knows its forward result and its local derivatives:

| Operation | Forward | Local gradient(s) |
| --- | --- | --- |
| `a + b` | $a + b$ | $1,\ 1$ |
| `a * b` | $a \cdot b$ | $b,\ a$ |
| `a ** n` | $a^n$ | $n a^{n-1}$ |
| `log(a)` | $\ln a$ | $1/a$ |
| `exp(a)` | $e^a$ | $e^a$ |
| `relu(a)` | $\max(0, a)$ | $\mathbf{1}_{a>0}$ |

- `backward()` sorts the graph topologically, sets the loss's gradient to 1 ($\partial L / \partial L = 1$), then walks backwards and applies the chain rule at each node:

$$\frac{\partial L}{\partial c} \mathrel{+}= \frac{\partial v}{\partial c}\cdot\frac{\partial L}{\partial v}$$

- It is `+=` because a value used in several places gets gradient from every path, and those contributions add up.

Example: with $a=2$, $b=3$ and $L = a\cdot b + a$, you get $\partial L/\partial a = b + 1 = 4$ and $\partial L/\partial b = a = 2$, exactly what PyTorch's `.backward()` returns. It is the same algorithm as `loss.backward()`, just on scalars instead of tensors.

## Parameters

The parameters are the model's knowledge: floats drawn from a small Gaussian at the start and tuned during training. They live in a `state_dict` of named matrices:

- `wte` is the token embedding table and `wpe` is the position embedding table.
- Each layer has the attention projections `attn_wq`, `attn_wk`, `attn_wv`, `attn_wo`, plus the MLP weights `mlp_fc1` (up to $4\times$ width) and `mlp_fc2` (back down).
- `lm_head` is the final projection to the vocabulary.

With `n_embd = 16`, `n_head = 4`, `n_layer = 1` and `block_size = 16`, that is **4,192 parameters**. GPT-2 had 1.6B, and modern LLMs have hundreds of billions.

## Architecture

The model is a function: (token, position, parameters, cached keys/values) → logits over the next token. It follows GPT-2 with three simplifications: **RMSNorm** instead of LayerNorm, **no biases**, and **ReLU** instead of GeLU.

It uses three helpers:

- **`linear`** is a matrix–vector product, one dot product per weight row.
- **`softmax`** turns logits into probabilities. It subtracts the max first so `exp` doesn't overflow.
- **`rmsnorm`** rescales a vector to unit root-mean-square, which keeps activations stable.

The forward pass for one token:

1. **Embeddings.** Look up the token's row in `wte` and the position's row in `wpe`, then add them. That encodes *what* the token is and *where* it sits. (Modern LLMs usually use relative schemes like RoPE instead.)
2. **Attention: tokens talk to each other.** Project the token into a query ("what am I looking for?"), a key ("what do I contain?") and a value ("what do I hand over if picked?"). Append the key and value to the **KV cache**. Each head takes the dot product of its query with every cached key, scales by $\sqrt{d_{head}}$, applies softmax, and takes a weighted sum of the cached values. Concatenate the heads and project through `attn_wo`. This is the *only* place where position $t$ sees positions $0..t-1$.
3. **MLP: per-token computation.** Project up to $4\times$, apply ReLU, project back down. This is local to each position, and it's where most of the "thinking" happens.
4. **Residual connections.** Both blocks add their output back to their input, so gradients flow straight through.
5. **Output.** `lm_head` projects to 27 logits. A higher logit means a more likely next token.

microgpt keeps an explicit KV cache *during training* too. That's unusual, but the cache is always there conceptually; in normal implementations it's hidden inside batched attention. Because microgpt processes one token at a time, it builds the cache by hand, and the cached keys and values stay in the graph, so gradients flow through them.

## Training loop

Each step:

1. Pick one document and wrap it in BOS on both sides.
2. Feed it in one token at a time. At each position, compute the softmax over the 27 logits and the loss $-\log p(\text{target})$ (**cross-entropy**, i.e. how surprised the model is by the true next token).
3. Average the per-position losses into one scalar, then call `loss.backward()`.
4. **Adam update.** Keep a running mean of the gradients (`m`, momentum) and of the squared gradients (`v`, a per-parameter step size), apply bias correction, decay the learning rate linearly, update each parameter, and zero its gradient.

Over 1,000 steps the loss falls from about $3.3$ ($= -\log(1/27)$, a random guess) to about $2.37$.

## Inference

Freeze the parameters and loop: start from BOS, compute the logits, divide them by a **temperature**, softmax, sample a token, feed it back in, and stop when the model emits BOS again (or hits `block_size`).

- Temperature 1.0 samples the learned distribution as-is.
- A lower temperature (microgpt uses 0.5) sharpens it and plays safer. As it approaches 0, you get greedy decoding.
- A higher temperature flattens it, giving more variety and less coherence.

The output is new "hallucinated" names like `kamon`, `karai`, `vialan` and `keylen`. The script runs in about a minute on a laptop with plain `python`. Run it yourself and try a different dataset, more steps or a bigger model.

## Building it up step by step

Karpathy suggests adding one layer at a time. Each version is a revision of his [build_microgpt.py gist](https://gist.github.com/karpathy/561ac2de12a47cc06a23691e1be9543a):

| Step | Adds |
| --- | --- |
| `train0.py` | Bigram count table: no neural net, no gradients |
| `train1.py` | MLP + manual gradients + SGD |
| `train2.py` | Autograd (`Value`) replacing the manual gradients |
| `train3.py` | Position embeddings, single-head attention, RMSNorm, residuals |
| `train4.py` | Multi-head attention + a loop over layers: the full GPT |
| `train5.py` | Adam: the final script |

## From microgpt to a real LLM

The algorithm stays the same. What changes is scale and engineering:

- **Data:** trillions of deduplicated, filtered, carefully mixed tokens instead of 32K names.
- **Tokenizer:** subword BPE with a vocabulary of ~100K.
- **Autograd:** tensors on GPUs/TPUs (PyTorch, fused kernels like FlashAttention) instead of Python scalars.
- **Architecture:** the same attention + MLP blocks on a residual stream, but far wider and deeper, with RoPE, GQA, gated activations and MoE.
- **Training:** millions of tokens per step, gradient accumulation, mixed precision, thousands of GPUs running for months.
- **Optimisation:** precise tuning of LR, warmup, decay and weight decay, guided by scaling laws (e.g. Chinchilla) and small-scale experiments run before the big one.
- **Post-training:** a pretrained model only completes documents. **SFT** keeps training on curated conversations. **RL** then trains on the model's own scored responses.
- **Inference:** batching, paged KV caches (vLLM), speculative decoding, quantisation, multi-GPU serving.

## FAQ (paraphrased)

- **Does it understand anything?** Mechanically, it's a function from tokens to a next-token distribution, nudged to make the right token more likely. Whether that counts as understanding is up to you.
- **Why does it work?** Many small parameter updates add up to a distribution that reflects the data's regularities (e.g. "qu" appears together, names rarely have three consonants in a row) without any explicit rules.
- **How is this related to ChatGPT?** It's the same predict–sample–repeat loop, scaled up and post-trained. The system prompt, your message and the reply are all one token sequence.
- **Hallucinations?** Sampling produces plausible sequences, not true ones. A made-up name like `karia` and a confidently wrong fact are the same phenomenon.
- **Why is it slow?** Pure Python processes one scalar at a time. GPUs process millions in parallel.
- **Better names?** Train longer, make the model bigger, or use more data. These are the same knobs that matter at scale.
