// Finds <div data-scene="name"> in the rendered markdown and mounts the matching
// scene from src/scenes/<name>.scene.ts once it scrolls into view.
// Docs pages only play scenes. Theatre Studio (the visual editor) loads only on the dev-only
// edit page, src/pages/studio/[scene].astro, which calls mountScenes with `edit: true`.
import type { IProject } from '@theatre/core'
import type { IStudio } from '@theatre/studio'

export type SceneOptions = {
  /** Start playing on mount. False on the edit page, where the playhead belongs to Studio. */
  autoplay: boolean
}
/** A scene mounts itself into `host` and returns its Theatre project (the edit page saves it). */
export type SceneModule = { default: (host: HTMLElement, opts: SceneOptions) => IProject }

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

const scenes = import.meta.glob<SceneModule>('./*.scene.ts')

// Studio measures timeline drags (playhead, keyframes) as the change in MouseEvent.screenX/Y and treats
// it as CSS px. Chrome on a Retina Mac (measured: Chrome 155, DPR 2) reports screenX in device px, so
// every drag went 2× too far. Deriving screenX/Y from clientX/Y keeps the deltas Studio reads in CSS px.
// Only the edit page loads Studio, so this never runs on docs pages or in the built site.
function fixScreenCoords() {
  for (const [screen, client, offset] of [['screenX', 'clientX', 'screenX'], ['screenY', 'clientY', 'screenY']] as const) {
    Object.defineProperty(MouseEvent.prototype, screen, {
      configurable: true,
      get(this: MouseEvent) { return this[client] + window[offset] },
    })
  }
}

let studioReady: Promise<IStudio> | undefined
function initStudio(): Promise<IStudio | undefined> {
  if (!import.meta.env.DEV) return Promise.resolve(undefined)
  fixScreenCoords()
  studioReady ??= import('@theatre/core') // Studio requires core to be loaded first
    .then(() => import('@theatre/studio'))
    .then(mod => {
    // CommonJS interop: in dev the default export can arrive wrapped one level deeper
    const studio = 'initialize' in mod.default ? mod.default : (mod.default as unknown as typeof mod).default
    studio.initialize()
    return studio
  })
  return studioReady
}

// Dev only: a Save key in Studio's toolbar, also on ⌘S / Ctrl+S. It writes the project's current state
// (timeline and props) to src/scenes/<scene>.theatre.json through the dev server (src/scene-save.mjs).
// The scene loads that file in place of its TRACKS, so docs pages play the saved version.
const SAVE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M2.5 2.5h8.5l2.5 2.5v8.5h-11z"/><path d="M5 2.5v3.5h5.5V2.5M4.5 13.5V9.5h7v4"/></svg>'
const SAVED_KEY = 'atozai:scene-saved' // survives the reload Vite does after the file changes

/** Studio's own notifications only light up its bell, so confirm saves where they can't be missed. */
function toast(text: string, ok: boolean) {
  const el = document.createElement('div')
  el.setAttribute('role', ok ? 'status' : 'alert')
  el.textContent = text
  Object.assign(el.style, {
    position: 'fixed', top: '14px', left: '50%', transform: 'translateX(-50%)', zIndex: '2147483647',
    padding: '6px 12px', borderRadius: '6px', font: '12px/1.4 system-ui, sans-serif', color: '#ededea',
    background: ok ? '#1d3326' : '#3d1d1d', border: `1px solid ${ok ? '#2f6b47' : '#8a3a3a'}`, pointerEvents: 'none',
  })
  document.body.append(el)
  setTimeout(() => el.remove(), ok ? 2500 : 8000)
}

function addSaveTool(studio: IStudio, scene: string, project: IProject) {
  const file = `src/scenes/${scene}.theatre.json`
  const save = async () => {
    try {
      const res = await fetch(`${BASE}/__scene-save/?scene=${encodeURIComponent(scene)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(studio.createContentOfSaveFile(project.address.projectId)),
      })
      if (!res.ok) throw new Error(await res.text())
      try { sessionStorage.setItem(SAVED_KEY, String(Date.now())) } catch { /* message just won't survive the reload */ }
      toast(`Saved to ${file}`, true)
    } catch (err) {
      toast(`Not saved: ${err instanceof Error ? err.message : String(err)}`, false)
    }
  }

  studio.extend({
    id: 'atozai-save',
    toolbars: { global: set => { set([{ type: 'Icon', title: `Save to ${file} (⌘S)`, svgSource: SAVE_ICON, onClick: save }]); return () => {} } },
  }, { __experimental_reconfigure: true })
  addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save() }
  })

  // Writing the file makes Vite reload the page; repeat the confirmation if that just happened
  try {
    const at = Number(sessionStorage.getItem(SAVED_KEY))
    sessionStorage.removeItem(SAVED_KEY)
    if (Date.now() - at < 10_000) toast(`Saved to ${file}`, true)
  } catch { /* storage blocked: no repeat */ }
}

// Dev only: a key on the scene's control strip that opens its edit page.
function addEditLink(host: HTMLElement) {
  const a = document.createElement('a')
  a.className = 'key'
  a.href = `${BASE}/studio/${host.dataset.scene}/`
  a.textContent = '✎ Edit'
  a.title = 'Open this scene in Theatre Studio (dev only)'
  a.style.textDecoration = 'none' // prose links are underlined; this one is a key
  const bar = host.querySelector('.scene-bar')
  if (bar) bar.insertBefore(a, bar.querySelector('button')) // left of Restart / Play
  else host.append(a)
}

export function mountScenes(root: ParentNode = document, { edit = false } = {}) {
  const hosts = root.querySelectorAll<HTMLElement>('[data-scene]')
  if (!hosts.length) return
  const io = new IntersectionObserver(entries => {
    for (const { isIntersecting, target } of entries) {
      if (!isIntersecting) continue
      io.unobserve(target)
      const host = target as HTMLElement
      const load = scenes[`./${host.dataset.scene}.scene.ts`]
      if (!load) { host.textContent = `Unknown scene "${host.dataset.scene}"`; continue }
      const studio = edit ? initStudio().catch(err => console.error('Theatre Studio failed to load', err)) : undefined
      Promise.all([load(), studio])
        .then(([mod, studio]) => {
          const project = mod.default(host, { autoplay: !edit })
          if (import.meta.env.DEV && studio && host.dataset.scene) addSaveTool(studio, host.dataset.scene, project)
          if (import.meta.env.DEV && !edit) addEditLink(host)
        })
        .catch(err => { host.textContent = 'Animation failed to load'; console.error(err) })
    }
  }, { rootMargin: '200px' })
  hosts.forEach(h => io.observe(h))
}
