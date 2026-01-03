import axios from 'axios'

// Tenta pegar do .env, se não tiver, usa o localhost do backend novo
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3333'

export const api = axios.create({
  baseURL,
})

// Interceptador de Requisição: Anexa o Token
api.interceptors.request.use((config) => {
  // Mantive sua chave original 'sgac_token' para não quebrar logins existentes
  const token = localStorage.getItem('sgac_token')
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  return config
})

// Interceptador de Resposta: Trata Queda de Sessão
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Se o backend devolver 401 (Não autorizado)
    if (error.response?.status === 401) {
      // Ignora se for erro na própria tela de login (pra não dar loop)
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('sgac_token')
        localStorage.removeItem('sgac_user')
        
        // Redireciona forçado para login
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)