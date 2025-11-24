// frontend/src/lib/api.ts
import axios from 'axios'
import { STORAGE_KEYS } from '../constants/storage'

// Lógica Inteligente de URL:
// 1. Se estiver rodando no seu PC (DEV), usa localhost:3333
// 2. Se estiver no Render (PROD), usa string vazia '' (caminho relativo)
const API_URL = import.meta.env.DEV 
  ? 'http://localhost:3333' 
  : '' 

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
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(STORAGE_KEYS.TOKEN)
      // Redireciona para login se o token expirar
      if (window.location.pathname !== '/') {
        window.location.href = '/'
      }
    }
    return Promise.reject(error)
  },
)