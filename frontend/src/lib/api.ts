// frontend/src/lib/api.ts
import axios, { type InternalAxiosRequestConfig, type AxiosError } from 'axios'
import { STORAGE_KEYS } from '@/constants/storage'

const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3333/api' : '/api')

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Evento Customizado para desacoplar a lógica de UI da lógica de API
export const SESSION_EXPIRED_EVENT = 'sgac:session-expired'

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
    // 401 = Não Autorizado (Token inválido ou expirado)
    if (error.response?.status === 401) {
      const isLoginPage = window.location.pathname.includes('/login')

      if (!isLoginPage) {
        // [V1.2] Em vez de redirecionar forçadamente, despachamos um evento.
        // Isso permite que a UI mostre um Modal antes de sair, salvando o contexto visual do usuário.
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
        
        // Limpamos o storage preventivamente, mas deixamos a navegação para o Modal
        localStorage.removeItem(STORAGE_KEYS.TOKEN)
        localStorage.removeItem(STORAGE_KEYS.USER)
        delete api.defaults.headers.common.Authorization
      }
    }
    
    return Promise.reject(error)
  }
)