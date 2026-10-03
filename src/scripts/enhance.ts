// Client-side upgrades for one sheet of rendered markdown. Runs for the first page and for
// every neighbouring page the reader streams in.
import { mountScenes } from '../scenes/mount'

export function enhance(root: HTMLElement) {
  mountScenes(root)

  // copy key on every code block
  root.querySelectorAll<HTMLPreElement>('.prose pre').forEach(pre => {
    if (pre.querySelector('.copy-key')) return
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'copy-key'
    btn.textContent = 'Copy'
    btn.setAttribute('aria-label', 'Copy code to clipboard')
    btn.addEventListener('click', async () => {
      const code = pre.querySelector('code')?.innerText ?? pre.innerText
      try {
        await navigator.clipboard.writeText(code.replace(/\n$/, ''))
        btn.textContent = 'Copied'; btn.dataset.state = 'ok'
      } catch {
        btn.textContent = 'Failed'; btn.dataset.state = 'err'
      }
      setTimeout(() => { btn.textContent = 'Copy'; delete btn.dataset.state }, 1500)
    })
    pre.appendChild(btn)
  })

  // ```mermaid fences render client-side, only on sheets that have them
  const blocks = root.querySelectorAll<HTMLElement>('pre[data-language="mermaid"], code.language-mermaid')
  if (blocks.length) {
    import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, theme: 'neutral', fontFamily: 'Inter Variable, sans-serif' })
      const nodes = [...blocks].map(b => {
        const pre = b.closest('pre') ?? b
        const div = document.createElement('div')
        div.className = 'mermaid'
        div.textContent = b.textContent
        pre.replaceWith(div)
        return div
      })
      mermaid.run({ nodes })
    })
  }
}
