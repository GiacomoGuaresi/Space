// Le icone della PWA, generate da public/icona.svg con `npm run icone`, come
// nelle altre app di casa. Il risultato sta in public/ ed è versionato: la build
// non le rigenera.
import { defineConfig } from '@vite-pwa/assets-generator/config'

// Il fondo spazio dell'icona: riempie il margine delle versioni che Android e
// iOS ritagliano a modo loro, così gli angoli arrotondati non si vedono.
const sfondo = '#070b14'

export default defineConfig({
  preset: {
    transparent: { sizes: [64, 192, 512], favicons: [[48, 'favicon.ico']] },
    maskable: { sizes: [512], padding: 0.3, resizeOptions: { background: sfondo } },
    apple: { sizes: [180], padding: 0.3, resizeOptions: { background: sfondo } },
  },
  images: ['public/icona.svg'],
})
