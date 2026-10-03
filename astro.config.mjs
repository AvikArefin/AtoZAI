import { defineConfig } from 'astro/config'
import { unified } from '@astrojs/markdown-remark'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkMkdocs from './src/remark-mkdocs.mjs'

const base = '/AtoZAI'

export default defineConfig({
  site: 'https://avikarefin.github.io',
  base,
  trailingSlash: 'always',
  vite: {
    // pre-bundle lazily imported deps at startup; otherwise Vite re-optimizes mid-session and
    // already-open pages fail with "Failed to fetch dynamically imported module"
    optimizeDeps: { include: ['@theatre/core', '@theatre/studio', 'mermaid'] },
  },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath, [remarkMkdocs, { base }]],
      rehypePlugins: [rehypeKatex],
    }),
    syntaxHighlight: { type: 'shiki', excludeLangs: ['mermaid', 'math'] },
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } },
  },
})
