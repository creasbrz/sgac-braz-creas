// frontend/src/components/ui/tabs.tsx — Componente de abas atualizado, modernizado e com melhorias visuais e acessibilidade.

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

// Mantém o Root original, pois já é estável e robusto.
const Tabs = TabsPrimitive.Root

/**
 * TabsList — Agora com melhor contraste, padding mais equilibrado,
 * suporte a dark mode fluido e bordas suavizadas (rounded-lg).
 */
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-lg bg-muted/60 backdrop-blur-sm p-1 text-muted-foreground shadow-sm",
      "border border-border/40 dark:border-border/20",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

/**
 * TabsTrigger — Agora com destaque mais elegante quando ativo, transição suave,
 * sombra sutil, foco mais visível e comportamento moderno responsivo.
 */
const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5",
      "text-sm font-medium transition-all duration-200",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
      "data-[state=active]:bg-background data-[state=active]:text-foreground",
      "data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-border/40",
      "hover:bg-accent/50",
      "disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

/**
 * TabsContent — Recebe melhorias de spacing, animação suave de entrada
 * e foco acessível aprimorado.
 */
const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-3 outline-none",
      "animate-fade-in data-[state=inactive]:animate-fade-out",
      "focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
