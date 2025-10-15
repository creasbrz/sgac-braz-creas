// frontend/vite.config.ts
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Mapeia o atalho '@' para a pasta 'src'
      "@": path.resolve(__dirname, "./src"),
    },
  },
})