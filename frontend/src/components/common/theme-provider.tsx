// frontend/src/components/theme-provider.tsx
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react"

type Theme = "dark" | "light" | "system"

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

interface ThemeProviderState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeProviderState | undefined>(undefined)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)

  // Carregar tema salvo (evita acessar localStorage no SSR)
  useEffect(() => {
    const stored = localStorage.getItem(storageKey) as Theme | null
    if (stored) setTheme(stored)
  }, [storageKey])

  // Aplicar tema ao DOM
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches

      root.classList.add(systemPrefersDark ? "dark" : "light")
      return
    }

    root.classList.add(theme)
  }, [theme])

  // Atualizar tema se usuário alterar tema do sistema
  useEffect(() => {
    if (theme !== "system") return

    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => {
      setTheme("system") // força recalcular
    }
    media.addEventListener("change", handler)

    return () => media.removeEventListener("change", handler)
  }, [theme])

  const value: ThemeProviderState = {
    theme,
    setTheme: (newTheme: Theme) => {
      localStorage.setItem(storageKey, newTheme)
      setTheme(newTheme)
    },
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
