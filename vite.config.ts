import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// base = nome del repository, perché il sito è servito da GitHub Pages
// su giacomoguaresi.github.io/Space/ (doc/08-deploy.md).
export default defineConfig({
  base: '/Space/',
  // three.js da solo supera i 500 kB: sta in un pezzo a parte, caricato dopo i comandi.
  build: { chunkSizeWarningLimit: 700 },
  plugins: [
    react(),
    tailwindcss(),
    // PWA come nelle altre app di casa: installabile, con la shell dell'app in
    // cache. Lo stato del gioco sta nel database, quindi senza rete non si gioca.
    // Le icone le genera `npm run icone` da public/icona.svg.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icona.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Space',
        short_name: 'Space',
        description: 'Esplorazione spaziale in tempo reale',
        lang: 'it',
        display: 'standalone',
        // Come il fondo dell'app (src/index.css).
        theme_color: '#070b14',
        background_color: '#070b14',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
