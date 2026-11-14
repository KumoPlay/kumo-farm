import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import pkg from './package.json' with { type: 'json' };

// The game is served from https://kumoplay.github.io/kumo-farm/,
// so every asset path must start with /kumo-farm/.
const base = '/kumo-farm/';

export default defineConfig({
  base,
  plugins: [
    preact(),
    // Makes the game installable ("Add to Home Screen") and playable offline after the first visit.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false, // src/platform/pwa.ts registers it, so the game can offer an "Update" button
      includeAssets: ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Kumo Farm',
        short_name: 'Kumo Farm',
        description: 'A cozy little farm on a floating cloud island. A KumoPlay game.',
        lang: 'en',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#FDE3EC',
        theme_color: '#FDE3EC',
        categories: ['games'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything the game needs, so it works with no connection. Only the Latin font file is kept.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}', 'assets/nunito-latin-wght-normal-*.woff2'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    target: 'es2020',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
