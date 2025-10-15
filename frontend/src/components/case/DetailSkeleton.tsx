// frontend/src/components/case/DetailSkeleton.tsx
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function DetailSkeleton() {
  return (
    <main className="container mx-auto p-4 md:p-6">
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-6 w-1/3 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="space-y-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </main>
  )
}