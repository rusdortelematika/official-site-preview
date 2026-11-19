// @ts-check
import { defineConfig } from 'astro/config';

import preact from '@astrojs/preact';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: process.env.PAGES_SITE_URL || undefined,
  base: `${(process.env.PAGES_BASE_PATH || '').replace(/\/$/, '')}/`,
  trailingSlash: 'ignore',
  integrations: [
    preact(),
    {
      name: 'rdt:dev-404',
      hooks: {
        'astro:config:setup': ({ command, injectRoute }) => {
          if (command === 'dev') {
            // Astro Dev looks up the fallback by its exact /404 route.
            injectRoute({
              pattern: '/404',
              entrypoint: './src/pages/[...locale]/404.astro',
            });
          }
        },
      },
    },
  ],

  vite: {
    plugins: [tailwindcss()]
  }
});