// frontend/src/components/DataTableFilters.tsx
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { 
  X, Filter, AlertTriangle, Tag, Users, Fingerprint, Activity 
} from "lucide-react"
import { OPTIONS } from "@/constants/options"

// Tipagem estrita dos filtros
export interface FilterState {
  status: string
  urgencia: string
  violacao: string
  categoria: string
  sexo: string
}

interface FiltersProps {
  filters: FilterState
  setFilters: (key: keyof FilterState, value: string) => void
  onClear: () => void
}

// Helper para normalizar opções (converte string[] para {label, value}[])
const normalizeOptions = (options: any[]) => {
  return options.map(opt => {
    if (typeof opt === 'string') return { label: opt, value: opt }
    return opt // Assume que já é { label, value }
  })
}

export function DataTableFilters({ filters, setFilters, onClear }: FiltersProps) {
  
  // Configuração Centralizada dos Filtros
  const FILTER_CONFIG = [
    {
      key: 'status',
      label: 'Status',
      icon: Activity,
      width: 'w-[160px]',
      options: OPTIONS.status // Já é objeto {label, value}
    },
    {
      key: 'urgencia',
      label: 'Urgência',
      icon: AlertTriangle,
      width: 'w-[160px]',
      options: normalizeOptions(OPTIONS.urgencia)
    },
    {
      key: 'violacao',
      label: 'Violação',
      icon: Fingerprint,
      width: 'w-[160px]',
      options: normalizeOptions(OPTIONS.violacao)
    },
    {
      key: 'categoria',
      label: 'Categoria',
      icon: Tag,
      width: 'w-[150px]',
      options: normalizeOptions(OPTIONS.categoria)
    },
    {
      key: 'sexo',
      label: 'Sexo',
      icon: Users,
      width: 'w-[130px]',
      options: normalizeOptions(OPTIONS.sexo)
    }
  ] as const

  // Verifica se há algum filtro ativo (diferente de '' ou 'all')
  const activeFilterCount = Object.values(filters).filter(val => val && val !== 'all').length
  const hasActiveFilters = activeFilterCount > 0

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 p-1">
      
      {/* Label visual (Opcional, mas ajuda no contexto) */}
      <div className="flex items-center text-sm font-medium text-muted-foreground mr-2">
        <Filter className="mr-2 h-4 w-4" />
        Filtros
      </div>

      {/* Loop de Renderização dos Selects */}
      {FILTER_CONFIG.map((config) => (
        <Select 
          key={config.key} 
          value={filters[config.key as keyof FilterState]} 
          onValueChange={(val) => setFilters(config.key as keyof FilterState, val)}
        >
          <SelectTrigger className={`${config.width} h-9 bg-background border-dashed hover:border-solid transition-all`}>
            <div className="flex items-center gap-2 truncate">
              <config.icon className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder={config.label} />
            </div>
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value="all" className="text-muted-foreground font-medium">
              Todos
            </SelectItem>
            <Separator className="my-1 opacity-50"/>
            {config.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {/* Botão de Limpar (Só aparece se houver filtros) */}
      {hasActiveFilters && (
        <>
          <div className="h-6 w-px bg-border mx-2 hidden sm:block" /> {/* Separador vertical */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClear} 
            className="h-9 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <X className="mr-2 h-4 w-4" /> 
            Limpar ({activeFilterCount})
          </Button>
        </>
      )}
    </div>
  )
}