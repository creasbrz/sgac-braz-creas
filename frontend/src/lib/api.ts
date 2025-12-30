import axios from 'axios'

// Define a URL base. Em produção, como é o mesmo domínio, pode ser '/'
// Em dev, usa a variável de ambiente ou localhost
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3333/api'

export const api = axios.create({
  baseURL,
})

// Interceptador de Requisição (Anexa o token)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sgac_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptador de Resposta (Trata erros globais)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Se o erro for 401 (Não autorizado / Token expirado)
    if (error.response?.status === 401) {
      // Evita loop infinito se o erro for na própria rota de login
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('sgac_token')
        localStorage.removeItem('sgac_user')
        
        // Redireciona para login
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)