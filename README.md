# AtoZ AI

Notes on ML / DL / RL with live, code-driven animations.
Built with [Astro](https://astro.build) and animated with [Theatre.js](https://www.theatrejs.com).

## Run

```bash
npm install
npm run dev      # http://localhost:4321/AtoZAI/ (edit animations at /AtoZAI/studio/<name>/)
npm run build    # static site in dist/ (Studio is not shipped)
npm run check    # type check
```

Pushing to `main` deploys to GitHub Pages (`.github/workflows/deploy.yml`).

## Writing content

- Pages are plain markdown in `doc/`. The file name becomes the URL (`doc/svm.md` → `/AtoZAI/svm/`).
- Sidebar order lives in `src/nav.ts`.
- Supported: `$…$` / `$$…$$` maths (KaTeX), ```` ```mermaid ```` diagrams, links to other pages as `other-page.md`.
- Callouts (label-maker tape). Types: `tldr`, `note`, `warning`. A quoted title replaces the tape text.
  ```md
  !!! tldr
      Scale features before distance-based models.

  !!! warning "Data leakage"
      Fit the scaler on the training split only.
  ```

## Animations (Theatre.js)

1. Create `src/scenes/<name>.scene.ts` exporting `default function mount(host, opts)` that returns its Theatre project.
   `src/scenes/feature-scaling.scene.ts` is the reference.
2. Drop it into any markdown page:
   ```html
   <div class="scene" data-scene="<name>"></div>
   ```
   It loads only when scrolled into view.
3. Run `npm run dev` and click **✎ Edit** on the scene's control strip (dev only), or open
   `http://localhost:4321/AtoZAI/studio/<name>/`: the scene on its own, with Studio,
   not autoplaying (Space plays and pauses). Docs pages never load Studio. Tweak layout and colours in its props panel. For timing,
   select the `Timeline` object in the outline: its keyframes appear in the timeline at the bottom, where you
   drag them to retime, box-select several to move a whole section, or delete them to cut a step.
   Studio keeps edits in the browser until you click **Save** in its toolbar (or press ⌘S / Ctrl+S). That writes
   `src/scenes/<name>.theatre.json`, which the docs pages and the built site play. Commit that file to ship the edits.
