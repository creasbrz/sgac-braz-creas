// frontend/src/components/ui/card.tsx
import * as React from "react"

import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/* COMPONENTES DE CARD (Modernizado)                                          */
/* -------------------------------------------------------------------------- */

// 1. CARD BASE
// Container principal. 
// Nota: Adicione 'hover:shadow-md transition-shadow' na instância se o card for clicável.
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

// 2. HEADER
// Responsável pelo espaçamento inicial.
// [MODERNIZAÇÃO] Troca de space-y por gap para melhor controle flexbox.
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

// 3. TITLE
// Título semântico. Use 'leading-none' para títulos curtos e impactantes.
const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

// 4. DESCRIPTION
// Texto de apoio. O 'text-sm' e 'muted-foreground' garantem hierarquia visual imediata.
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

// 5. CONTENT
// Corpo do card. O 'pt-0' é crucial para manter o ritmo vertical se houver header.
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

// 6. FOOTER
// Rodapé para ações. Flexbox padrão para alinhar botões.
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }