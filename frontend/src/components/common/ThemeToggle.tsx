// frontend/src/components/ThemeToggle.tsx
"use client"

import * as React from "react"
import { Moon, Sun, Monitor, Check, type LucideIcon } from "lucide-react"
// [CORREÇÃO] Ajuste do caminho para o arquivo criado anteriormente
import { useTheme } from "@/components/common/theme-provider"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type ThemeOption = {
  value: string
  label: string
  Icon: LucideIcon
}

const themeOptions: ThemeOption[] = [
  { value: "light", label: "Claro", Icon: Sun },
  { value: "dark", label: "Escuro", Icon: Moon },
  { value: "system", label: "Sistema", Icon: Monitor },
]

export function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Evita erro de hidratação (hydration mismatch)
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" disabled className="opacity-50">
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      </Button>
    )
  }

  // Define se é modo escuro baseado no tema resolvido (inclui preferência do sistema)
  const isDark = resolvedTheme === "dark"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative border-border">
          {/* SOLUÇÃO DO ÍCONE PRESO:
            Controlamos as classes via JS (isDark) em vez de apenas CSS (dark:).
            Isso garante que o ícone sempre corresponda à realidade do tema.
          */}
          <Sun 
            className={cn(
              "h-[1.2rem] w-[1.2rem] transition-all duration-300 absolute",
              isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
            )} 
          />
          <Moon 
            className={cn(
              "h-[1.2rem] w-[1.2rem] transition-all duration-300 absolute",
              isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
            )} 
          />
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end">
        {themeOptions.map(({ value, label, Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className="cursor-pointer gap-2"
          >
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span>{label}</span>
            <Check
              className={cn(
                "ml-auto h-4 w-4 transition-opacity",
                theme === value ? "opacity-100" : "opacity-0"
              )}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}