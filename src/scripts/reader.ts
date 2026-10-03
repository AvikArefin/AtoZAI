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
  enhance(sheet)
}

async function loadPrev() {
  const first = sheets()[0]
  if (!desk || !first?.dataset.prev) return
  const sheet = await fetchSheet(first.dataset.prev)
  if (!sheet || sheets()[0] !== first) return
  // insert above without the page jumping: compensate the scroll by the added height
  const before = document.documentElement.scrollHeight
  desk.prepend(sheet)
  scrollBy(0, document.documentElement.scrollHeight - before)
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
      h.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
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

// ---------- scroll loop ----------
let ticking = false
function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    ticking = false
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
  if (first) { enhance(first); setActive(first) }
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
    target.scrollIntoView({ behavior: 'smooth' })
  }))
}
