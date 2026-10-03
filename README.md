# AtoZ AI

Notes on ML / DL / RL with live, code-driven animations.
Built with [Astro](https://astro.build) and animated with [Theatre.js](https://www.theatrejs.com).

## Run

```bash
npm install
npm run dev      # http://localhost:4321/AtoZAI/ (includes the Theatre.js Studio editor)
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

1. Create `src/scenes/<name>.scene.ts` exporting `default function mount(host: HTMLElement)`.
   `src/scenes/feature-scaling.scene.ts` is the reference.
2. Drop it into any markdown page:
   ```html
   <div class="scene" data-scene="<name>"></div>
   ```
   It loads only when scrolled into view.
3. Run `npm run dev`. Studio appears on the page; tweak layout, colours and timing with its panel.
   Studio keeps edits in the browser. To ship them, export the project JSON from Studio and save it as
   `src/scenes/<name>.theatre.json`.
