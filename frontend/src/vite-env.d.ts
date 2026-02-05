/// <reference types="vite/client" />

// 1. Constantes Globais (Injetadas via 'define' no vite.config.ts)
declare const __APP_VERSION__: string

// 2. Tipagem das Variáveis de Ambiente (.env)
interface ImportMetaEnv {
  // A URL da API é obrigatória para o funcionamento do sistema
  readonly VITE_API_URL: string
  
  // Adicione outras variáveis aqui se necessário futuramente, ex:
  // readonly VITE_ENABLE_LOGS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}