// Sidebar search, backed by the Pagefind index that `npm run build` writes to dist/pagefind/.
// The index only exists in a build, so under `astro dev` the box says so instead of searching.
const input = document.querySelector<HTMLInputElement>('#search')
const list = document.querySelector<HTMLOListElement>('.search-results')
const base = import.meta.env.BASE_URL.replace(/\/$/, '')

type Result = { url: string; excerpt: string; meta: { title?: string } }
type Pagefind = { options(o: object): Promise<void>; debouncedSearch(q: string): Promise<{ results: { data(): Promise<Result> }[] } | null> }

let pagefind: Promise<Pagefind | null> | undefined
const load = () => (pagefind ??= import(/* @vite-ignore */ `${base}/pagefind/pagefind.js`)
  .then(async (pf: Pagefind) => { await pf.options({ baseUrl: `${base}/` }); return pf })
  .catch(() => null))

function show(items: HTMLElement[]) {
  if (!list) return
  list.replaceChildren(...items)
  list.hidden = !items.length
}

function note(text: string) {
  const li = document.createElement('li')
  li.className = 'search-note'
  li.textContent = text
  return li
}

async function run() {
  const q = input?.value.trim() ?? ''
  if (!q) return show([])
  const pf = await load()
  if (!pf) return show([note('Search works on the built site (npm run build && npm run preview).')])
  const search = await pf.debouncedSearch(q)
  if (!search || input?.value.trim() !== q) return // a newer query replaced this one
  const results = await Promise.all(search.results.slice(0, 8).map(r => r.data()))
  show(results.length ? results.map(r => {
    const li = document.createElement('li')
    const a = document.createElement('a')
    a.href = r.url
    const title = document.createElement('span')
    title.className = 'search-title'
    title.textContent = (r.meta.title ?? r.url).replace(/ — AtoZ AI$/, '')
    const excerpt = document.createElement('span')
    excerpt.className = 'search-excerpt'
    excerpt.innerHTML = r.excerpt // Pagefind escapes the text and only adds <mark>
    a.append(title, excerpt)
    li.append(a)
    return li
  }) : [note(`Nothing found for “${q}”.`)])
}

input?.addEventListener('focus', load, { once: true })
input?.addEventListener('input', run)
input?.addEventListener('keydown', e => {
  if (e.key === 'Escape') { input.value = ''; show([]); input.blur() }
  if (e.key === 'Enter') list?.querySelector('a')?.click()
})

// "/" jumps to the search box from anywhere on the page, like most docs sites
addEventListener('keydown', e => {
  const t = e.target as HTMLElement
  if (e.key !== '/' || t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return
  e.preventDefault()
  input?.focus()
})
