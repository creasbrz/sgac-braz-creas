// frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    extensions: [".js", ".ts", ".jsx", ".tsx", ".json"],
  },

  css: {
    devSourcemap: true,
  },

  server: {
    port: 5173,
    strictPort: true,
  },

  build: {
    sourcemap: false,
    // Aumenta o limite do aviso para 1500kB (silencia o aviso se preferir não dividir)
    chunkSizeWarningLimit: 1500, 
    outDir: "dist",
    rollupOptions: {
      output: {
        // ESTA É A MÁGICA:
        // Separa as bibliotecas (node_modules) do seu código
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
});