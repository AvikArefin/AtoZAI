// Sidebar order (ported from the old mkdocs.yml). Value = markdown file name without .md.
export type NavItem = { label: string; slug: string } | { label: string; items: NavItem[] }

const page = (label: string, slug: string): NavItem => ({ label, slug })

export const nav: NavItem[] = [
  page('Home', 'index'),
  { label: 'Fundamentals', items: [
    page('Seeding', 'seeding'),
    page('Activation Functions', 'activation-functions'),
    page('Loss Functions', 'loss'),
    page('Evaluation Metrics', 'evaluation-matrics'),
    page('Feature Scaling', 'feature_scaling'),
    page('Everything about data & shape', 'shape'),
    page('Practical Tensor Multiplication', 'practical-tensor-multiplication'),
    page('CPU & GPU Bottlenecks', 'cpu_gpu_bottleneck'),
    page('Diagnosing Model Performance', 'diagnosing_model_performance'),
    page('Architecture Bugs & Tests', 'architecture-bugs-and-tests'),
    page('Data Splitting', 'data-splitting'),
    page('Hyperparameter Optimization', 'hyperparameters_and_model_optimization'),
  ] },
  { label: 'PyTorch Essentials', items: [
    page('PyTorch Fundamentals', 'pytorch_fundamentals'),
    page('Data Preparation', 'pytorch_data_preparation'),
    page('Moving Tensors to Device', 'pytorch_to_device'),
  ] },
  { label: 'Machine Learning [Non deep learning based]', items: [
    page('Linear Regression', 'linear-regression'),
    page('SVM', 'svm'),
  ] },
  { label: 'Neural Networks', items: [
    page('ANN Forward Propagation', 'ann-forward-propogation'),
    page('ANN Backpropagation', 'ann-backpropogation'),
    page('Optimizers', 'optimizer'),
    page('Normalization Layers', 'normalization'),
  ] },
  { label: 'Computer Vision', items: [
    page('Noise & Filters', 'noise-and-filters'),
    page('Reading a CNN', 'reading-a-convolutional-neural-network'),
    page('ResNet', 'resnet'),
    page('Data Augmentation', 'data_augmentation'),
  ] },
  { label: 'Sequence to Sequence', items: [
    page('RNN', 'rnn'),
    page('LSTM & GRU', 'lstm-gru'),
    page('Tokenization', 'tokenizetion'),
    page('Embeddings', 'embedding'),
    page('Positional Encoding', 'positional-encoding'),
    page('Transformers', 'transformer'),
    page('Selective State Space Models (Mamba)', 'selective-state-space-model'),
    page('LLM', 'build-your-own-llm'),
  ] },
  { label: 'Topics', items: [
    page('Multi-Task Learning (MTL)', 'multi-task-learning-mtl'),
    page('Joint Embedding Predictive Architecture (JEPA)', 'jepa'),
    page('Transfer Learning', 'transfer-learning'),
    page('Generative Adversarial Networks (GAN)', 'gan'),
  ] },
  { label: 'Explainable AI (XAI)', items: [
    page('Intro to XAI', 'explainable-ai'),
    page('Integrated Gradients', 'integrated-gradients'),
  ] },
  { label: 'Reinforcement Learning', items: [page('Intro to RL', 'reinforcement-learning')] },
  page('Miscellaneous', 'MISC'),
  { label: 'Learning Resources', items: [page('Learning Resources', 'learning-resources'), page('Papers', 'papers')] },

]
