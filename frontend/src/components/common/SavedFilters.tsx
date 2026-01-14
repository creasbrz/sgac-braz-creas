// frontend/src/components/SavedFilters.tsx
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Bookmark, Trash2, Save, Loader2, Star, FilterX } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

// --- TYPES ---
interface SavedFiltersProps {
  currentFilters: Record<string, any>
  onApply: (filters: Record<string, any>) => void
}

interface FilterItem {
  id: string
  nome: string
  config: Record<string, any>
}

// --- CUSTOM HOOK (Data Logic) ---
function useSavedFilters() {
  const queryClient = useQueryClient()

  const { data: filters = [], isLoading } = useQuery<FilterItem[]>({
    queryKey: ["saved-filters"],
    queryFn: async () => (await api.get("/filters")).data,
    staleTime: 1000 * 60 * 5, // Cache de 5 min
  })

  const saveMutation = useMutation({
    mutationFn: async (payload: { nome: string; config: any }) => {
      await api.post("/filters", payload)
    },
    onSuccess: () => {
      toast.success("Filtro salvo com sucesso!")
      queryClient.invalidateQueries({ queryKey: ["saved-filters"] })
    },
    onError: () => toast.error("Erro ao salvar filtro.")
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await api.delete(`/filters/${id}`),
    onSuccess: () => {
      toast.success("Filtro removido.")
      queryClient.invalidateQueries({ queryKey: ["saved-filters"] })
    },
    onError: () => toast.error("Erro ao remover.")
  })

  return { filters, isLoading, saveMutation, deleteMutation }
}

// --- COMPONENTE PRINCIPAL ---
export function SavedFilters({ currentFilters, onApply }: SavedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [newName, setNewName] = useState("")
  
  const { filters, isLoading, saveMutation, deleteMutation } = useSavedFilters()

  // Handler para Salvar
  const handleSave = () => {
    // 1. Limpa filtros vazios ou 'all'
    const activeFilters = Object.fromEntries(
      Object.entries(currentFilters).filter(([_, v]) => v !== "" && v !== "all" && v !== null)
    )

    // 2. Validações
    if (!newName.trim()) return toast.warning("Digite um nome para o filtro.")
    if (Object.keys(activeFilters).length === 0) return toast.warning("Aplique algum filtro antes de salvar.")

    // 3. Salva
    saveMutation.mutate(
      { nome: newName, config: activeFilters },
      { onSuccess: () => setNewName("") } // Limpa input no sucesso
    )
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 border-dashed text-muted-foreground hover:text-foreground">
          <Bookmark className="mr-2 h-4 w-4" /> 
          Favoritos
        </Button>
      </PopoverTrigger>
      
      <PopoverContent align="start" className="w-[320px] p-0 shadow-lg">
        {/* Cabeçalho e Input */}
        <div className="p-4 bg-muted/10 space-y-3">
          <div className="space-y-1">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /> Filtros Salvos
            </h4>
            <p className="text-xs text-muted-foreground">
              Salve a configuração atual para acesso rápido.
            </p>
          </div>
          
          <div className="flex gap-2">
            <Input 
              placeholder="Nome do filtro (ex: Casos Prioritários)" 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)} 
              className="h-8 text-xs bg-background"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <Button 
              size="sm" 
              className="h-8 w-8 p-0 shrink-0" 
              onClick={handleSave} 
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin"/> : <Save className="h-3.5 w-3.5"/>}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Lista de Filtros */}
        <ScrollArea className="h-[220px]">
          <div className="p-2 space-y-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin"/>
                <span className="text-xs">Carregando...</span>
              </div>
            ) : filters.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2 opacity-60">
                <FilterX className="h-8 w-8 stroke-1"/>
                <p className="text-xs">Nenhum filtro salvo.</p>
              </div>
            ) : (
              filters.map((f) => (
                <div 
                  key={f.id} 
                  className="flex items-center justify-between group rounded-md p-2 hover:bg-accent cursor-pointer transition-all border border-transparent hover:border-border"
                  onClick={() => { 
                    onApply(f.config)
                    setIsOpen(false)
                    toast.success(`Filtro "${f.nome}" aplicado!`)
                  }}
                >
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    <span className="text-sm font-medium truncate">{f.nome}</span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {Object.keys(f.config).length} critérios salvos
                    </span>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all" 
                    disabled={deleteMutation.isPending}
                    onClick={(e) => { 
                      e.stopPropagation()
                      deleteMutation.mutate(f.id) 
                    }}
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin"/>
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}