import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const supabaseUrl = env.VITE_SUPABASE_URL || ''
  // Extrae solo el hostname para el pattern de Workbox
  const supabaseHost = supabaseUrl.replace(/^https?:\/\//, '')

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'icon.svg', 'icon-192.png', 'icon-512.png'],
        manifest: false,
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'google-fonts-stylesheets' },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              urlPattern: /^https:\/\/world\.openfoodfacts\.net\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'openfoodfacts-api',
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
                networkTimeoutSeconds: 5,
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/(images|static)\.openfoodfacts\.(net|org)\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'openfoodfacts-images',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            // Supabase — URL leída de VITE_SUPABASE_URL, sin hardcodear
            ...(supabaseHost ? [{
              urlPattern: new RegExp(`^https://${supabaseHost.replace(/\./g, '\\.')}/.*`, 'i'),
              handler: 'NetworkFirst' as const,
              options: {
                cacheName: 'supabase-api',
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
                networkTimeoutSeconds: 8,
              },
            }] : []),
          ],
        },
      }),
    ],
    resolve: {
      alias: { '@': '/src' },
    },
  }
})
