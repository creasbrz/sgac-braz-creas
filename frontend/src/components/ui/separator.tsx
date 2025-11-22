export function Separator({ className = "", ...props }: any) {
  return (
    <div
      className={`w-full h-px bg-border ${className}`}
      {...props}
    />
  )
}
