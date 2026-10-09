// Dev-only endpoint behind the Save key on the scene edit page (src/scenes/mount.ts).
// POST <base>/__scene-save/?scene=<name> with Studio's project state (JSON); it is written to
// src/scenes/<name>.theatre.json, which the scene loads in place of its TRACKS.
// `apply: 'serve'` keeps it out of `npm run build` entirely.
import { existsSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const scenesDir = new URL('./scenes/', import.meta.url)

export default function sceneSave({ base }) {
  return {
    name: 'atozai-scene-save',
    apply: 'serve',
    configureServer(server) {
      const handle = (req, res, next) => {
        // Match on originalUrl: Astro strips the base from req.url before later middlewares run.
        const url = new URL(req.originalUrl ?? req.url ?? '', 'http://dev')
        if (url.pathname.replace(/\/$/, '') !== `${base}/__scene-save`) return next()
        const reply = (status, body) => { res.statusCode = status; res.setHeader('content-type', 'text/plain'); res.end(body) }
        if (req.method !== 'POST') return reply(405, 'POST only')
        // Only this dev site may write files: JSON bodies (cross-site pages can't send them without a
        // CORS preflight, which we never answer) from the same origin.
        if (!String(req.headers['content-type']).startsWith('application/json')) return reply(415, 'Send application/json')
        const origin = req.headers.origin
        if (origin && new URL(origin).host !== req.headers.host) return reply(403, 'Cross-origin save refused')

        const scene = url.searchParams.get('scene') ?? ''
        if (!/^[a-z0-9-]+$/.test(scene) || !existsSync(new URL(`${scene}.scene.ts`, scenesDir))) {
          return reply(400, `No scene "${scene}" in src/scenes/`)
        }

        let body = ''
        req.setEncoding('utf8')
        req.on('data', chunk => { body += chunk })
        req.on('end', () => {
          let state
          try { state = JSON.parse(body) } catch { return reply(400, 'Body is not JSON') }
          if (typeof state?.definitionVersion !== 'string' || typeof state?.sheetsById !== 'object') {
            return reply(400, 'Body is not a Theatre project state')
          }
          const file = `${scene}.theatre.json`
          writeFileSync(fileURLToPath(new URL(file, scenesDir)), JSON.stringify(state, null, 2) + '\n')
          reply(200, `src/scenes/${file}`)
        })
      }
      // Runs after Astro's own front middlewares (security, trailing slash, base), so the URL must end in '/'.
      server.middlewares.use(handle)
    },
  }
}
