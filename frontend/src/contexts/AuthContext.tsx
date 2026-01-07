import { createContext, useState, useEffect, type ReactNode } from 'react'
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const navigate = useNavigate()

  const logout = () => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEYS.TOKEN)
    delete api.defaults.headers.common.Authorization
    navigate(ROUTES.LOGIN)
  }

  useEffect(() => {
    async function loadUserFromStorage() {
      const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN)
      
      if (storedToken) {
        try {
          const decodedToken = jwtDecode<DecodedToken>(storedToken)
          if (decodedToken.exp * 1000 > Date.now()) {
            api.defaults.headers.common.Authorization = `Bearer ${storedToken}`
            const response = await api.get('/me')
            setUser(response.data)
          } else {
            logout()
          }
        } catch (error) {
          console.error("Falha ao carregar sessão:", error)
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
      const response = await api.post('/login', { email, senha })
      const { token: newToken } = response.data

      localStorage.setItem(STORAGE_KEYS.TOKEN, newToken)
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`

      const userResponse = await api.get('/me')
      const loggedUser: User = userResponse.data
      setUser(loggedUser)

      toast.success('Login bem-sucedido!')

      // [CORREÇÃO] Redireciona para a Mesa de Trabalho (Workspace)
      navigate(ROUTES.WORKSPACE) 
      
      return true
    } catch (error) {
      const errMsg = getErrorMessage(error, 'Verifique suas credenciais.')
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