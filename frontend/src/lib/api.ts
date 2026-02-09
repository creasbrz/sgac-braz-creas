// frontend/src/lib/api.ts
import axios, { type InternalAxiosRequestConfig, type AxiosError } from 'axios'
import { STORAGE_KEYS } from '@/constants/storage'

// Configuração inteligente de ambiente
const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3333/api' : '/api')

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // Fail-fast: 30s de timeout para evitar pendências infinitas
})

// Evento Customizado
export const SESSION_EXPIRED_EVENT = 'sgac:session-expired'

// Controle de "Storm" para evitar múltiplos disparos do evento de logout em milissegundos
let isExpiring = false

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN)
  
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // 401 = Não Autorizado
    if (error.response?.status === 401) {
      const isLoginPage = window.location.pathname.includes('/login')

      if (!isLoginPage && !isExpiring) {
        isExpiring = true
        
        // Dispara o evento para a UI (Modal)
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
        
        // Limpeza preventiva
        localStorage.removeItem(STORAGE_KEYS.TOKEN)
        localStorage.removeItem(STORAGE_KEYS.USER)
        delete api.defaults.headers.common.Authorization

        // Reseta o flag após 1 segundo, permitindo novos disparos se necessário
        setTimeout(() => { isExpiring = false }, 1000)
      }
    }
    
    return Promise.reject(error)
  }
)