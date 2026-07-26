import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Precaches the built app shell (JS/CSS/HTML) so the interface itself
      // loads even with zero signal. This does NOT yet make audit data
      // (checklist entries, photos) work offline — that's a separate,
      // larger step (local storage + sync-on-reconnect).
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Don't try to cache Supabase/OpenRouter API calls automatically —
        // stale cached data would be actively misleading for audit records.
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: 'AuditPro — ISO Audit Management',
        short_name: 'AuditPro',
        description: 'ISO 9001 / 14001 / 45001 audit management by SentinelPro Consultants',
        theme_color: '#16253D',
        background_color: '#F7F5F0',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  optimizeDeps: {
    // jsPDF has an optional dynamic import for dompurify (only used by its
    // .html() method, which this app doesn't call). Excluding it here stops
    // Vite's dev-server dependency scanner from erroring on that unused path.
    exclude: ['jspdf'],
  },
})
