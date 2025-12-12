// frontend/src/components/dashboard/DashboardStatCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

interface DashboardStatCardProps {
  title: string
  value: number | undefined
  icon: LucideIcon
  colorClass: string
  description?: string
  index?: number // [NOVO] Para controlar a ordem da animação
}

export function DashboardStatCard({ 
  title, 
  value, 
  icon: Icon, 
  colorClass, 
  description,
  index = 0 
}: DashboardStatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.1, // Efeito cascata baseado no índice
        ease: "easeOut" 
      }}
      className="w-full"
    >
      <Card className="shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground tracking-tight">
            {title}
          </CardTitle>
          <div className={`p-2 rounded-full bg-opacity-10 ${colorClass.replace('text-', 'bg-')}`}>
             <Icon className={`h-4 w-4 ${colorClass}`} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold leading-tight tracking-tight">{value ?? '-'}</div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed font-medium">
              {description}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}