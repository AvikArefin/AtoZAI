import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'

// Markdown lives in /doc, grouped into topic folders. No frontmatter required.
// The id (and URL) is the bare file name, so moving a file between folders doesn't change its URL;
// file names must therefore stay unique across folders.
export const collections = {
  docs: defineCollection({ loader: glob({ pattern: '**/*.md', base: './doc', generateId: ({ entry }) => entry.replace(/^.*\//, '').replace(/\.md$/, '') }) }),
}
