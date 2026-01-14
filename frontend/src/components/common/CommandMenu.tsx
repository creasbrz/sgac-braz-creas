// frontend/src/components/layout/CommandMenu.tsx
import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { 
  Calendar, Settings, LayoutDashboard, Users, PlusCircle, LogOut, 
  AlertTriangle, FileText, Loader2, type LucideIcon, Search
} from "lucide-react"

import { Dialog, DialogContent } from "@/components/ui/dialog"
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

import { useAuth } from "@/hooks/useAuth"
import { useModal } from "@/hooks/useModal"
import { api } from "@/lib/api"
import { useDebounce } from "@/hooks/useDebounce" // Assumindo que você tem ou criarei abaixo

// --- TIPAGEM ---
type CommandAction = {
  label: string
  icon: LucideIcon
  shortcut?: string
  keywords?: string[]
  action: () => void
  roles?: string[]
}

type CommandSection = {
  heading: string
  items: CommandAction[]
}

export function CommandMenu() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const debouncedQuery = useDebounce(query, 300) // Delay de 300ms
  
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { openNewCaseModal } = useModal()

  // --- BUSCA GLOBAL (Server-Side) ---
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['search-cases-global', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 3) return []
      const res = await api.get('/cases', { 
        params: { q: debouncedQuery, pageSize: 5, view: 'all' } 
      })
      return res.data.data || res.data.items || []
    },
    enabled: open && debouncedQuery.length >= 3,
    staleTime: 1000 * 60 * 2 // Cache por 2 minutos
  })

  // --- CONFIGURAÇÃO DE COMANDOS ---
  const COMMAND_GROUPS: CommandSection[] = React.useMemo(() => [
    {
      heading: "Ações Rápidas",
      items: [
        {
          label: "Novo Caso",
          icon: PlusCircle,
          shortcut: "⌘N",
          keywords: ["criar", "adicionar", "atendimento"],
          action: () => openNewCaseModal(),
          roles: ['Agente_Social', 'Especialista', 'Gerente']
        },
        {
          label: "Minha Agenda",
          icon: Calendar,
          keywords: ["compromissos", "calendario"],
          action: () => navigate("/dashboard/agenda")
        }
      ]
    },
    {
      heading: "Navegação",
      items: [
        {
          label: "Dashboard",
          icon: LayoutDashboard,
          keywords: ["inicio", "home", "estatisticas"],
          action: () => navigate("/dashboard")
        },
        {
          label: "Gestão de Casos",
          icon: Users,
          keywords: ["familias", "prontuarios", "lista"],
          action: () => navigate("/dashboard/cases")
        },
        {
          label: "Fila de Espera",
          icon: AlertTriangle,
          keywords: ["paefi", "demanda", "pendencias"],
          action: () => navigate("/dashboard/waiting-list")
        },
        {
          label: "Grupos e Oficinas",
          icon: Users,
          keywords: ["coletivo", "reuniao"],
          action: () => navigate("/dashboard/groups")
        }
      ]
    },
    {
      heading: "Sistema",
      items: [
        {
          label: "Gestão de Usuários",
          icon: Settings,
          keywords: ["admin", "usuarios", "equipe"],
          action: () => navigate("/dashboard/users"),
          roles: ['Gerente']
        },
        {
          label: "Sair do Sistema",
          icon: LogOut,
          keywords: ["logout", "deslogar"],
          action: () => logout?.()
        }
      ]
    }
  ], [navigate, openNewCaseModal, logout])

  // Atalhos Globais
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
      // Atalho para Novo Caso (Ctrl+N)
      if (e.key === "n" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
         if (user && ['Agente_Social', 'Especialista', 'Gerente'].includes(user.cargo)) {
           e.preventDefault()
           setOpen(false)
           openNewCaseModal()
         }
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [openNewCaseModal, user])

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  const canAccess = (roles?: string[]) => {
    if (!roles) return true
    return user && roles.includes(user.cargo)
  }

  // Lógica para mostrar resultados da busca OU comandos padrão
  const showSearchResults = query.length >= 3;

  return (
    <>
      <p className="fixed bottom-4 right-4 text-xs text-muted-foreground hidden lg:flex items-center gap-2 bg-background/80 p-2 rounded-md border backdrop-blur-sm pointer-events-none z-50 shadow-sm print:hidden animate-in fade-in slide-in-from-bottom-2">
        <span className="font-medium">Comandos</span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 shadow-sm">
          <span className="text-xs">⌘</span>K
        </kbd>
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 shadow-xl max-w-[550px] gap-0">
          <Command 
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
            shouldFilter={!showSearchResults} // Desativa filtro local quando busca remota está ativa
          >
            <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput 
                placeholder="Busque por nome, CPF ou digite um comando..." 
                value={query}
                onValueChange={setQuery}
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            
            <CommandList className="max-h-[300px] overflow-y-auto overflow-x-hidden">
              <CommandEmpty className="py-6 text-center text-sm">
                {isSearching ? (
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" /> 
                    <span>Buscando prontuários...</span>
                  </div>
                ) : (
                  query.length > 0 ? "Nenhum resultado encontrado." : "Comece a digitar..."
                )}
              </CommandEmpty>

              {/* MODO BUSCA: Exibe apenas resultados da API */}
              {showSearchResults && searchResults && (
                <CommandGroup heading="Prontuários Encontrados">
                  {searchResults.map((caso: any) => (
                    <CommandItem
                      key={caso.id}
                      onSelect={() => runCommand(() => navigate(`/dashboard/cases/${caso.id}`))}
                      value={`${caso.nomeCompleto} ${caso.cpf}`} // Value composto para garantir match se o filtro estiver ativo
                      className="aria-selected:bg-primary/10"
                    >
                      <FileText className="mr-2 h-4 w-4 text-primary" />
                      <div className="flex flex-col">
                        <span className="font-medium">{caso.nomeCompleto}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">CPF: {caso.cpf}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {/* MODO COMANDOS: Exibe menus estáticos (se não houver busca ativa ou busca curta) */}
              {!showSearchResults && COMMAND_GROUPS.map((group, groupIndex) => {
                const authorizedItems = group.items.filter(item => canAccess(item.roles))
                if (authorizedItems.length === 0) return null

                return (
                  <React.Fragment key={group.heading}>
                    {groupIndex > 0 && <CommandSeparator /> }
                    <CommandGroup heading={group.heading}>
                      {authorizedItems.map((item) => (
                        <CommandItem 
                          key={item.label} 
                          onSelect={() => runCommand(item.action)}
                          value={item.label} // Importante para o filtro local funcionar
                        >
                          <item.icon className="mr-2 h-4 w-4 opacity-70" />
                          <span>{item.label}</span>
                          {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </React.Fragment>
                )
              })}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}