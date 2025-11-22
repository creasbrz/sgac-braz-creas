import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"

export function Sheet({ ...props }) {
  return <SheetPrimitive.Root {...props} />
}

export const SheetTrigger = SheetPrimitive.Trigger

export function SheetContent({ side = "left", className, ...props }: any) {
  return (
    <SheetPrimitive.Content
      className={cn(
        "fixed z-50 bg-white shadow-xl border-border border",
        side === "left" && "top-0 left-0 h-full w-72",
        side === "right" && "top-0 right-0 h-full w-72",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        className
      )}
      {...props}
    />
  )
}

export const SheetTitle = SheetPrimitive.Title
export const SheetDescription = SheetPrimitive.Description
