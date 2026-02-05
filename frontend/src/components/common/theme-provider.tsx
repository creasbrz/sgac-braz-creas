// frontend/src/components/theme-provider.tsx
"use client"

import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes"
import { type ThemeProviderProps } from "next-themes"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

// Re-exportar o hook permite importar tudo de um único lugar (@/components/theme-provider)
export const useTheme = useNextTheme