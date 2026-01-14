import * as React from "react"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/* COMPONENTES DE CARD                                                        */
/* -------------------------------------------------------------------------- */

// 1. CARD BASE
// Removemos o hover effect padrão para evitar "falsa aforância".
// Se precisar de um card clicável, basta adicionar: "transition-all hover:shadow-md cursor-pointer" via className na instância.
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
// Removemos o gradiente para um look mais clean e profissional.
// O espaçamento (flex-col space-y-1.5) cuida da hierarquia entre Título e Descrição.
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

// 3. TITLE
// Mantivemos h3 como padrão semântico, mas permitimos override.
// tracking-tight deixa o título mais compacto e moderno.
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
// text-muted-foreground garante que o contraste seja acessível mas visualmente distinto do título.
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
// p-6 padrão, mas pt-0 se houver header acima, para manter o ritmo vertical correto.
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

// 6. FOOTER
// Flexbox pronto para alinhar botões à direita ou esquerda.
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