import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { VitePWA } from 'vite-plugin-pwa'
import packageJson from './package.json'

export default defineConfig({
  // 1. Build & Performance
  build: {
    target: 'es2022',
    outDir: 'dist',
    chunkSizeWarningLimit: 1500, // Aumentei um pouco mais para evitar warnings chatos
    sourcemap: false,
    
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Isolando a biblioteca pesada que causa problemas
            if (id.includes('@react-pdf/renderer')) return 'vendor-react-pdf';
            
            // Outros vendors pesados
            if (id.includes('pdfmake')) return 'vendor-pdf-core';
            if (id.includes('leaflet') || id.includes('react-leaflet')) return 'vendor-maps';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('fullcalendar')) return 'vendor-calendar';

            // Core React
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router')) {
              return 'vendor-react-core';
            }

            // UI System
            if (id.includes('@radix-ui') || id.includes('lucide-react') || id.includes('framer-motion')) {
              return 'vendor-ui';
            }

            // Data
            if (id.includes('@tanstack') || id.includes('date-fns') || id.includes('axios')) {
              return 'vendor-data';
            }

            return 'vendor-utils';
          }
        },
      },
    },
  },

  // 2. Otimização de Dependências (AQUI ESTÁ A CORREÇÃO DO ERRO DE LOGIN)
  optimizeDeps: {
    include: ['@react-pdf/renderer'], // Força o pré-bundle dessa lib problemática
  },

  // 3. Plugins
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
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'images', expiration: { maxEntries: 60 } }
          }
        ]
      },
      manifest: {
        name: 'SGAC - Gestão CREAS',
        short_name: 'SGAC',
        description: 'Sistema de Gestão de Assistência Social',
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

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  define: {
    '__APP_VERSION__': JSON.stringify(packageJson.version),
  },
})