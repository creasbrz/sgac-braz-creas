// frontend/src/components/Pagination.tsx
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'

import { Button } from '@/components/ui/button'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationProps) {
  // --- SANITIZAÇÃO DOS VALORES ---
  const safeTotalPages = Math.max(1, totalPages || 1)
  const safePage = Math.max(1, Math.min(currentPage || 1, safeTotalPages))

  const firstItem = Math.min((safePage - 1) * pageSize + 1, totalItems)
  const lastItem = Math.min(safePage * pageSize, totalItems)

  if (safeTotalPages <= 1) return null

  return (
    <div className="flex items-center justify-between px-2 w-full">
      
      {/* Informação da tabela */}
      <div className="flex-1 text-sm text-muted-foreground hidden sm:block">
        Mostrando {firstItem}–{lastItem} de {totalItems} resultados
      </div>

      <div className="flex items-center space-x-6 lg:space-x-8">
        
        {/* Status da página */}
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Página {safePage} de {safeTotalPages}
        </div>

        {/* Controles */}
        <div className="flex items-center space-x-2">

          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => onPageChange(1)}
            disabled={safePage <= 1}
            aria-label="Ir para a primeira página"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage <= 1}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage >= safeTotalPages}
            aria-label="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => onPageChange(safeTotalPages)}
            disabled={safePage >= safeTotalPages}
            aria-label="Ir para a última página"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>

        </div>
      </div>
    </div>
  )
}
