// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
// [NOVO] Importa o package.json para ler a versão
import packageJson from './package.json'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // [NOVO] Define a variável global
  define: {
    '__APP_VERSION__': JSON.stringify(packageJson.version),
  },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('pdfmake')) return 'pdfmake';
            if (id.includes('recharts')) return 'recharts';
            if (id.includes('framer-motion') || id.includes('lucide-react')) return 'ui-libs';
            return 'vendor';
          }
        },
      },
    },
  },
})