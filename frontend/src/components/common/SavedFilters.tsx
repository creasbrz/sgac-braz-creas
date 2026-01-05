// frontend/src/components/SavedFilters.tsx
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Bookmark, Trash2, Save, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

interface SavedFiltersProps {
  currentFilters: any
  onApply: (filters: any) => void
}

interface FilterItem { id: string; nome: string; config: any }

export function SavedFilters({ currentFilters, onApply }: SavedFiltersProps) {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [newName, setNewName] = useState("")

  const { data: filters = [], isLoading } = useQuery<FilterItem[]>({
    queryKey: ["saved-filters"],
    queryFn: async () => (await api.get("/filters")).data,
  })

  const { mutate: saveFilter, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      const configToSave = Object.fromEntries(Object.entries(currentFilters).filter(([_, v]) => v !== "" && v !== "all"))
      if (Object.keys(configToSave).length === 0) throw new Error("Selecione algum filtro.")
      await api.post("/filters", { nome: newName, config: configToSave })
    },
    onSuccess: () => {
      toast.success("Salvo com sucesso!")
      queryClient.invalidateQueries({ queryKey: ["saved-filters"] })
      setNewName("")
    },
    onError: (err: any) => toast.error(err.message || "Erro ao salvar.")
  })

  const { mutate: deleteFilter } = useMutation({
    mutationFn: async (id: string) => await api.delete(`/filters/${id}`),
    onSuccess: () => {
      toast.success("Filtro removido.")
      queryClient.invalidateQueries({ queryKey: ["saved-filters"] })
    }
  })

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 border-dashed">
          <Bookmark className="mr-2 h-4 w-4" /> Favoritos
        </Button>
      </PopoverTrigger>
      
      <PopoverContent align="start" className="w-[300px] p-0">
        <div className="p-4">
          <h4 className="font-medium leading-none mb-2">Filtros Salvos</h4>
          <p className="text-xs text-muted-foreground mb-4">Salve sua vista atual para acesso rápido.</p>
          <div className="flex gap-2">
            <Input placeholder="Nome..." value={newName} onChange={(e) => setNewName(e.target.value)} className="h-8 text-xs"/>
            <Button size="sm" className="h-8 w-8 p-0" onClick={() => saveFilter()} disabled={!newName || isSaving}>
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin"/> : <Save className="h-3 w-3"/>}
            </Button>
          </div>
        </div>
        <Separator />
        <ScrollArea className="h-[200px] p-2">
          {isLoading ? <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin"/></div> : filters.length === 0 ? <p className="text-xs text-center py-8 text-muted-foreground">Vazio.</p> : (
            <div className="space-y-1">
              {filters.map((f) => (
                <div key={f.id} className="flex items-center justify-between group rounded-md px-2 py-1.5 hover:bg-muted transition-colors">
                  <button className="flex-1 text-left text-sm truncate" onClick={() => { onApply(f.config); setIsOpen(false); toast.info(`Filtro "${f.nome}" aplicado.`) }}>{f.nome}</button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteFilter(f.id) }}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}