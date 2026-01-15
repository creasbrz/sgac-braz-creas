import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/server.ts'],
  splitting: false,
  sourcemap: true,
  clean: true,
  // Compila para CommonJS (padrão do Node)
  format: ['cjs'], 
  // [IMPORTANTE] Isso corrige o erro "fileURLToPath" e "dirname"
  shims: true, 
})