/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  // adicione outras variáveis de ambiente se tiver
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}