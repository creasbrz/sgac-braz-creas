import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { VitePWA } from 'vite-plugin-pwa'
import packageJson from './package.json'

export default defineConfig({
  build: {
    target: 'es2022',
    outDir: 'dist',
    chunkSizeWarningLimit: 1600, 
    sourcemap: false,
    
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // 1. ISOLAMENTO CRÍTICO (O que causava o erro do Login antes)
            // Mantemos o PDF separado pois ele quebra a inicialização
            if (id.includes('@react-pdf/renderer') || id.includes('pdfmake')) {
              return 'pdf-lib';
            }

            // 2. OUTRAS LIBS PESADAS (Opcional, mas bom para performance)
            if (id.includes('leaflet') || id.includes('react-leaflet')) return 'maps-lib';
            if (id.includes('recharts')) return 'charts-lib';
            if (id.includes('fullcalendar')) return 'calendar-lib';
            if (id.includes('lottie')) return 'lottie-lib';

            // 3. VENDOR GERAL (A CORREÇÃO DO ERRO ATUAL)
            // Juntamos React, Router, Radix, Lucide e Utils tudo aqui.
            // Isso garante que o React.forwardRef exista quando o Radix for usado.
            return 'vendor'; 
          }
        },
      },
    },
  },

  // Mantemos a otimização do PDF
  optimizeDeps: {
    include: ['@react-pdf/renderer'],
  },

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
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, // Aumentado para segurança
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