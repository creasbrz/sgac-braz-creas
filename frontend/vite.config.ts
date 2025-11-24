// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Aumenta o limite do aviso para 1600kb (opcional, apenas para limpar o log)
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separa bibliotecas do node_modules em arquivos diferentes
          if (id.includes('node_modules')) {
            // Separa o PDFMake (que é o mais pesado)
            if (id.includes('pdfmake')) {
              return 'pdfmake';
            }
            // Separa os gráficos
            if (id.includes('recharts')) {
              return 'recharts';
            }
            // Separa animações e ícones
            if (id.includes('framer-motion') || id.includes('lucide-react')) {
              return 'ui-libs';
            }
            // O resto fica no vendor padrão
            return 'vendor';
          }
        },
      },
    },
  },
})