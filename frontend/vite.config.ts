// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { VitePWA } from 'vite-plugin-pwa'
import packageJson from './package.json'

export default defineConfig({
  // 1. Build & Performance
  build: {
    target: 'es2022', // Suporte moderno (Top-level await, classes, etc)
    outDir: 'dist',
    chunkSizeWarningLimit: 1000, // 1MB antes de avisar (PDFMake e Maps são grandes)
    sourcemap: false, // Desabilitado em prod para segurança
    
    rollupOptions: {
      output: {
        // Estratégia de Chunking para Cache Otimizado
        manualChunks(id) {
          // Apenas processa arquivos dentro de node_modules
          if (id.includes('node_modules')) {
            
            // --- TIERS DE PESO (Isolamento de libs gigantes) ---
            if (id.includes('pdfmake')) return 'vendor-pdf';
            if (id.includes('leaflet') || id.includes('react-leaflet')) return 'vendor-maps';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('fullcalendar')) return 'vendor-calendar';
            if (id.includes('lottie')) return 'vendor-lottie';

            // --- CORE REACT (Cache quase eterno) ---
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router')) {
              return 'vendor-react-core';
            }

            // --- UI SYSTEM (Radix + Lucide + Tailwind Utils) ---
            if (
              id.includes('@radix-ui') || 
              id.includes('lucide-react') || 
              id.includes('framer-motion') ||
              id.includes('sonner') ||
              id.includes('class-variance-authority') ||
              id.includes('clsx') ||
              id.includes('tailwind-merge')
            ) {
              return 'vendor-ui';
            }

            // --- DATA & STATE (TanStack + Forms + Utils) ---
            if (
              id.includes('@tanstack') || 
              id.includes('react-hook-form') || 
              id.includes('zod') || 
              id.includes('axios') ||
              id.includes('date-fns')
            ) {
              return 'vendor-data';
            }

            // O resto vai para um vendor genérico
            return 'vendor-utils';
          }
        },
      },
    },
  },

  // 2. Plugins
  plugins: [
    react(),
    
    // Engine JIT do Tailwind v4 (Substitui PostCSS)
    tailwindcss(),

    // Configuração PWA (Offline First)
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo.svg'],
      
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // Aumentado para 6MB (margem de segurança)
        
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        
        runtimeCaching: [
          // API: Tenta rede primeiro, cai no cache se offline (Crítico para dados frescos)
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24h
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // Fontes e Assets Estáticos: Cache First (Agressivo)
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 60 }
            }
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
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],

  // 3. Aliases e Definições Globais
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  define: {
    '__APP_VERSION__': JSON.stringify(packageJson.version),
  },
})