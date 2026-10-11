# Thoughts

Source of [thoughts.vikram-gorla.com](https://thoughts.vikram-gorla.com), a personal blog by Vikram Gorla.

It is a static site built with [Astro](https://astro.build). Posts are plain Markdown files.
Every push to `main` is built and published by Cloudflare Pages.

## Adding a post

1. Create a Markdown file in one of these folders:
   - `src/content/posts/professional/`
   - `src/content/posts/personal/`

   The file name becomes the address. `src/content/posts/personal/a-walk-in-lavaux.md`
   is published at `/personal/a-walk-in-lavaux/`. Use lowercase letters, digits and hyphens.

2. Start the file with frontmatter, then write the post below it:

   ```markdown
   ---
   title: A walk in Lavaux
   date: 2026-10-11
   section: personal
   description: One or two sentences shown in lists and in the RSS feed.
   ---

   The text of the post, in Markdown.
   ```

   | Field         | Required | Notes                                                            |
   | ------------- | -------- | ---------------------------------------------------------------- |
   | `title`       | yes      | Title of the post.                                               |
   | `date`        | yes      | Publication date, `YYYY-MM-DD`.                                  |
   | `section`     | yes      | `professional` or `personal`. Should match the folder.           |
   | `description` | no       | Short summary for lists and RSS.                                 |
   | `originalUrl` | no       | For an older article republished here: the address where it first appeared. A note with a link is shown above the post. |
   | `originalAuthor` | no    | Name it was first published under, if different.                 |
   | `source`      | no       | `linkedin`, `devto` or `blogger`.                                |
   | `cover`       | no       | Cover image shown at the top of the post, e.g. `/images/my-post/cover.webp`. |
   | `coverAlt`    | no       | Short description of the cover image.                            |
   | `draft`       | no       | `true` keeps the post out of pages, lists, RSS and sitemap.         |

3. Commit and push to `main`. The site updates after the Cloudflare build finishes, usually within a minute or two.

You can also add or edit a file directly on github.com ("Add file" → "Create new file") and commit to `main`.

Images go in `public/images/<post-file-name>/` and are referenced as `![Description](/images/<post-file-name>/file.webp)`. Please keep them local rather than linking to other sites.

## Editing other pages

- About page: `src/pages/about.astro`
- Site title and section descriptions: `src/consts.ts`
- Styles: `src/styles/global.css`

## Running locally (optional)

Requires Node.js 22.12 or newer.

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # output in dist/
```

## What is included

- Home page with recent posts from both sections
- `/professional/` and `/personal/` sections
- About page
- RSS feed at `/rss.xml`, sitemap at `/sitemap-index.xml`
- No JavaScript framework, no comments, no cookies. Visitor statistics come from Cloudflare Web Analytics, which does not use cookies.
