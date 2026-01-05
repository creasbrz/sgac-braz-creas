// frontend/src/components/DataTableFilters.tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { OPTIONS } from "@/constants/options"

interface FiltersProps {
  filters: {
    status: string
    urgencia: string
    violacao: string
    categoria: string
    sexo: string
  }
  setFilters: (key: string, value: string) => void
  onClear: () => void
}

export function DataTableFilters({ filters, setFilters, onClear }: FiltersProps) {
  const hasActiveFilters = Object.values(filters).some(val => val !== '' && val !== 'all')

  return (
    <div className="flex flex-wrap items-center gap-2 mb-2">
      
      <Select value={filters.status} onValueChange={(val) => setFilters('status', val)}>
        <SelectTrigger className="w-[180px] h-9 bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Status</SelectItem>
          {OPTIONS.status.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.urgencia} onValueChange={(val) => setFilters('urgencia', val)}>
        <SelectTrigger className="w-[160px] h-9 bg-background"><SelectValue placeholder="Urgência" /></SelectTrigger>
        <SelectContent className="max-h-[300px]">
          <SelectItem value="all">Todas</SelectItem>
          {OPTIONS.urgencia.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.violacao} onValueChange={(val) => setFilters('violacao', val)}>
        <SelectTrigger className="w-[160px] h-9 bg-background"><SelectValue placeholder="Violação" /></SelectTrigger>
        <SelectContent className="max-h-[300px]">
          <SelectItem value="all">Todas</SelectItem>
          {OPTIONS.violacao.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.categoria} onValueChange={(val) => setFilters('categoria', val)}>
        <SelectTrigger className="w-[140px] h-9 bg-background"><SelectValue placeholder="Categoria" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          {OPTIONS.categoria.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.sexo} onValueChange={(val) => setFilters('sexo', val)}>
        <SelectTrigger className="w-[120px] h-9 bg-background"><SelectValue placeholder="Sexo" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {OPTIONS.sexo.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-9 px-2 text-muted-foreground hover:text-foreground">
          <X className="mr-2 h-4 w-4" /> Limpar
        </Button>
      )}
    </div>
  )
}