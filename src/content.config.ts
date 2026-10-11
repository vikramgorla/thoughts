import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// One collection for all posts. Files live in
// src/content/posts/professional/ and src/content/posts/personal/.
// The `section` field in the frontmatter decides where a post appears.
const posts = defineCollection({
  loader: glob({
    base: './src/content/posts',
    pattern: '{professional,personal}/**/*.md',
  }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    section: z.enum(['professional', 'personal']),
    description: z.string().optional(),
    // For older articles republished here: link to where it first appeared.
    originalUrl: z.url().optional(),
    // Optional cover image shown at the top of the post, e.g. /images/<post>/cover.webp
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    // Name the article was first published under, e.g. on LinkedIn or dev.to.
    originalAuthor: z.string().optional(),
    // Where it was first published.
    source: z.enum(['linkedin', 'devto', 'blogger']).optional(),
    // Set `draft: true` to keep a post out of the built site
    // (no page, not in lists, RSS or sitemap).
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { posts };
