import { Search, X, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

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
  { label: 'Aguardando PAEFI', value: 'AGUARDANDO_DISTRIBUICAO_PAEFI' },
  { label: 'Acolhida Especializada', value: 'EM_ACOLHIDA_ESPECIALIZADA' },
  { label: 'Acompanhamento PAEFI', value: 'EM_ACOMPANHAMENTO_PAEFI' },
  { label: 'Monitoramento', value: 'EM_MONITORAMENTO' },
  { label: 'Desligado', value: 'DESLIGADO' },
]

export function CaseFilters({ filters, setFilters }: CaseFiltersProps) {
  
  // Função para lidar com mudança no Search (com debounce idealmente, mas simples aqui)
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev: any) => ({ ...prev, search: e.target.value, page: 1 }))
  }

  // Função para adicionar Status (Simulando Multi-Select simples)
  const handleStatusChange = (value: string) => {
    // Se selecionar "Todos", limpa o filtro
    if (value === 'all') {
      setFilters((prev: any) => ({ ...prev, status: '', page: 1 }))
      return
    }

    // Lógica para acumular status (ex: "EM_ACOLHIDA,AGUARDANDO_ACOLHIDA")
    const currentStatuses = filters.status ? filters.status.split(',') : []
    
    if (currentStatuses.includes(value)) {
      // Se já tem, remove (toggle)
      const newStatuses = currentStatuses.filter(s => s !== value)
      setFilters((prev: any) => ({ ...prev, status: newStatuses.join(','), page: 1 }))
    } else {
      // Se não tem, adiciona
      const newStatuses = [...currentStatuses, value]
      setFilters((prev: any) => ({ ...prev, status: newStatuses.join(','), page: 1 }))
    }
  }

  // Helper para mostrar quais estão selecionados visualmente
  const selectedStatuses = filters.status ? filters.status.split(',') : []

  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4">
        
        {/* 1. BUSCA POR ENDEREÇO (Atualizado) */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF ou endereço (ex: Veredas)..."
            value={filters.search}
            onChange={handleSearchChange}
            className="pl-9 bg-background"
          />
        </div>

        {/* 2. FILTRO DE STATUS (Adaptado para Multiseleção) */}
        <Select onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Filtrar Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os ativos</SelectItem>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <div className="flex items-center gap-2">
                  {/* Checkbox visual simples */}
                  <div className={`w-3 h-3 border rounded-sm ${selectedStatuses.includes(opt.value) ? 'bg-primary border-primary' : 'border-muted-foreground'}`} />
                  {opt.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Outros filtros (Urgência, etc) viriam aqui */}
      </div>

      {/* ÁREA DE TAGS ATIVAS (Para mostrar o que está filtrado) */}
      {selectedStatuses.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center animate-in fade-in slide-in-from-top-1">
          <span className="text-xs text-muted-foreground mr-1">Filtros ativos:</span>
          {selectedStatuses.map(status => {
            const label = STATUS_OPTIONS.find(o => o.value === status)?.label || status
            return (
              <Badge key={status} variant="secondary" className="gap-1 pr-1">
                {label}
                <button 
                  onClick={() => handleStatusChange(status)}
                  className="hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs text-muted-foreground"
            onClick={() => setFilters((prev: any) => ({ ...prev, status: '' }))}
          >
            Limpar tudo
          </Button>
        </div>
      )}
    </div>
  )
}