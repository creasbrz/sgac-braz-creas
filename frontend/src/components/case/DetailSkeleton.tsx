// frontend/src/components/case/DetailSkeleton.tsx
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="border-b pb-4">
        <Skeleton className="h-8 w-1/3 mb-2" aria-hidden="true" />
        <Skeleton className="h-5 w-1/4" aria-hidden="true" />
      </div>

      {/* Seções repetidas */}
      {[...Array(2)].map((_, i) => (
        <Card key={i} className="p-4 space-y-6">
          <Skeleton className="h-6 w-48" aria-hidden="true" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, j) => (
              <div key={j} className="space-y-2">
                <Skeleton className="h-4 w-24" aria-hidden="true" />
                <Skeleton className="h-4 w-full" aria-hidden="true" />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
