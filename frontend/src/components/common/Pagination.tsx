// frontend/src/components/Pagination.tsx
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  // [NOVO] Props opcionais para controle de densidade
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100]
}: PaginationProps) {
  
  // --- SANITIZAÇÃO DOS VALORES ---
  const safeTotalPages = Math.max(1, totalPages || 1)
  const safePage = Math.max(1, Math.min(currentPage || 1, safeTotalPages))
  
  // Cálculo de índices para "Mostrando X-Y de Z"
  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1
  const endItem = Math.min(safePage * pageSize, totalItems)

  // Se não houver itens, não mostra nada (ou mostra um placeholder se preferir)
  if (totalItems === 0 && safeTotalPages <= 1) return null

  return (
    <div className="flex flex-col-reverse items-center justify-between gap-4 px-2 py-2 sm:flex-row w-full">
      
      {/* Esquerda: Informação de Contagem */}
      <div className="flex-1 text-sm text-muted-foreground">
        {totalItems > 0 ? (
          <span>
            Mostrando <strong>{startItem}-{endItem}</strong> de <strong>{totalItems}</strong> resultados
          </span>
        ) : (
          <span>Sem resultados</span>
        )}
      </div>

      {/* Direita: Controles */}
      <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
        
        {/* [NOVO] Seletor de Linhas por Página */}
        {onPageSizeChange && (
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium hidden sm:block">Linhas por página</p>
            <Select
              value={`${pageSize}`}
              onValueChange={(value) => {
                onPageSizeChange(Number(value))
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {pageSizeOptions.map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Indicador de Página */}
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Página {safePage} de {safeTotalPages}
        </div>

        {/* Botões de Navegação */}
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