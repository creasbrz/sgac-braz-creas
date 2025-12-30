import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import packageJson from './package.json' // <--- Importante: Pega a versão do arquivo

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // 1. Definição de Variáveis Globais
  define: {
    '__APP_VERSION__': JSON.stringify(packageJson.version),
  },
  build: {
    chunkSizeWarningLimit: 2000, 
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('pdfmake')) {
            return 'pdfmake';
          }
          if (id.includes('recharts')) {
            return 'recharts';
          }
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