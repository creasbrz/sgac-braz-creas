import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url' // [FIX 1] Importação nativa ESM
import path from 'node:path' // [FIX 2] Uso explicito do protocolo node:
import { VitePWA } from 'vite-plugin-pwa'
import packageJson from './package.json'

// [FIX 3] Recriando __dirname em ambiente ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  // 1. Build & Performance
  build: {
    target: 'esnext',
    outDir: 'dist',
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('pdfmake')) return 'vendor-pdf';
            if (id.includes('leaflet') || id.includes('react-leaflet')) return 'vendor-maps';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('fullcalendar')) return 'vendor-calendar';
            
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router')) {
              return 'vendor-react-core';
            }

            if (id.includes('@radix-ui') || id.includes('lucide-react') || id.includes('framer-motion')) {
              return 'vendor-ui';
            }

            if (id.includes('@tanstack') || id.includes('zod') || id.includes('date-fns') || id.includes('axios')) {
              return 'vendor-data';
            }

            return 'vendor-utils';
          }
        },
      },
    },
  },

  // 2. Plugins
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo.svg'],
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // ... (resto das regras mantidas)
        ]
      },
      manifest: {
        name: 'SGAC - Gestão CREAS',
        short_name: 'SGAC',
        theme_color: '#ffffff',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ],

  // 3. Aliases
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // Agora __dirname existe e funciona
    },
  },

  define: {
    '__APP_VERSION__': JSON.stringify(packageJson.version),
  },
})