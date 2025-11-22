import { cn } from "@/lib/utils"

export function Badge({ className, variant = "info", ...props }: any) {
  const variants: any = {
    info: "bg-primary text-white",
    success: "bg-green-600 text-white",
    warning: "bg-yellow-500 text-white",
    danger: "bg-red-600 text-white",
    muted: "bg-muted text-foreground",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-md",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
