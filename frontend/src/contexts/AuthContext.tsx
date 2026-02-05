// frontend/src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { jwtDecode } from 'jwt-decode'
import { Loader2 } from 'lucide-react'

import { getErrorMessage } from '@/utils/error'
import { api } from '@/lib/api'
import { ROUTES } from '@/constants/app-routes'
import { STORAGE_KEYS } from '@/constants/storage'
import type { User, UserRole } from '@/types/user'

// --- TYPES ---

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

// --- CONTEXT ---

export const AuthContext = createContext({} as AuthContextType)

// [IMPORTANTE] Exportação do Hook para substituir o antigo arquivo /hooks/useAuth.ts
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// --- PROVIDER ---

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  
  const navigate = useNavigate()

  const logout = () => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEYS.TOKEN)
    localStorage.removeItem(STORAGE_KEYS.USER)
    
    // Redireciona para login e remove histórico para evitar botão "voltar"
    navigate(ROUTES.LOGIN, { replace: true })
  }

  useEffect(() => {
    async function loadUserFromStorage() {
      const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN)
      
      if (storedToken) {
        try {
          // 1. Validação Local (Expiração do Token JWT)
          // 
          const decodedToken = jwtDecode<DecodedToken>(storedToken)
          const isTokenValid = decodedToken.exp * 1000 > Date.now()

          if (isTokenValid) {
            // 2. Validação Remota (Busca dados atualizados)
            // Se o token estiver revogado no backend, isso lançará erro e cairá no catch do axios interceptor
            const response = await api.get('/me')
            setUser(response.data)
          } else {
            // Token expirado
            logout()
          }
        } catch (error) {
          console.error("Sessão inválida:", error)
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
      // 
      // 1. Autenticação
      const response = await api.post('/login', { email, senha })
      const { token: newToken } = response.data

      // 2. Persistência
      localStorage.setItem(STORAGE_KEYS.TOKEN, newToken)
      
      // 3. Obtenção de Perfil Completo
      // Garante que temos todos os dados (roles, permissões) antes de liberar acesso
      const userResponse = await api.get('/me')
      const loggedUser: User = userResponse.data
      
      setUser(loggedUser)
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(loggedUser))

      toast.success(`Bem-vindo, ${loggedUser.nome.split(' ')[0]}!`)

      // 4. Redirecionamento Seguro
      navigate(ROUTES.WORKSPACE, { replace: true })
      
      return true
    } catch (error) {
      const errMsg = getErrorMessage(error, 'Credenciais inválidas.')
      toast.error(errMsg)
      return false
    } finally {
      setIsLoginLoading(false)
    }
  }

  // Tela de Carregamento Inicial (Splash Screen)
  if (isSessionLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-700">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
          </div>
          <p className="text-sm font-medium text-muted-foreground animate-pulse tracking-wide">
            Carregando sistema...
          </p>
        </div>
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