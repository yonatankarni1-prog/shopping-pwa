import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/shopping-pwa/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'רשימת קניות',
        short_name: 'קניות',
        lang: 'he',
        dir: 'rtl',
        display: 'standalone',
        // no start_url: the URL the user installs from (incl. ?invite=) is
        // used as the launch URL — required by the iOS storage-isolation fix
        // (standalone PWA storage is separate from Safari's; the app must be
        // able to re-redeem the invite from its own launch URL).
        background_color: '#f7f7f5',
        theme_color: '#1a56db',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: { navigateFallback: '/shopping-pwa/index.html' },
    }),
  ],
})
