import { execFileSync } from 'node:child_process'
import { getCollection } from 'astro:content'
import { nav, type NavItem } from '../nav'

// Recently edited pages, newest first, read by the landing page at avikarefin.github.io.
// Dates come from git history, so the deploy checkout must be a full clone (fetch-depth: 0).
const LIMIT = 12

const labels = new Map<string, { title: string; section?: string }>()
const walk = (items: NavItem[], section?: string) => {
  for (const item of items) {
    if ('slug' in item) labels.set(item.slug, { title: item.label, section })
    else walk(item.items, item.label)
  }
}
walk(nav)

// One pass over the log: the first time a file shows up is its latest commit.
function lastEdits() {
  const edits = new Map<string, { date: string; note: string }>()
  const log = execFileSync('git', ['log', '--format=%x00%aI%x09%s', '--name-only', '--', 'doc'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  for (const block of log.split('\0').slice(1)) {
    const [head, ...files] = block.split('\n')
    const tab = head.indexOf('\t')
    const edit = { date: head.slice(0, tab), note: head.slice(tab + 1) }
    for (const file of files) {
      if (!file.endsWith('.md')) continue
      const slug = file.replace(/^.*\//, '').replace(/\.md$/, '')
      if (!edits.has(slug)) edits.set(slug, edit)
    }
  }
  return edits
}

export async function GET() {
  const edits = lastEdits()
  const docs = await getCollection('docs')
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const updates = docs
    .filter(entry => entry.id !== 'index' && edits.has(entry.id))
    .map(entry => {
      const label = labels.get(entry.id)
      const h1 = entry.body?.match(/^#\s+(.+)$/m)?.[1]
      return {
        title: label?.title ?? h1 ?? entry.id,
        section: label?.section ?? null,
        url: `${base}/${entry.id}/`,
        ...edits.get(entry.id)!,
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, LIMIT)
  return new Response(JSON.stringify({ updates }), { headers: { 'Content-Type': 'application/json' } })
}
