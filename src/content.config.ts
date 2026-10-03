import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'

// Markdown lives in /doc, untouched. No frontmatter required.
export const collections = {
  docs: defineCollection({ loader: glob({ pattern: '**/*.md', base: './doc', generateId: ({ entry }) => entry.replace(/\.md$/, '') }) }),
}
