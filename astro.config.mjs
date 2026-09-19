import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Webflow Cloud sets base/mount path at build time; do not set `base` here.
export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
});
