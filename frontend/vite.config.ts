import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// In dev, /api is proxied to the backend so the browser talks same-origin.
// Docker dev sets VITE_PROXY_TARGET=http://backend:8000; bare-metal defaults to localhost.
const proxyTarget = process.env.VITE_PROXY_TARGET ?? 'http://localhost:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg', 'icon-maskable.svg'],
      manifest: {
        name: 'Eos — Habit Tracker',
        short_name: 'Eos',
        description: 'Show up daily, keep your light alive.',
        theme_color: '#0b0b0d',
        background_color: '#0b0b0d',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      devOptions: { enabled: true },
    }),
  ],
  server: {
    host: true, // listen on 0.0.0.0 so the Docker container is reachable
    port: 5173,
    proxy: {
      '/api': { target: proxyTarget, changeOrigin: true },
    },
  },
})
