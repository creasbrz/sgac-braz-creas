import axios, { type InternalAxiosRequestConfig, type AxiosError } from 'axios'

// Lógica de Determinação da URL da API:
// 1. Prioridade: Variável de ambiente VITE_API_URL (se definida no Render/.env)
// 2. Fallback Dev: http://localhost:3333/api
// 3. Fallback Prod: '/api' (Caminho relativo, essencial para deploy no Render onde Front+Back estão na mesma origem)
const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3333/api' : '/api')

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptador de Requisição: Adiciona o Token JWT
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('sgac_token')
  
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  return config
})

// Interceptador de Resposta: Trata Expiração de Sessão (401)
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Verifica se é erro de autenticação (401)
    if (error.response?.status === 401) {
      const isLoginPage = window.location.pathname.includes('/login')

      // Só redireciona se já não estiver na tela de login (evita loop infinito)
      if (!isLoginPage) {
        // Limpa dados sensíveis
        localStorage.removeItem('sgac_token')
        localStorage.removeItem('sgac_user')
        
        // Força o redirecionamento
        window.location.href = '/login'
      }
    }
    
    return Promise.reject(error)
  }
)