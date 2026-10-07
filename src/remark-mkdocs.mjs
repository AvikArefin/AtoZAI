// Keeps the existing MkDocs-flavoured markdown in doc/ working without editing it:
//  - `[x](page.md#a)` / `[x](../folder/page.md#a)` links  -> site routes (by file name)
//  - `!!! note "Title"` + indented body -> <aside class="admonition">
import { visit } from 'unist-util-visit'
import { fromMarkdown } from 'mdast-util-from-markdown'

// Default tape text per type; a quoted title overrides it.
const TITLES = { tldr: 'TL;DR', note: 'Note', warning: 'Warning' }

const ADMONITION = /^(!!!|\?\?\?\+?)\s+(\w+)(?:\s+["“]([^"”]*)["”])?\s*$/

export default function remarkMkdocs({ base = '' } = {}) {
  return tree => {
    visit(tree, 'link', node => {
      const m = node.url.match(/^(?!\w+:\/\/)(?:[\w\-.]*\/)*([\w\-]+)\.md(#.*)?$/)
      if (!m) return
      const slug = m[1] === 'index' ? '' : `${m[1]}/`
      node.url = `${base}/${slug}${m[2] ?? ''}`
    })

    visit(tree, 'paragraph', (node, index, parent) => {
      const first = node.children[0]
      if (first?.type !== 'text') return
      const [line, ...rest] = first.value.split('\n')
      const m = line.match(ADMONITION)
      if (!m) return
      const [, , type, title] = m
      let children, remove = 1
      if (rest.length || node.children.length > 1) {
        // body directly under the marker: markdown parsed it as a lazy paragraph continuation
        const inline = [...node.children.slice(1)]
        if (rest.join('\n').trim()) inline.unshift({ type: 'text', value: rest.join('\n').trimStart() })
        children = [{ type: 'paragraph', children: inline }]
      } else {
        // body after a blank line: markdown parsed the indented text as a code block
        const body = parent.children[index + 1]
        children = body?.type === 'code' && !body.lang ? fromMarkdown(body.value).children : []
        if (children.length) remove = 2
      }
      parent.children.splice(index, remove, {
        type: 'blockquote',
        data: { hName: 'aside', hProperties: { className: ['admonition', type.toLowerCase()] } },
        children: [
          { type: 'paragraph', data: { hProperties: { className: ['admonition-title'] } },
            children: [{ type: 'text', value: title ?? TITLES[type.toLowerCase()] ?? type }] },
          ...children,
        ],
      })
    })
  }
}
