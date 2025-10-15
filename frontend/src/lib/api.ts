// frontend/src/lib/api.ts
import axios from 'axios'
import { STORAGE_KEYS } from '../constants/storage'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333'

export const api = axios.create({
  baseURL: API_URL,
})

// Interceptor para adicionar o token a cada requisição
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor para tratar erros 401 (Não Autorizado) globalmente
// Isto é útil para deslogar o utilizador quando o token expira.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Limpa o token e recarrega a página para o ecrã de login.
      localStorage.removeItem(STORAGE_KEYS.TOKEN)
      // O AuthContext irá detetar a ausência de token e redirecionar.
      window.location.href = '/'
    }
    return Promise.reject(error)
  },
)

