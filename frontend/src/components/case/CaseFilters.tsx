// frontend/src/components/case/CaseFilters.tsx
import { Search, X, Filter, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface CaseFiltersProps {
  filters: {
    search: string
    status: string
    urgencia: string
  }
  setFilters: (filters: any) => void
}

// Opções de Status do Prisma
const STATUS_OPTIONS = [
  { label: 'Aguardando Acolhida', value: 'AGUARDANDO_ACOLHIDA' },
  { label: 'Em Acolhida', value: 'EM_ACOLHIDA' },
  { label: 'Aguardando Distribuição', value: 'AGUARDANDO_DISTRIBUICAO' },
  { label: 'Acolhida Especializada', value: 'EM_ACOLHIDA_ESPECIALIZADA' },
  { label: 'Acompanhamento', value: 'EM_ACOMPANHAMENTO' },
  { label: 'Monitoramento', value: 'EM_MONITORAMENTO' },
  { label: 'Desligado', value: 'DESLIGADO' },
]

export function CaseFilters({ filters, setFilters }: CaseFiltersProps) {
  
  // Função para lidar com mudança no Search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev: any) => ({ ...prev, search: e.target.value, page: 1 }))
  }

  // Função para adicionar Status (Multi-Select)
  const handleStatusChange = (value: string) => {
    if (value === 'all') {
      setFilters((prev: any) => ({ ...prev, status: '', page: 1 }))
      return
    }

    const currentStatuses = filters.status ? filters.status.split(',') : []
    
    if (currentStatuses.includes(value)) {
      const newStatuses = currentStatuses.filter((s: string) => s !== value)
      setFilters((prev: any) => ({ ...prev, status: newStatuses.join(','), page: 1 }))
    } else {
      const newStatuses = [...currentStatuses, value]
      setFilters((prev: any) => ({ ...prev, status: newStatuses.join(','), page: 1 }))
    }
  }

  const selectedStatuses = filters.status ? filters.status.split(',') : []

  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4">
        
        {/* 1. BUSCA POR ENDEREÇO/NOME/CPF */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nome, CPF ou endereço..."
            value={filters.search}
            onChange={handleSearchChange}
            className="pl-9 bg-background border-border shadow-sm transition-all focus-visible:ring-primary/20"
          />
        </div>

        {/* 2. FILTRO DE STATUS (Multi-select visual) */}
        <Select onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:w-60 bg-background border-border shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
               <Filter className="h-4 w-4" />
               <span className="text-foreground">Filtrar Status</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-medium">Todos os ativos</SelectItem>
            {STATUS_OPTIONS.map((opt) => {
               const isSelected = selectedStatuses.includes(opt.value)
               return (
                  <SelectItem key={opt.value} value={opt.value} className="cursor-pointer">
                    <div className="flex items-center gap-2.5 w-full">
                      <div className={cn(
                        "w-4 h-4 border rounded flex items-center justify-center transition-colors",
                        isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                      )}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <span className={cn(isSelected ? "font-medium text-foreground" : "text-muted-foreground")}>
                        {opt.label}
                      </span>
                    </div>
                  </SelectItem>
               )
            })}
          </SelectContent>
        </Select>
      </div>

      {/* ÁREA DE TAGS ATIVAS */}
      {selectedStatuses.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center animate-in fade-in slide-in-from-top-1 duration-300">
          <span className="text-xs font-semibold text-muted-foreground mr-1 uppercase tracking-wide">Filtros:</span>
          {selectedStatuses.map((status: string) => {
            const label = STATUS_OPTIONS.find(o => o.value === status)?.label || status
            return (
              <Badge 
                key={status} 
                variant="secondary" 
                className="gap-1 pr-1 bg-muted hover:bg-muted/80 text-foreground border-border transition-colors group"
              >
                {label}
                <button 
                  onClick={() => handleStatusChange(status)}
                  className="hover:bg-destructive/10 hover:text-destructive rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-destructive/30"
                  aria-label={`Remover filtro ${label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs text-muted-foreground hover:text-foreground px-2"
            onClick={() => setFilters((prev: any) => ({ ...prev, status: '' }))}
          >
            Limpar tudo
          </Button>
        </div>
      )}
    </div>
  )
}