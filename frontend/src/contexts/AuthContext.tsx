// frontend/src/contexts/AuthContext.tsx
import { createContext, useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import axios from 'axios'
import { jwtDecode } from 'jwt-decode'
import { Loader2 } from 'lucide-react'

import { api } from '@/lib/api'
import { ROUTES } from '@/constants/routes'
import { STORAGE_KEYS } from '@/constants/storage'
import type { User } from '@/types/user'

interface DecodedToken {
  exp: number
  iat: number
  sub: string
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
  const [token, setToken] = useState<string | null>(null)
  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const navigate = useNavigate()

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem(STORAGE_KEYS.TOKEN)
    delete api.defaults.headers.common.Authorization
    // O fallback com window.location.href é útil se o logout for chamado
    // de um local fora do contexto do React Router, como um intercetor do Axios.
    try {
      navigate(ROUTES.LOGIN)
    } catch {
      window.location.href = ROUTES.LOGIN
    }
  }

  useEffect(() => {
    async function loadUserFromStorage() {
      const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN)
      if (storedToken) {
        try {
          const decodedToken = jwtDecode<DecodedToken>(storedToken)
          if (decodedToken.exp * 1000 > Date.now()) {
            setToken(storedToken)
            api.defaults.headers.common.Authorization = `Bearer ${storedToken}`
            const response = await api.get('/me')
            setUser(response.data)
          } else {
            // Se o token estiver expirado, limpa-o
            localStorage.removeItem(STORAGE_KEYS.TOKEN)
          }
        } catch {
          localStorage.removeItem(STORAGE_KEYS.TOKEN)
        }
      }
      setIsSessionLoading(false)
    }
    loadUserFromStorage()
  }, [])

  // Interceta erros 401 e força o logout
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status === 401) {
          logout()
        }
        return Promise.reject(err)
      },
    )
    return () => {
      api.interceptors.response.eject(interceptor)
    }
    // Adicionamos a dependência 'logout' para garantir que a função está sempre atualizada.
  }, [logout])

  const login = async ({ email, senha }: LoginData): Promise<boolean> => {
    setIsLoginLoading(true)
    try {
      const response = await api.post('/login', { email, senha })
      const { token: newToken } = response.data

      localStorage.setItem(STORAGE_KEYS.TOKEN, newToken)
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`
      setToken(newToken)

      const userResponse = await api.get('/me')
      const loggedUser: User = userResponse.data
      setUser(loggedUser)

      toast.success('Login bem-sucedido!')

      navigate(loggedUser.cargo === 'Gerente' ? ROUTES.DASHBOARD : ROUTES.CASES)
      return true
    } catch (error) {
      let errMsg = 'Falha na autenticação.'
      if (axios.isAxiosError(error) && error.response) {
        errMsg = error.response.data?.message || 'Verifique as suas credenciais.'
      }
      toast.error(errMsg)
      return false
    } finally {
      setIsLoginLoading(false)
    }
  }

  const isAuthenticated = !!user && !!token

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
        isAuthenticated,
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

