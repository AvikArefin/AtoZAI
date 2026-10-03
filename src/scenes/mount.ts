// Finds <div data-scene="name"> in the rendered markdown and mounts the matching
// scene from src/scenes/<name>.ts once it scrolls into view.
// Theatre Studio (the visual editor) loads only in `npm run dev`.

export type SceneModule = { default: (host: HTMLElement) => void }

const scenes = import.meta.glob<SceneModule>('./*.scene.ts')

let studioReady: Promise<void> | undefined
export function initStudio() {
  if (!import.meta.env.DEV) return Promise.resolve()
  studioReady ??= import('@theatre/core') // Studio requires core to be loaded first
    .then(() => import('@theatre/studio'))
    .then(mod => {
    // CommonJS interop: in dev the default export can arrive wrapped one level deeper
    const studio = 'initialize' in mod.default ? mod.default : (mod.default as unknown as typeof mod).default
    studio.initialize()
  })
  return studioReady
}

export function mountScenes(root: ParentNode = document) {
  const hosts = root.querySelectorAll<HTMLElement>('[data-scene]')
  if (!hosts.length) return
  const io = new IntersectionObserver(entries => {
    for (const { isIntersecting, target } of entries) {
      if (!isIntersecting) continue
      io.unobserve(target)
      const host = target as HTMLElement
      const load = scenes[`./${host.dataset.scene}.scene.ts`]
      if (!load) { host.textContent = `Unknown scene "${host.dataset.scene}"`; continue }
      Promise.all([load(), initStudio().catch(err => console.error('Theatre Studio failed to load', err))])
        .then(([mod]) => mod.default(host))
        .catch(err => { host.textContent = 'Animation failed to load'; console.error(err) })
    }
  }, { rootMargin: '200px' })
  hosts.forEach(h => io.observe(h))
}
