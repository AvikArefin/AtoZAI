# AtoZ AI

An open book of notes on machine learning, deep learning and reinforcement learning, written by
[Avik Arefin](https://github.com/AvikArefin) while learning the field. It covers the basics (seeding,
loss functions, tensor shapes) and goes up to transformers, Mamba and JEPA. It also covers the practical
side of training: diagnosing a model, finding bugs, tuning.

**Read it at [avikarefin.github.io/AtoZAI](https://avikarefin.github.io/AtoZAI/).**

The book is written by someone still learning, for others doing the same. Every chapter aims at the
concepts rather than a framework; PyTorch shows up where code helps. Some sections are still drafts and
will be filled in over time.

Some figures aren't images. They are animations drawn live by code with [Theatre.js](https://www.theatrejs.com),
which you can play, pause and restart on the page. Examples: how feature scaling reshapes the loss surface,
and why bad initialisation gives a hockey-stick loss curve.

## What's inside

About 50 pages, in the sidebar order:

| Section | Topics |
|---|---|
| Fundamentals | seeding, activation and loss functions, metrics, feature scaling, tensor shapes, einsum, CPU/GPU bottlenecks, inductive bias, equivariance, diagnosing models, architecture and data bugs, data splitting, hyperparameters, a recipe for training neural networks, the deep learning tuning playbook |
| Coding Essentials | PyTorch basics, data preparation, devices, train vs eval mode, einops |
| Classical Machine Learning | linear regression, SVM |
| Neural Networks | forward propagation, backpropagation, optimizers, normalization layers |
| Machine Vision | noise and filters, reading a CNN, ResNet, data augmentation |
| Sequence to Sequence | RNN, LSTM and GRU, online handwriting recognition, tokenization, embeddings, positional encoding, transformers, Mamba, building your own LLM |
| Topics | multi-task learning, JEPA, transfer learning, equivariant networks, GANs |
| Explainable AI | intro to XAI, integrated gradients |
| Reinforcement Learning | intro to RL |
| Resources | learning resources, papers |

Reading features: pages run on as one long document (the next and previous pages load as you scroll),
<kbd>/</kbd> opens full-text search, maths is rendered with KaTeX, and code blocks have a copy button.

## Run it locally

Needs Node 22 or newer (CI uses 22).

```bash
npm install
npm run dev      # http://localhost:4321/AtoZAI/
npm run check    # type check
npm run build    # static site in dist/, plus the search index
npm run preview  # serve dist/ (search only works on a build, not in dev)
```

Pushing to `main` builds and deploys to GitHub Pages (`.github/workflows/deploy.yml`).

## How it's built

[Astro](https://astro.build) static site. Markdown pages, KaTeX, Mermaid, [Pagefind](https://pagefind.app) search
and Theatre.js scenes.

```
doc/                  the book: one markdown file per page, grouped into topic folders
src/nav.ts            sidebar order
src/scenes/           animations: <name>.scene.ts, plus <name>.theatre.json for saved Studio edits
src/remark-mkdocs.mjs MkDocs-style links and callouts
src/scripts/          continuous reading, search, page enhancements (scenes, Mermaid, copy keys)
src/pages/studio/     dev-only page for editing a scene in Theatre Studio
.agents/skills/       step-by-step guide (and template) for writing a new scene
```

## Writing a page

- Add a markdown file under `doc/<section>/`. No frontmatter; the first `#` heading is the title.
- The URL is the bare file name, whatever folder it's in: `doc/machine-learning/svm.md` → `/AtoZAI/svm/`.
  So file names must be unique across folders, and moving a file never breaks its link.
- Add it to the sidebar in `src/nav.ts`.
- Link to other pages by file name: `[SVM](svm.md)` or `[MSE](../fundamentals/loss.md#mse)`.
- Maths: `$…$` and `$$…$$`. Diagrams: ```` ```mermaid ```` fences.
- Python snippets use [uv](https://docs.astral.sh/uv/) (`uv add`, `uv run`), never `pip install`.
- Callouts (label-maker tape). `tldr`, `note` and `warning` come with tape text; a quoted title replaces it:
  ```md
  !!! tldr
      Scale features before distance-based models.

  !!! warning "Data leakage"
      Fit the scaler on the training split only.
  ```
  `!!! reader` and `!!! author` render as chat bubbles instead (see the home page's Q&A).

## Adding an animation

1. Create `src/scenes/<name>.scene.ts`. Start from `.agents/skills/theatre-scene/template.scene.ts` and
   follow that folder's `SKILL.md`; `src/scenes/feature-scaling.scene.ts` is a finished example.
   Every position, size and colour is a Theatre prop, and all timing is keyframes on a `Timeline` object.
2. Place it in a page, on its own line:
   ```html
   <div class="scene" data-scene="<name>"></div>
   ```
   It loads only when scrolled into view.
3. Run `npm run dev` and click **✎ Edit** on the scene's control strip, or open
   `http://localhost:4321/AtoZAI/studio/<name>/`. That page shows the scene alone with Theatre Studio and
   doesn't autoplay (Space plays and pauses).
   - Layout and colours: the props panel.
   - Timing: select the `Timeline` object in the outline, then drag keyframes in the timeline at the bottom.
     Box-select to move a whole section, or delete keyframes to cut a step.
4. Studio keeps edits in the browser until you click **Save** (⌘S / Ctrl+S). That writes
   `src/scenes/<name>.theatre.json`, which the docs pages and the built site play. Commit it to ship the edits.

Studio is dev-only: docs pages never load it, and the built site doesn't include it.

AI coding agents: read `AGENT.md` first.

## License

© 2026 Avik Arefin. All rights reserved. The content is for human reading and personal study.
Scraping, embedding or ingesting it for AI training, RAG or generative AI is not allowed without a prior
written license from the author. See the [home page](https://avikarefin.github.io/AtoZAI/) for the full notice.
