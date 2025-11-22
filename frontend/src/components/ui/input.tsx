import { cn } from "@/lib/utils"

export function Input({ className, ...props }: any) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-border bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:bg-muted",
        className
      )}
      {...props}
    />
  )
}
