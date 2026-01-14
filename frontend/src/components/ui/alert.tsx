import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Terminal,
  type LucideIcon 
} from "lucide-react"

import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/* 1. PRIMITIVOS                               */
/* -------------------------------------------------------------------------- */
// (Mantivemos a base sólida e acessível da resposta anterior)

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 pl-12 shadow-sm transition-all duration-200 animate-in fade-in slide-in-from-top-1 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:h-5 [&>svg]:w-5",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 bg-destructive/5 text-destructive dark:border-destructive [&>svg]:text-destructive",
        success: 
          "border-emerald-500/50 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400",
        warning: 
          "border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950/20 dark:text-amber-200 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400",
        info: 
          "border-blue-500/50 bg-blue-50 text-blue-900 dark:bg-blue-950/20 dark:text-blue-200 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm opacity-90 [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

/* -------------------------------------------------------------------------- */
/* 2. SMART COMPONENT (NOVO)                         */
/* -------------------------------------------------------------------------- */

const ICON_MAP: Record<string, LucideIcon> = {
  default: Terminal,
  destructive: AlertCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
}

interface SmartAlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  title: string
  description?: React.ReactNode // ReactNode permite passar strings ou JSX (links, bold, etc)
  icon?: LucideIcon // Opcional: permite override manual
}

const SmartAlert = React.forwardRef<HTMLDivElement, SmartAlertProps>(
  ({ className, variant = "default", title, description, icon: IconOverride, ...props }, ref) => {
    
    // Lógica: Usa o ícone passado via prop OU o ícone padrão do mapa
    const IconComponent = IconOverride || ICON_MAP[variant || "default"] || ICON_MAP.default

    return (
      <Alert ref={ref} variant={variant} className={className} {...props}>
        <IconComponent />
        <AlertTitle>{title}</AlertTitle>
        {description && <AlertDescription>{description}</AlertDescription>}
      </Alert>
    )
  }
)
SmartAlert.displayName = "SmartAlert"

export { Alert, AlertTitle, AlertDescription, SmartAlert }