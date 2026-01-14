import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/* 1. VARIANTES E ESTILOS                                                     */
/* -------------------------------------------------------------------------- */

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full border border-border/10 shadow-sm transition-opacity", 
  {
    variants: {
      size: {
        xs: "h-6 w-6 text-[10px]", // Para tabelas densas
        sm: "h-8 w-8 text-xs",     // Para headers compactos
        default: "h-10 w-10 text-sm", // Padrão
        lg: "h-14 w-14 text-base", // Para cartões de perfil
        xl: "h-20 w-20 text-xl",   // Para páginas de perfil detalhadas
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

/* -------------------------------------------------------------------------- */
/* 2. PRIMITIVOS (MODERNIZADOS)                                               */
/* -------------------------------------------------------------------------- */

interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(avatarVariants({ size }), className)}
      {...props}
    />
  )
)
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement>
>(({ className, ...props }, ref) => (
  <img
    ref={ref}
    // UX FIX: 'object-cover' impede distorção da imagem
    // UI: 'aspect-square' garante a proporção 1:1
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
))
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    // UI: bg-muted + text-muted-foreground cria um visual neutro e acessível
    // Font-medium para garantir legibilidade das iniciais
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted font-medium text-muted-foreground animate-in fade-in duration-300",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = "AvatarFallback"

/* -------------------------------------------------------------------------- */
/* 3. SMART COMPONENT (NOVO)                                                  */
/* -------------------------------------------------------------------------- */

interface SmartAvatarProps extends AvatarProps {
  src?: string | null
  alt?: string
  name?: string // Usado para gerar iniciais se a imagem falhar
  fallback?: string // Override manual das iniciais
}

const SmartAvatar = React.forwardRef<HTMLDivElement, SmartAvatarProps>(
  ({ src, alt, name, fallback, className, size, ...props }, ref) => {
    
    // Helper para gerar iniciais (Ex: "João Silva" -> "JS")
    // Se não houver nome, usa "??"
    const initials = React.useMemo(() => {
      if (fallback) return fallback
      if (!name) return "??"
      
      return name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    }, [name, fallback])

    return (
      <Avatar ref={ref} size={size} className={className} {...props}>
        {/* Renderiza a imagem apenas se src existir */}
        {src && <AvatarImage src={src} alt={alt || name || "Avatar"} />}
        
        {/* O Fallback do Radix (ou Shadcn) é inteligente: 
            ele aparece automaticamente enquanto a imagem carrega ou se der erro. 
            Aqui garantimos que ele tenha um conteúdo útil (iniciais). */}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
    )
  }
)
SmartAvatar.displayName = "SmartAvatar"

export { Avatar, AvatarImage, AvatarFallback, SmartAvatar }