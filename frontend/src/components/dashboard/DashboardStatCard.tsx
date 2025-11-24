// File: components/dashboard/DashboardStatCard.tsx
// This file contains a modernized and visually improved stat card component.

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

interface DashboardStatCardProps {
  title: string
  value: number | undefined
  icon: LucideIcon
  colorClass: string
  description?: string
}

export function DashboardStatCard({ title, value, icon: Icon, colorClass, description }: DashboardStatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full"
    >
      <Card className="shadow-sm hover:shadow-md transition-all rounded-2xl border border-border/40">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground tracking-tight">
            {title}
          </CardTitle>
          <Icon className={`h-5 w-5 ${colorClass}`} />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold leading-tight">{value ?? '-'}</div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {description}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}