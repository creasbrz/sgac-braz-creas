import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { jwtDecode } from 'jwt-decode'
import { Loader2 } from 'lucide-react'
import { getErrorMessage } from '@/utils/error'
import { api } from '@/lib/api'
import { ROUTES } from '@/constants/routes'
import { STORAGE_KEYS } from '@/constants/storage'
import type { User, UserRole } from '@/types/user'

interface DecodedToken {
  exp: number
  iat: number
  sub: string 
  nome: string
  cargo: UserRole
}

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

// Hook personalizado para facilitar o uso do contexto
export const useAuthContext = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const navigate = useNavigate()

  const logout = () => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEYS.TOKEN)
    localStorage.removeItem(STORAGE_KEYS.USER) // Limpa dados do usuário se existirem
    
    // Não precisamos limpar o header manualmente, pois o interceptor do api.ts
    // lê o localStorage a cada requisição. Se não tem token lá, não envia.
    
    navigate(ROUTES.LOGIN)
  }

  useEffect(() => {
    async function loadUserFromStorage() {
      const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN)
      
      if (storedToken) {
        try {
          // 1. Verifica validade do token localmente (Data de Expiração)
          const decodedToken = jwtDecode<DecodedToken>(storedToken)
          const isTokenValid = decodedToken.exp * 1000 > Date.now()

          if (isTokenValid) {
            // 2. Tenta buscar os dados atualizados do usuário no Backend
            // O interceptor do axios já vai anexar o token automaticamente
            const response = await api.get('/me')
            setUser(response.data)
          } else {
            // Token expirou pelo tempo
            logout()
          }
        } catch (error) {
          console.error("Sessão inválida ou expirada:", error)
          // Se der erro no decode ou na requisição /me (ex: 401), faz logout
          logout()
        }
      }
      
      setIsSessionLoading(false)
    }

    loadUserFromStorage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = async ({ email, senha }: LoginData): Promise<boolean> => {
    setIsLoginLoading(true)
    try {
      // 1. Autenticação
      const response = await api.post('/login', { email, senha })
      const { token: newToken } = response.data

      // 2. Salvar Token
      localStorage.setItem(STORAGE_KEYS.TOKEN, newToken)
      
      // 3. Buscar dados completos do usuário
      // (Necessário pois o login as vezes retorna só o token básico)
      const userResponse = await api.get('/me')
      const loggedUser: User = userResponse.data
      
      // 4. Atualizar Estado e Storage Auxiliar
      setUser(loggedUser)
      // Opcional: Salvar user básico no storage para recuperação rápida
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(loggedUser))

      toast.success('Login bem-sucedido!')

      // 5. Redirecionamento
      navigate(ROUTES.WORKSPACE) 
      
      return true
    } catch (error) {
      console.error(error)
      const errMsg = getErrorMessage(error, 'Credenciais inválidas. Tente novamente.')
      toast.error(errMsg)
      return false
    } finally {
      setIsLoginLoading(false)
    }
  }

  if (isSessionLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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