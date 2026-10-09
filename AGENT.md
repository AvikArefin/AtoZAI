This project is an Astro static site with Theatre.js animations. See README.md.

Rules:
- Content is markdown in `doc/`; don't rewrite existing pages unless asked. Sidebar is `src/nav.ts`.
- Animations are `src/scenes/<name>.scene.ts`, embedded with `<div class="scene" data-scene="<name>"></div>`.
  Follow `feature-scaling.scene.ts`: every position, size, colour and timing value is a Theatre prop
  (Layout / Style / Beats objects); animation is driven from `sheet.sequence.position`.
- Keep `@theatre/studio` dev-only (it is loaded from `src/scenes/mount.ts`).
- Before finishing: `npm run check && npm run build`.
- Avoid `any` types.
- Python: always use `uv`. Add packages with `uv add <pkg>`, run code with `uv run`. Never use `pip install`,
  including in code snippets on the doc pages.
- To create or edit an animation, follow `.agents/skills/theatre-scene/SKILL.md` exactly.
