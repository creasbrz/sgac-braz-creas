// frontend/src/components/common/CommandMenu.tsx
import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { 
  Calendar, Settings, LayoutDashboard, Users, PlusCircle, LogOut, 
  AlertTriangle, FileText, Loader2, Search, type LucideIcon, 
  Briefcase,
  ArrowRight,
  User
} from "lucide-react"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList, 
  CommandSeparator, 
  CommandShortcut 
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"

import { useAuth } from "@/contexts/AuthContext"
import { useModal } from "@/contexts/ModalContext" 
import { api } from "@/lib/api"
import { useDebounce } from "@/hooks/useDebounce"

// --- TYPES ---

interface CaseSearchResult {
  id: string
  nomeCompleto: string
  cpf: string
  status?: string
}

type CommandAction = {
  id: string
  label: string
  icon: LucideIcon
  shortcut?: string
  keywords?: string[]
  action: () => void
  roles?: string[]
}

type CommandSection = {
  id: string
  heading: string
  items: CommandAction[]
}

export function CommandMenu() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const debouncedQuery = useDebounce(query, 300)
  
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { openNewCaseModal } = useModal()

  // --- 1. CONFIGURAÇÃO DE ROTAS E COMANDOS ---
  const commandGroups: CommandSection[] = React.useMemo(() => [
    {
      id: "actions",
      heading: "Ações Rápidas",
      items: [
        {
          id: "new-case",
          label: "Novo Prontuário",
          icon: PlusCircle,
          shortcut: "⌘N",
          keywords: ["criar", "adicionar", "atendimento", "caso"],
          action: () => openNewCaseModal(),
          roles: ['Agente_Social', 'Especialista', 'Gerente']
        },
        {
          id: "agenda",
          label: "Minha Agenda",
          icon: Calendar,
          keywords: ["compromissos", "calendario"],
          action: () => navigate("/app/agenda")
        }
      ]
    },
    {
      id: "navigation",
      heading: "Navegação",
      items: [
        {
          id: "nav-workspace",
          label: "Minha Mesa (Início)",
          icon: LayoutDashboard,
          keywords: ["inicio", "home", "dashboard"],
          action: () => navigate("/app/workspace")
        },
        {
          id: "nav-cases",
          label: "Gestão de Casos",
          icon: Briefcase,
          keywords: ["familias", "prontuarios", "lista"],
          action: () => navigate("/app/cases")
        },
        {
          id: "nav-waiting",
          label: "Fila de Espera",
          icon: AlertTriangle,
          keywords: ["paefi", "demanda", "pendencias"],
          action: () => navigate("/app/waiting-list")
        },
        {
          id: "nav-groups",
          label: "Grupos e Oficinas",
          icon: Users,
          keywords: ["coletivo", "reuniao", "scfv"],
          action: () => navigate("/app/groups")
        }
      ]
    },
    {
      id: "system",
      heading: "Sistema",
      items: [
        {
          id: "sys-users",
          label: "Admin: Usuários",
          icon: Settings,
          keywords: ["admin", "permissoes", "equipe"],
          action: () => navigate("/app/admin/users"),
          roles: ['Gerente']
        },
        {
          id: "sys-profile",
          label: "Meu Perfil",
          icon: User,
          keywords: ["conta", "senha", "dados"],
          action: () => navigate("/app/profile")
        },
        {
          id: "sys-logout",
          label: "Sair",
          icon: LogOut,
          keywords: ["logout", "deslogar"],
          action: () => logout?.()
        }
      ]
    }
  ], [navigate, openNewCaseModal, logout])

  // --- 2. BUSCA GLOBAL (Server-Side) ---
  const { data: searchResults, isLoading: isSearching } = useQuery<CaseSearchResult[]>({
    queryKey: ['search-cases-global', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 3) return []
      try {
        // [CORREÇÃO v1.0.1] Alterado param de 'q' para 'search'
        const res = await api.get('/cases', { 
          params: { search: debouncedQuery, pageSize: 5, view: 'all' } 
        })
        return res.data.data || res.data.items || []
      } catch (error) {
        return []
      }
    },
    enabled: open && debouncedQuery.length >= 3,
    placeholderData: keepPreviousData
  })

  // --- 3. FILTRAGEM LOCAL ---
  const filteredGroups = React.useMemo(() => {
    const lowerQuery = query.toLowerCase()
    return commandGroups.map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (item.roles && user && !item.roles.includes(user.cargo)) return false
        if (!query) return true
        return item.label.toLowerCase().includes(lowerQuery) || 
               item.keywords?.some(k => k.includes(lowerQuery))
      })
    })).filter(group => group.items.length > 0)
  }, [query, commandGroups, user])

  // --- 4. ATALHOS ---
  React.useEffect(() => {
  const down = (e: KeyboardEvent) => {
    // [V1.2] Verifica se já existe um modal aberto usando atributo do Radix UI
    // Radix adiciona 'data-scroll-locked' ao body quando um Dialog/Sheet está aberto
    const isModalOpen = document.body.hasAttribute('data-scroll-locked')
    
    // Se o menu jà estiver aberto, permitimos fechar com o atalho.
    // Se estiver fechado, só permitimos abrir se NÃO houver outro modal na tela.
    if (open || !isModalOpen) {
        if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault()
          setOpen((open) => !open)
        }
        if (e.key === "n" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
           if (user) {
             e.preventDefault()
             setOpen(false)
             openNewCaseModal()
           }
        }
    }
  }
  document.addEventListener("keydown", down)
  return () => document.removeEventListener("keydown", down)
}, [openNewCaseModal, user, open]) // Adicionado 'open' nas dependências

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  return (
    <>
      {/* TRIGGER BUTTON (Floating) */}
      <button 
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 hidden lg:flex items-center gap-2 px-3 py-2 bg-background/90 hover:bg-background border border-border/60 backdrop-blur-md rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 z-50 group ring-1 ring-border/50 hover:ring-primary/20"
      >
        <div className="bg-primary/10 p-1.5 rounded-full group-hover:bg-primary/20 transition-colors text-primary">
            <Search className="h-4 w-4" />
        </div>
        <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground pr-1 transition-colors">
          Navegar
        </span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border/60 bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 shadow-2xl max-w-2xl gap-0 border-none bg-transparent">
          <DialogTitle className="sr-only">Menu de Comandos</DialogTitle>
          
          <Command 
            className="rounded-xl border border-border bg-popover shadow-xl overflow-hidden"
            shouldFilter={false} // Filtro manual
            loop
          >
            {/* HEADER & INPUT */}
            <div className="relative border-b border-border/40 bg-muted/10">
              <CommandInput 
                placeholder="O que você procura? (Ex: 'Silva', 'Novo Caso', 'Agenda')" 
                value={query}
                onValueChange={setQuery}
                className="h-14 text-base px-4 border-none focus:ring-0 bg-transparent"
              />
              {isSearching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-xs text-muted-foreground animate-pulse bg-background/80 px-2 py-1 rounded-md">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span>Buscando...</span>
                </div>
              )}
            </div>
            
            <CommandList className="max-h-125 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              <CommandEmpty className="py-12 text-center text-sm">
                <div className="flex flex-col items-center gap-3 text-muted-foreground/60">
                   <div className="bg-muted p-4 rounded-full">
                      <Search className="h-8 w-8 opacity-40" />
                   </div>
                   <p className="font-medium">{query.length < 3 ? "Digite para buscar..." : "Nenhum resultado encontrado."}</p>
                </div>
              </CommandEmpty>

              {/* --- RESULTADOS DE API (Prontuários) --- */}
              {query.length >= 3 && searchResults && searchResults.length > 0 && (
                <CommandGroup heading="Prontuários e Casos">
                  {searchResults.map((caso) => (
                    <CommandItem
                      key={caso.id}
                      onSelect={() => runCommand(() => navigate(`/app/cases/${caso.id}`))}
                      value={`${caso.nomeCompleto}-${caso.id}`} 
                      className="group flex items-center justify-between py-3 px-3 mx-2 rounded-md aria-selected:bg-primary/10 data-[selected=true]:bg-primary/10 border border-transparent aria-selected:border-primary/20 transition-all cursor-pointer mb-1"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 group-aria-selected:bg-blue-200 dark:group-aria-selected:bg-blue-500/30 transition-colors">
                          <FileText className="h-4.5 w-4.5" />
                        </div>
                        <div className="flex flex-col truncate">
                          <span className="font-semibold text-sm truncate text-foreground group-aria-selected:text-primary transition-colors">
                            {caso.nomeCompleto}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground group-aria-selected:text-muted-foreground/80">
                            <span className="font-mono bg-muted/50 px-1.5 rounded border border-border/50">{caso.cpf}</span>
                            {caso.status && (
                               <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 border-border/60 bg-background/50">
                                 {caso.status}
                               </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center text-muted-foreground/40 group-aria-selected:text-primary/70 transition-colors">
                          <span className="text-[10px] mr-2 hidden sm:inline-block font-medium uppercase tracking-wider">Abrir</span>
                          <ArrowRight className="h-4 w-4" />
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Separador Condicional */}
              {query.length >= 3 && (searchResults?.length ?? 0) > 0 && (
                 <CommandSeparator className="my-2 mx-2 bg-border/40" />
              )}

              {/* --- COMANDOS DO SISTEMA --- */}
              <div className="grid sm:grid-cols-2 gap-2 px-2 pb-2">
                {filteredGroups.map((group) => (
                  <CommandGroup key={group.id} heading={group.heading} className="p-0">
                    {group.items.map((item) => (
                      <CommandItem 
                        key={item.id} 
                        onSelect={() => runCommand(item.action)}
                        value={item.label}
                        className="py-2.5 px-3 rounded-md aria-selected:bg-muted aria-selected:text-foreground cursor-pointer transition-colors"
                      >
                        <item.icon className="mr-3 h-4 w-4 text-muted-foreground/70 group-aria-selected:text-primary" />
                        <span className="flex-1 font-medium text-sm">{item.label}</span>
                        {item.shortcut && <CommandShortcut className="bg-background px-1.5 py-0.5 rounded border border-border/60 text-[10px] font-mono shadow-sm">{item.shortcut}</CommandShortcut>}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </div>

            </CommandList>
            
            {/* FOOTER FIXO */}
            <div className="border-t border-border/40 bg-muted/20 p-2 px-4 text-[10px] text-muted-foreground flex justify-between items-center backdrop-blur-sm">
               <div className="flex gap-4">
                  <span className="flex items-center gap-1.5"><kbd className="bg-background border border-border/60 rounded px-1.5 py-0.5 font-mono shadow-sm">↑↓</kbd> Navegar</span>
                  <span className="flex items-center gap-1.5"><kbd className="bg-background border border-border/60 rounded px-1.5 py-0.5 font-mono shadow-sm">↵</kbd> Selecionar</span>
               </div>
               <div className="font-medium">
                  SGAC <span className="opacity-50 font-normal">v8.0.0</span>
               </div>
            </div>

          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}