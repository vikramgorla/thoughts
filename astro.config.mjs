// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import rehypeLinksImages from './src/lib/rehype-links-images.mjs';

export default defineConfig({
  site: 'https://thoughts.vikram-gorla.com',
  integrations: [sitemap()],
  markdown: {
    rehypePlugins: [rehypeLinksImages],
  },
});
