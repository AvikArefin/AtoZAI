# Papers

The papers behind the models in this book, roughly in the order the ideas arrived.

## Transformers

Where it all starts.

- [Attention Is All You Need](https://arxiv.org/abs/1706.03762)
  Vaswani et al., 2017. Drops recurrence entirely and builds a sequence model from attention alone: the Transformer.

## Decoder-only models

Throw away the encoder, predict the next token, scale.

- [Generating Wikipedia by Summarizing Long Sequences](https://arxiv.org/abs/1801.10198)
  Liu et al., 2018. First to show a decoder-only Transformer can beat the encoder–decoder on long text generation.
- [Language Models are Few-Shot Learners](https://arxiv.org/abs/2005.14165)
  Brown et al., GPT-3, 2020. A 175B decoder-only model that learns new tasks from a few examples in the prompt.
- [LLaMA: Open and Efficient Foundation Language Models](https://arxiv.org/abs/2302.13971)
  Touvron et al., 2023. Smaller models trained on more tokens can match much larger ones, with open weights.

## Beyond attention

Linear-time alternatives to the quadratic attention matrix.

- [Retentive Network: A Successor to Transformer for Large Language Models](https://arxiv.org/abs/2307.08621)
  Sun et al., RetNet, 2023. One mechanism that trains in parallel like attention and runs recurrently at inference.
- [Mamba: Linear-Time Sequence Modeling with Selective State Spaces](https://arxiv.org/abs/2312.00752)
  Gu & Dao, 2023. State space models whose parameters depend on the input, so they can choose what to remember.
- [Transformers are SSMs: Generalized Models and Efficient Algorithms Through Structured State Space Duality](https://arxiv.org/abs/2405.21060)
  Dao & Gu, SSD / Mamba-2, 2024. Shows SSMs and attention are two views of the same matrix, and uses it to make Mamba faster.

## Joint Embedding Predictive Architectures

- [Self-Supervised Learning from Images with a Joint-Embedding Predictive Architecture](https://arxiv.org/abs/2301.08243)
  Assran et al., I-JEPA, 2023. Learns image features by predicting the embeddings of masked regions from the visible context, with no augmentations.
- [Revisiting Feature Prediction for Learning Visual Representations from Video](https://arxiv.org/abs/2404.08471)
  Bardes et al., V-JEPA, 2024. The same idea applied to video: predict masked spatio-temporal regions in feature space.

## Explainability

Which parts of the input did the model actually use? See [Integrated Gradients](integrated-gradients.md).

- [Axiomatic Attribution for Deep Networks](https://arxiv.org/abs/1703.01365)
  Sundararajan et al., 2017. Integrated Gradients: attribute a prediction to its inputs by integrating gradients along a path from a baseline.
