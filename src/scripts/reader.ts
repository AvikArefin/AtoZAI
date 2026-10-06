// Continuous reading: every topic is a sheet in one long document.
// Neighbouring topics are fetched and stitched in above/below as the reader nears them, and the
// URL, tab title, sidebar and "On this page" follow whichever sheet is being read.
import { enhance } from './enhance'

const desk = document.querySelector<HTMLElement>('.desk')
const tocList = document.querySelector<HTMLUListElement>('.toc ul')
const toc = document.querySelector<HTMLElement>('.toc')
const LOAD_MARGIN = 1600 // px from either end of the document at which a neighbour is fetched

type Sheet = HTMLElement & { dataset: { href: string; title: string; prev?: string; next?: string } }
const sheets = () => [...document.querySelectorAll<Sheet>('.paper')]

const loading = new Set<string>()
async function fetchSheet(href: string): Promise<Sheet | null> {
  if (loading.has(href) || document.querySelector(`.paper[data-href="${href}"]`)) return null
  loading.add(href)
  try {
    const html = await (await fetch(href)).text()
    const sheet = new DOMParser().parseFromString(html, 'text/html').querySelector<Sheet>('.paper')
    return sheet ? (document.adoptNode(sheet) as Sheet) : null
  } catch {
    return null
  } finally {
    loading.delete(href)
  }
}

async function loadNext() {
  const last = sheets().at(-1)
  if (!desk || !last?.dataset.next) return
  const sheet = await fetchSheet(last.dataset.next)
  if (!sheet || sheets().at(-1) !== last) return
  desk.append(sheet)
  track(sheet)
  enhance(sheet)
}

async function loadPrev() {
  const first = sheets()[0]
  if (!desk || !first?.dataset.prev) return
  const sheet = await fetchSheet(first.dataset.prev)
  if (!sheet || sheets()[0] !== first) return
  // inserted above: the anchor keeps the reader's line in place, now and as the sheet grows later
  settle()
  desk.prepend(sheet)
  track(sheet)
  enhance(sheet)
}

// ---------- which sheet is being read ----------
let active: Sheet | undefined
function setActive(sheet: Sheet) {
  if (sheet === active) return
  active = sheet
  if (location.pathname !== sheet.dataset.href) history.replaceState(null, '', sheet.dataset.href)
  document.title = sheet.dataset.title

  // sidebar: move the current marker and open its group
  document.querySelectorAll('.sidebar a[aria-current]').forEach(a => a.removeAttribute('aria-current'))
  const link = document.querySelector<HTMLAnchorElement>(`.sidebar a[href="${sheet.dataset.href}"]`)
  if (link) {
    link.setAttribute('aria-current', 'page')
    const group = link.closest('details')
    if (group) group.open = true
    link.scrollIntoView({ block: 'nearest' })
  }
  buildToc(sheet)
}

// ---------- "On this page", built from the sheet's own headings ----------
let tocObserver: IntersectionObserver | undefined
function headingText(h: HTMLElement) {
  const clone = h.cloneNode(true) as HTMLElement
  clone.querySelectorAll('.katex-mathml, .anchor').forEach(n => n.remove()) // keep the visible maths only
  return clone.textContent?.trim() ?? ''
}
function buildToc(sheet: Sheet) {
  if (!tocList || !toc) return
  tocObserver?.disconnect()
  const headings = [...sheet.querySelectorAll<HTMLElement>('.prose h2, .prose h3')]
  toc.hidden = headings.length < 2
  tocList.replaceChildren(...headings.map(h => {
    const li = document.createElement('li')
    li.className = h.tagName === 'H3' ? 'd3' : 'd2'
    const a = document.createElement('a')
    a.href = `#${h.id}`
    a.textContent = headingText(h)
    a.addEventListener('click', e => {
      e.preventDefault()
      jump(h, matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth')
    })
    li.append(a)
    return li
  }))
  const links = [...tocList.querySelectorAll('a')]
  tocObserver = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) {
      links.forEach(a => a.removeAttribute('aria-current'))
      links[headings.indexOf(e.target as HTMLElement)]?.setAttribute('aria-current', 'true')
    }
  }, { rootMargin: '0px 0px -70% 0px' })
  headings.forEach(h => tocObserver?.observe(h))
}

// ---------- keeping the reader's place ----------
// Sheets keep changing height after they land: fonts, KaTeX, Mermaid, scenes, sheets stitched in above.
// So the place is held as "block n of this sheet sits at y in the document", and whenever it has moved
// the page is scrolled by the same amount. Document (not screen) coordinates, so the reader's own
// scrolling is never mistaken for a shift and undone. Saved across reloads too (the dev server reloads
// on every markdown edit), as "y px from the top of the screen".
type Anchor = { sheet: Sheet; index: number; y: number }
let anchor: Anchor | undefined
// after a reload: the screen offset the anchor block should come back to, held until the page has grown
// long enough to scroll there (or the reader takes over)
let pending: number | undefined
// a sidebar / "On this page" link being scrolled to: a correction mid-way cancels a smooth scroll, so it then lands instantly
let jumping: HTMLElement | undefined
function jump(el: HTMLElement, behavior: ScrollBehavior) {
  jumping = el
  el.scrollIntoView({ behavior })
}
addEventListener('scrollend', () => { jumping = undefined })
// the reader taking over ends both
for (const type of ['wheel', 'touchstart', 'keydown', 'pointerdown'])
  addEventListener(type, () => { pending = jumping = undefined }, { passive: true })
const docTop = (el: Element) => el.getBoundingClientRect().top + scrollY
const blocks = (sheet: Sheet) => [...(sheet.querySelector('.prose')?.children ?? [])]
const blockAt = (a: Anchor) => (a.index < 0 ? a.sheet : blocks(a.sheet)[a.index] ?? a.sheet)

function capture() {
  if (pending !== undefined) return
  const line = innerHeight * 0.3
  const sheet = sheets().find(s => s.getBoundingClientRect().bottom > line) ?? sheets()[0]
  if (!sheet) return
  const index = blocks(sheet).findIndex(b => b.getBoundingClientRect().bottom > 0)
  anchor = { sheet, index, y: docTop(blockAt({ sheet, index, y: 0 })) }
  save()
}

function restore() {
  if (!anchor?.sheet.isConnected) return
  const y = docTop(blockAt(anchor))
  const shift = pending === undefined ? y - anchor.y : y - scrollY - pending
  anchor.y = y
  if (Math.abs(shift) >= 1) {
    scrollBy({ top: shift, behavior: 'instant' })
    jumping?.scrollIntoView({ behavior: 'instant' })
  }
  if (pending !== undefined && Math.abs(y - scrollY - pending) < 1) pending = undefined
}

// undo any shift not yet put back, then take the place afresh (never the other way round: that bakes the shift in)
function settle() { restore(); capture() }

const resized = new ResizeObserver(restore)
const track = (sheet: Sheet) => resized.observe(sheet)

const SAVED = 'reader:place'
function save() {
  if (!anchor) return
  const top = pending ?? anchor.y - scrollY
  try { sessionStorage.setItem(SAVED, JSON.stringify({ href: anchor.sheet.dataset.href, index: anchor.index, top })) } catch {}
}
addEventListener('pagehide', save)

// On a reload or back/forward, go back to the saved place, even if the URL still carries the #heading
// the reader first arrived by. Anything else (a fresh visit, no saved place) is left to the browser.
function resume(first: Sheet) {
  const kind = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type
  let saved: { href?: string; index?: number; top?: number } | null = null
  try { saved = JSON.parse(sessionStorage.getItem(SAVED) ?? 'null') } catch {}
  const returning = (kind === 'reload' || kind === 'back_forward') && saved?.href === first.dataset.href
  // the browser's saved scrollY means nothing once sheets are restitched, so it's off only when we restore
  history.scrollRestoration = returning ? 'manual' : 'auto'
  if (!returning) return
  anchor = { sheet: first, index: saved?.index ?? -1, y: 0 }
  pending = saved?.top ?? 0
  restore()
}

// ---------- scroll loop ----------
let ticking = false
function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    ticking = false
    settle()
    const line = innerHeight * 0.3 // the sheet under this line is the one being read
    const current = sheets().find(s => { const r = s.getBoundingClientRect(); return r.top <= line && r.bottom > line })
    if (current) setActive(current)
    const doc = document.documentElement
    if (scrollY + innerHeight > doc.scrollHeight - LOAD_MARGIN) loadNext()
    if (scrollY < LOAD_MARGIN) loadPrev()
  })
}

if (desk) {
  const first = sheets()[0]
  if (first) { track(first); enhance(first); setActive(first); resume(first) }
  addEventListener('scroll', onScroll, { passive: true })
  // fill ahead immediately; only pull in the previous sheet once the reader starts moving,
  // so landing on a page (or a #heading) never shifts what they're looking at
  loadNext()
  addEventListener('scroll', () => loadPrev(), { once: true, passive: true })

  // sidebar clicks on a sheet that's already in the document just scroll there
  document.querySelectorAll<HTMLAnchorElement>('.sidebar a').forEach(a => a.addEventListener('click', e => {
    const target = document.querySelector<HTMLElement>(`.paper[data-href="${a.getAttribute('href')}"]`)
    const toggle = document.getElementById('nav-toggle') as HTMLInputElement | null
    if (toggle) toggle.checked = false
    if (!target) return
    e.preventDefault()
    jump(target, 'smooth')
  }))
}
