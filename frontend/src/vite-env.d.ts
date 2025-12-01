/// <reference types="vite/client" />

// [NOVO] Declara a variável global
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}