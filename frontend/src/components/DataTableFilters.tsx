import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

// Listas de Filtros
const LIST_URGENCIA = [
  "Risco de morte",
  "Violência física e/ou psicológica",
  "Trabalho infantil",
  "Acolhimento",
  "Sem risco imediato"
]

const LIST_STATUS = [
  { value: "AGUARDANDO_ACOLHIDA", label: "Aguardando Acolhida" },
  { value: "EM_ACOLHIDA", label: "Em Acolhida" },
  { value: "AGUARDANDO_DISTRIBUICAO_PAEFI", label: "Aguardando Distribuição" },
  { value: "EM_ACOMPANHAMENTO_PAEFI", label: "Em Acompanhamento" },
]

const LIST_VIOLACAO = [
  "Negligência",
  "Abandono",
  "Violência física",
  "Violência psicológica",
  "Violência sexual",
  "Trabalho infantil",
  "Outras violações"
]

interface FiltersProps {
  filters: {
    status: string
    urgencia: string
    violacao: string
  }
  setFilters: (key: string, value: string) => void
  onClear: () => void
}

export function DataTableFilters({ filters, setFilters, onClear }: FiltersProps) {
  const hasActiveFilters = filters.status || filters.urgencia || filters.violacao

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">

      {/* Filtro de Status */}
      <Select
        value={filters.status}
        onValueChange={(val) => setFilters("status", val)}
      >
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Status</SelectItem>
          {LIST_STATUS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Filtro de Urgência */}
      <Select
        value={filters.urgencia}
        onValueChange={(val) => setFilters("urgencia", val)}
      >
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder="Urgência" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as Urgências</SelectItem>
          {LIST_URGENCIA.map((u) => (
            <SelectItem key={u} value={u}>
              {u}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Filtro de Violação */}
      <Select
        value={filters.violacao}
        onValueChange={(val) => setFilters("violacao", val)}
      >
        <SelectTrigger className="w-[200px] h-9">
          <SelectValue placeholder="Tipo de Violação" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as Violações</SelectItem>
          {LIST_VIOLACAO.map((v) => (
            <SelectItem key={v} value={v}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Botão Limpar */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-9 px-2 text-muted-foreground hover:text-foreground"
        >
          <X className="mr-2 h-4 w-4" />
          Limpar
        </Button>
      )}
    </div>
  )
}
