---
name: theatre-scene
description: Create or edit a Theatre.js explainer animation (a "scene") for an AtoZ AI doc page. Use when asked to animate, visualise, or add a scene/animation/figure to a page in doc/.
---

# Theatre.js scene for AtoZ AI

You are adding a live, code-drawn animation to a markdown page. A human will later fine-tune
positions, colours and timing **visually** in Theatre Studio, so your job is to produce a scene
that works and exposes the right knobs. Not a perfect final look.

Follow the steps **in order**. Do not skip the checks.

## 0. Know the four files

| File | Role |
|---|---|
| `.agents/skills/theatre-scene/template.scene.ts` | Starting point. Copy it; never start from scratch. |
| `src/scenes/<name>.scene.ts` | Your scene. One file per animation. |
| `doc/<page>.md` | Gets ONE line that places the scene. |
| `src/scenes/feature-scaling.scene.ts` | A finished, working example. Read it when unsure. |

Do **not** edit `src/scenes/mount.ts`, `src/layouts/*`, `astro.config.mjs` or `package.json`.

## 1. Plan before code (write this plan in your reply, 6 lines max)

1. Read the target `doc/<page>.md`. Pick the ONE idea that is hard to get from text alone.
2. Split it into 2–3 slides: **show the problem → show the mechanism → show the consequence.**
3. For each slide write: title, short subtitle, one-sentence caption, and what moves.
4. Decide the data (seeded random or a formula). No external data, no fetch.

## 2. Create the files

1. `cp .agents/skills/theatre-scene/template.scene.ts src/scenes/<name>.scene.ts`
   `<name>` is kebab-case, e.g. `gradient-descent`. The file MUST end in `.scene.ts`.
2. Replace every `__PLACEHOLDER__` in the copy. Search for `__` afterwards; none may remain.
3. In `doc/<page>.md`, add this line on its own, with a blank line before and after,
   right after the paragraph the animation illustrates:
   ```html
   <div class="scene" data-scene="<name>"></div>
   ```
   `data-scene` must equal the file name without `.scene.ts`. Change nothing else in the markdown.

## 3. Rules for the scene code (these are where models usually break things)

**Structure: keep the template's 10 numbered sections and their order.**

- **Coordinates:** the stage is always `viewBox 0 0 1280 720`. Keep text ≥ 48px from every edge.
  The title sits top-left, the caption bottom-left; keep visuals between y=150 and y=640.
- **Create elements once** in section 8. In `render()` only call `set(el, {...})` and assign `textContent`.
  Never `createElement`, `appendChild`, `innerHTML` or `remove()` inside `render()`.
  If something appears only on one slide, create it up front and animate its `opacity`.
- **Animate only with `seg(p, start, end)`.** `p` is story time in seconds. Example:
  `const k = seg(p, B.slide2, B.slide2 + 2)` then `lerp(from, to, k)`.
  Do not use `setTimeout`, `setInterval`, CSS animations, GSAP, or `Date.now()`.
- **Slide timing comes from `beats`**, never hard-coded seconds: write `B.slide2 + 1.5`, not `9.5`.
- **Every visual a human may want to move or recolour becomes a Theatre prop** in `Layout` / `Style` / `Beats`.
  Positions use `pos(x, y)`; colours use `t.rgba`; sizes use `t.number(v, { range: [min, max] })`.
  Prop names: lowerCamelCase, no spaces.
- **Never change `SEQ = 10`.** Theatre's sequence is 10 s long; we stretch it to `D` seconds via
  `p = position * (D / SEQ)` and `play({ rate: SEQ / D })`. Change `D` for a longer story.
- **Do not create keyframes in code** and do not call `sequence.attachAudio`, `studio.*` or `getProject` twice.
  Do not import `@theatre/studio` (mount.ts handles it, dev-only).
- **Project id** is `'AtoZAI · <Topic>'`, unique per scene and at most 32 characters.
- **Data is deterministic:** use the seeded `rnd()`, never `Math.random()`.
- **Types:** no `any`. Theatre values are already typed from the props.

## 4. Visual language (match the site)

- Screen background is near-black (`#0d0d0d`, provided by CSS). Draw on it with:
  - text `#ededea`, secondary text and labels `#8d8c86`, gridlines and axes `#3a3a37`, faint guides `#2e2e2b`
  - **one** loud colour, signal orange (`style.before`), and **one** secondary, cobalt (`style.after`).
    Orange = the problem or the "before" state; cobalt = the fix or the "after" state. No other hues.
- Fonts: titles `Space Grotesk Variable`, small uppercase labels `Departure Mono` (use the `LABEL` attrs),
  body text default (Inter), maths and code `JetBrains Mono Variable`.
- Strokes 1.5–2.5px. No gradients, no drop shadows, no glow. Calm motion: 0.8–2.5 s per transition.
- Stagger groups with `seg(p, start + i * 0.02, end + i * 0.02)` for a polished feel.
- Maths as text: use Unicode (`x′ = (x − min) / (max − min)`), not LaTeX.

## 5. Verify (all must pass before you say you're done)

```bash
grep -n "__" src/scenes/<name>.scene.ts                     # must print nothing
grep -n 'data-scene="<name>"' doc/<page>.md                 # must print exactly one line
npm run check                                               # must say 0 errors
npm run build                                               # must finish with "Complete!"
```

Then run `npm run dev` and tell the human to open `http://localhost:4321/AtoZAI/<page>/`.
You cannot see the browser yourself, so **say so** and ask them to confirm it plays. Do not claim it looks right.

## 6. When it fails

| Symptom | Cause / fix |
|---|---|
| Box shows `Unknown scene "x"` | File name ≠ `data-scene` value, or file is not `src/scenes/x.scene.ts`. |
| Box shows `Animation failed to load` | Check the browser console / `npx astro dev logs`. If it says *Failed to fetch dynamically imported module*, the dev server's dep cache is stale: restart `npm run dev`, reload. |
| Blank screen, no controls | An exception at mount time. Usually a typo in a prop path (`L.plot.x` vs `L.plott.x`). Run `npm run check`. |
| Elements flicker or multiply | You created elements inside `render()`. Move them to section 8. |
| Animation ends too early / too late | Adjust `D` and the `Beats` defaults. Don't touch `SEQ`. |
| Studio panel missing | Only appears with `npm run dev`, never in the built site. That's correct. |
| A Studio tweak doesn't persist | Studio stores edits in browser storage. To ship them: Studio → project → Export → save as `src/scenes/<name>.theatre.json`. |

## 7. Editing an existing scene

Read the whole scene file first. Make the smallest change that does what was asked; keep the
section structure. If a change moves or recolours something, change the **default value of its Theatre prop**,
not a hard-coded number in `render()`.
