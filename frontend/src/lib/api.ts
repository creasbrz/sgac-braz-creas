import axios, { type InternalAxiosRequestConfig, type AxiosError } from 'axios'
import { STORAGE_KEYS } from '@/constants/storage' // [Melhoria] Importando constants para consistência

// Lógica de URL:
// Prod (Render): '/api' (Backend e Frontend na mesma origem)
// Dev (Local): 'http://localhost:3333/api'
const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3333/api' : '/api')

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptador de Requisição
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // [Melhoria] Usando a constante para garantir que lemos o mesmo token que o AuthContext salvou
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN)
  
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  return config
})

// Interceptador de Resposta
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const isLoginPage = window.location.pathname.includes('/login')

      if (!isLoginPage) {
        // [Melhoria] Limpeza consistente usando constantes
        localStorage.removeItem(STORAGE_KEYS.TOKEN)
        localStorage.removeItem(STORAGE_KEYS.USER)
        
        // Remove header global para evitar vazamento em futuras requisições sem refresh
        delete api.defaults.headers.common.Authorization
        
        window.location.href = '/login'
      }
    }
    
    return Promise.reject(error)
  }
)