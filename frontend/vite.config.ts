import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'
import packageJson from './package.json'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'favicon-96x96.png'], 
      
      manifest: {
        name: 'SGAC - Sistema de Gestão CREAS',
        short_name: 'CREAS Digital',
        description: 'Gestão de Casos e Atendimentos Socioassistenciais',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        
        icons: [
          {
            src: 'web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      
      workbox: {
        // [CORREÇÃO] Aumentando o limite para 4MB para aceitar o pdfmake
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, 
        
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api') || url.pathname.startsWith('/stats'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-data-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
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
  
  build: {
    // Aumentamos o limite de aviso do build também para não ficar poluindo o log
    chunkSizeWarningLimit: 3000, 
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('pdfmake')) return 'pdfmake';
          if (id.includes('recharts')) return 'recharts';
          if (id.includes('node_modules/react') || 
              id.includes('node_modules/react-dom') || 
              id.includes('node_modules/react-router-dom')) {
            return 'react-vendor';
          }
          if (id.includes('@radix-ui') || id.includes('lucide-react')) {
            return 'ui-libs';
          }
        },
      },
    },
  },
})