This project is an Astro static site with Theatre.js animations. See README.md.

Rules:
- Content is markdown in `doc/`; don't rewrite existing pages unless asked. Sidebar is `src/nav.ts`.
- Animations are `src/scenes/<name>.scene.ts`, embedded with `<div class="scene" data-scene="<name>"></div>`.
  Follow `feature-scaling.scene.ts`: every position, size and colour is a Theatre prop (Layout / Style),
  and all timing is keyframes on the `Timeline` object (declared in `TRACKS`, built by `src/scenes/timeline.ts`),
  so it can be retimed by dragging keyframes in Studio's timeline.
- Keep `@theatre/studio` dev-only. It loads only on the edit page `src/pages/studio/[scene].astro`
  (`/AtoZAI/studio/<name>/`, not built), via `mountScenes(..., { edit: true })`; docs pages never load it.
- Before finishing: `npm run check && npm run build`.
- Avoid `any` types.
- Python: always use `uv`. Add packages with `uv add <pkg>`, run code with `uv run`. Never use `pip install`,
  including in code snippets on the doc pages.
- To create or edit an animation, follow `.agents/skills/theatre-scene/SKILL.md` exactly.
