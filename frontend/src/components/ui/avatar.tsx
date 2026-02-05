// frontend/src/components/ui/avatar.tsx
import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/* 1. VARIANTES E ESTILOS                                                     */
/* -------------------------------------------------------------------------- */

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden border border-border/50 shadow-sm transition-all",
  {
    variants: {
      size: {
        xs: "h-6 w-6 text-[10px]",      // Tabelas densas
        sm: "h-8 w-8 text-xs",          // Headers/Listas
        default: "h-10 w-10 text-sm",   // Padrão
        lg: "h-14 w-14 text-base",      // Cards de destaque
        xl: "h-20 w-20 text-xl",        // Perfil detalhado
        "2xl": "h-32 w-32 text-3xl",    // Upload de foto
      },
      shape: {
        circle: "rounded-full",
        square: "rounded-md",
      },
    },
    defaultVariants: {
      size: "default",
      shape: "circle",
    },
  }
)

/* -------------------------------------------------------------------------- */
/* 2. PRIMITIVOS (Radix UI Wrapper)                                           */
/* -------------------------------------------------------------------------- */

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size, shape, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(avatarVariants({ size, shape }), className)}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center bg-primary/10 text-primary font-semibold",
      "animate-in fade-in duration-300",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

/* -------------------------------------------------------------------------- */
/* 3. SMART COMPONENT (Intelligent Wrapper)                                   */
/* -------------------------------------------------------------------------- */

/**
 * Gera iniciais de forma inteligente:
 * "João Silva" -> "JS"
 * "Maria" -> "MA"
 * "Pedro de Alcântara" -> "PA"
 */
const getInitials = (name?: string, fallback = "??") => {
  if (!name) return fallback
  
  const parts = name.trim().split(/\s+/)
  
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }
  
  // Pega a primeira letra do primeiro nome e a primeira do último
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface SmartAvatarProps extends AvatarProps {
  src?: string | null
  alt?: string
  name?: string 
  fallback?: string 
}

const SmartAvatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  SmartAvatarProps
>(({ src, alt, name, fallback, className, size, shape, ...props }, ref) => {
  
  const initials = React.useMemo(
    () => getInitials(name, fallback), 
    [name, fallback]
  )

  return (
    <Avatar ref={ref} size={size} shape={shape} className={className} {...props}>
      {src && (
        <AvatarImage 
          src={src} 
          alt={alt || name || "Avatar do usuário"} 
        />
      )}
      <AvatarFallback delayMs={600}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
})
SmartAvatar.displayName = "SmartAvatar"

export { Avatar, AvatarImage, AvatarFallback, SmartAvatar }