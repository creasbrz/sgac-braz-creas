// backend/tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/server.ts'],
  
  // Otimiza o output especificamente para a runtime do projeto (Node 20+)
  target: 'node20',
  
  // Formato CommonJS é mais estável para backend Node/Fastify clássico
  format: ['cjs'], 
  
  splitting: false,
  sourcemap: true,
  clean: true,
  
  // [CRÍTICO] Injeta polyfills para __dirname e import.meta.url funcionarem no build CJS
  shims: true,
  
  // Minifica o código apenas em produção para economizar recursos no Render
  minify: process.env.NODE_ENV === 'production',
})