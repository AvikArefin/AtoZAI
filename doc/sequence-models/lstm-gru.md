# LSTM & GRU

A plain RNN rewrites its whole hidden state at every step. Over long sequences early information fades, and during training the gradients shrink toward zero (the *vanishing gradient* problem). LSTM and GRU fix this with **gates**: small sigmoid layers that output values between 0 and 1 and act like dials, deciding how much information to keep, drop, or let through.

Notation:
- $x_t$: input at step $t$
- $h_{t-1}$: previous hidden state. $[h_{t-1}, x_t]$ means the two joined into one vector
- $\sigma$: sigmoid, squashes to 0 to 1 (0 = block, 1 = pass)
- $\tanh$: squashes to -1 to 1
- $\odot$: element-wise multiply

## LSTM: Long Short Term Memory

LSTM carries two states: a **cell state** $c_t$ (long-term memory) and a **hidden state** $h_t$ (this step's output). Three gates control them.

$$
\begin{aligned}
f_t &= \sigma(W_f [h_{t-1}, x_t] + b_f) && \text{forget gate} \\
i_t &= \sigma(W_i [h_{t-1}, x_t] + b_i) && \text{input gate} \\
\tilde{c}_t &= \tanh(W_c [h_{t-1}, x_t] + b_c) && \text{candidate memory} \\
c_t &= f_t \odot c_{t-1} + i_t \odot \tilde{c}_t && \text{update memory} \\
o_t &= \sigma(W_o [h_{t-1}, x_t] + b_o) && \text{output gate} \\
h_t &= o_t \odot \tanh(c_t) && \text{output}
\end{aligned}
$$

How it works:
1. **Forget gate** decides what to erase from memory.
2. **Input gate** and **candidate** decide what new information to write.
3. **Memory update**: keep part of the old, add part of the new.
4. **Output gate** decides which part of the memory to reveal as $h_t$.

Why it works: the memory update is mostly *addition*, not repeated squashing. When $f_t \approx 1$, memory (and its gradient) rides through many steps almost unchanged, like a conveyor belt.

## GRU: Gated Recurrent Unit

GRU is a slimmed-down LSTM. It drops the separate cell state and uses only two gates.

$$
\begin{aligned}
z_t &= \sigma(W_z [h_{t-1}, x_t] + b_z) && \text{update gate} \\
r_t &= \sigma(W_r [h_{t-1}, x_t] + b_r) && \text{reset gate} \\
\tilde{h}_t &= \tanh(W_h [r_t \odot h_{t-1}, x_t] + b_h) && \text{candidate state} \\
h_t &= (1 - z_t) \odot h_{t-1} + z_t \odot \tilde{h}_t && \text{blend old and new}
\end{aligned}
$$

How it works:
1. **Reset gate** decides how much of the past to use when proposing a new state. Near 0 means "ignore the past, start fresh".
2. **Candidate** is that proposed new state.
3. **Update gate** blends old and new. One dial does the job of LSTM's forget and input gates: whatever share of new it lets in ($z_t$), it removes from the old ($1 - z_t$).

*PyTorch's `nn.GRU` swaps $z_t$ and $1 - z_t$. Same idea, just flipped.*

## Why GRU over LSTM?

|               | LSTM                      | GRU                       |
| ------------- | ------------------------- | ------------------------- |
| Gates         | 3 (forget, input, output) | 2 (update, reset)         |
| States        | $c_t$ and $h_t$           | $h_t$ only                |
| Weight blocks | 4                         | 3 (~25% fewer parameters) |

- **Faster and lighter**: fewer weights to train, store, and run.
- **Less overfitting**: fewer parameters, so it often does better on small datasets.
- **Same ballpark accuracy**: on many tasks (speech, music, text) GRU matches LSTM.
- **Simpler**: one state and two gates are easier to reason about.

It's not a strict win, though. On very long sequences or with lots of data, LSTM's separate memory and extra gate can give it the edge. A good default: start with GRU, switch to LSTM if it underperforms.
