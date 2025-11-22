// frontend/src/contexts/AuthContext.tsx
import { createContext, useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { jwtDecode } from 'jwt-decode' //
import { Loader2 } from 'lucide-react'
import { getErrorMessage } from '@/utils/error'
import { api } from '@/lib/api' //
import { ROUTES } from '@/constants/routes' //
import { STORAGE_KEYS } from '@/constants/storage' //
import type { User, UserRole } from '@/types/user' //

// Define o que o token JWT contém
interface DecodedToken {
  exp: number
  iat: number
  sub: string // O ID do usuário
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
  isSessionLoading: boolean // Para saber se a sessão inicial está carregando
  isLoginLoading: boolean // Para o botão de login
}

export const AuthContext = createContext({} as AuthContextType)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const navigate = useNavigate()

  // Função de Logout
  const logout = () => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEYS.TOKEN) //
    delete api.defaults.headers.common.Authorization //
    
    // Navega para o login. O <Navigate> no App.tsx cuidará do resto.
    navigate(ROUTES.LOGIN) //
  }

  // Efeito para carregar o usuário do localStorage na inicialização
  useEffect(() => {
    async function loadUserFromStorage() {
      const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN) //
      
      if (storedToken) {
        try {
          const decodedToken = jwtDecode<DecodedToken>(storedToken)
          // Verifica se o token não está expirado
          if (decodedToken.exp * 1000 > Date.now()) {
            // Define o token no axios ANTES de fazer a chamada /me
            api.defaults.headers.common.Authorization = `Bearer ${storedToken}` //
            
            // Busca os dados mais recentes do usuário
            const response = await api.get('/me') //
            setUser(response.data)
          } else {
            // Token expirado
            logout()
          }
        } catch (error) {
          // Token inválido ou erro na API
          console.error("Falha ao carregar sessão:", error)
          logout()
        }
      }
      setIsSessionLoading(false)
    }
    loadUserFromStorage()
    // O 'navigate' não é uma dependência estável, então o desabilitamos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Função de Login
  const login = async ({ email, senha }: LoginData): Promise<boolean> => {
    setIsLoginLoading(true)
    try {
      const response = await api.post('/login', { email, senha }) //
      const { token: newToken } = response.data

      // 1. Salva o token
      localStorage.setItem(STORAGE_KEYS.TOKEN, newToken) //
      api.defaults.headers.common.Authorization = `Bearer ${newToken}` //

      // 2. Busca os dados do usuário com o novo token
      const userResponse = await api.get('/me') //
      const loggedUser: User = userResponse.data
      setUser(loggedUser) //

      toast.success('Login bem-sucedido!')

      // 3. Redireciona com base no cargo
      // Gerente vai para o Dashboard, outros para a lista de casos
      navigate(loggedUser.cargo === 'Gerente' ? ROUTES.DASHBOARD : ROUTES.CASES) //
      return true
    } catch (error) {
      const errMsg = getErrorMessage(error, 'Verifique suas credenciais.') //
      toast.error(errMsg)
      return false
    } finally {
      setIsLoginLoading(false)
    }
  }

  // Mostra um loader em tela cheia enquanto a sessão (do localStorage) está sendo validada
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
        isAuthenticated: !!user, // Verdadeiro se 'user' não for nulo
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