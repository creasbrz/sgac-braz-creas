// frontend/src/contexts/AuthContext.tsx
import { createContext, useState, useEffect, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { jwtDecode } from 'jwt-decode'
import { Loader2 } from 'lucide-react'

import { api } from '@/lib/axios' // Importe do arquivo que criamos acima
import { STORAGE_KEYS } from '@/constants/storage'
import type { User, DecodedToken } from '@/types/user'

interface LoginData {
  email: string
  senha: string
}

interface AuthContextType {
  isAuthenticated: boolean
  user: User | null
  login: (data: LoginData) => Promise<boolean>
  logout: () => void
  isSessionLoading: boolean
  isLoginLoading: boolean
}

export const AuthContext = createContext({} as AuthContextType)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  
  const navigate = useNavigate()
  const location = useLocation()

  // Função Auxiliar de Logout
  const logout = () => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEYS.TOKEN)
    // Remove cabeçalho padrão
    delete api.defaults.headers.common.Authorization
    navigate('/login')
  }

  // Efeito: Carregar sessão ao iniciar (F5)
  useEffect(() => {
    async function loadUserFromStorage() {
      const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN)
      
      if (storedToken) {
        try {
          // 1. Decodifica para ver validade
          const decoded = jwtDecode<DecodedToken>(storedToken)
          const currentTime = Date.now() / 1000

          if (decoded.exp < currentTime) {
            throw new Error('Token expirado')
          }

          // 2. Define header padrão
          api.defaults.headers.common.Authorization = `Bearer ${storedToken}`

          // 3. Tenta buscar dados atualizados do usuário (/me)
          // Se essa rota falhar (ex: usuário deletado), cai no catch e faz logout
          try {
             const response = await api.get('/me')
             setUser(response.data)
          } catch (err) {
             // Fallback: Se /me falhar, mas token for válido, usa dados do token temporariamente
             // Isso evita logout se a API tiver um soluço momentâneo, mas o ideal é o /me
             console.warn("Não foi possível buscar detalhes completos do usuário (/me).")
             setUser({
               id: decoded.sub,
               nome: decoded.nome,
               email: '', // Token não tem email
               cargo: decoded.cargo,
               ativo: true
             })
          }

        } catch (error) {
          // Token inválido ou expirado
          logout()
        }
      }
      setIsSessionLoading(false)
    }

    loadUserFromStorage()
  }, [])

  // Função de Login
  const login = async ({ email, senha }: LoginData): Promise<boolean> => {
    setIsLoginLoading(true)
    try {
      // 1. Request POST /login
      const response = await api.post('/login', { email, senha })
      const { token } = response.data

      // 2. Salva Token
      localStorage.setItem(STORAGE_KEYS.TOKEN, token)
      api.defaults.headers.common.Authorization = `Bearer ${token}`

      // 3. Decodifica ou busca /me para ter o objeto User
      // Vamos buscar /me para ter certeza que temos todos os dados
      const userResponse = await api.get('/me')
      const loggedUser = userResponse.data
      
      setUser(loggedUser)
      toast.success(`Bem-vindo(a), ${loggedUser.nome.split(' ')[0]}!`)

      // 4. Redirecionamento Inteligente
      // Se ele estava tentando acessar uma rota protegida, manda de volta pra lá
      // Caso contrário, manda pro Dashboard ou Cases
      const origin = location.state?.from?.pathname || (loggedUser.cargo === 'Gerente' ? '/dashboard' : '/cases')
      navigate(origin)

      return true

    } catch (error: any) {
      console.error(error)
      const msg = error.response?.data?.message || 'Erro ao fazer login. Verifique suas credenciais.'
      toast.error(msg)
      return false
    } finally {
      setIsLoginLoading(false)
    }
  }

  // Loader de Sessão (Tela Branca evita piscada)
  if (isSessionLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        user,
        login,
        logout,
        isSessionLoading,
        isLoginLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}