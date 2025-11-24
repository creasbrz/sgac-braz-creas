// frontend/src/components/case/CaseHistory.tsx
import {
  History,
  PlusCircle,
  RefreshCw,
  UserPlus,
  Power,
  AlertCircle
} from "lucide-react"
import { formatDateSafe } from "@/utils/formatters"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import type { CaseLog } from "@/types/case"

interface CaseHistoryProps {
  logs: CaseLog[]
}

export function CaseHistory({ logs }: CaseHistoryProps) {
  const getLogConfig = (acao: string) => {
    switch (acao) {
      case "CRIACAO":
        return { icon: PlusCircle, color: "text-blue-500", bg: "bg-blue-500/10" }
      case "MUDANCA_STATUS":
        return { icon: RefreshCw, color: "text-amber-500", bg: "bg-amber-500/10" }
      case "ATRIBUICAO":
        return { icon: UserPlus, color: "text-purple-500", bg: "bg-purple-500/10" }
      case "DESLIGAMENTO":
        return { icon: Power, color: "text-red-500", bg: "bg-red-500/10" }
      default:
        return { icon: AlertCircle, color: "text-gray-500", bg: "bg-gray-500/10" }
    }
  }

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-1 duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-5 w-5 text-muted-foreground" />
          Histórico de Auditoria (Sistema)
        </CardTitle>
      </CardHeader>

      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum registro de alteração encontrado.
          </p>
        ) : (
          <div className="relative border-l-2 border-muted-foreground/20 ml-3 space-y-6">
            {logs.map((log) => {
              const config = getLogConfig(log.acao)
              const Icon = config.icon

              return (
                <div key={log.id} className="relative pl-8 animate-in fade-in duration-300">
                  {/* Ícone */}
                  <span
                    className={`absolute -left-[11px] top-0 flex h-6 w-6 items-center justify-center rounded-full ${config.bg} ring-4 ring-muted ${config.color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium leading-none text-foreground">
                        {log.descricao}
                      </p>
                      <span className="text-xs text-muted-foreground opacity-80 whitespace-nowrap ml-2">
                        {formatDateSafe(log.createdAt).replace(" ", " às ")}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Realizado por:{" "}
                      <span className="font-medium text-foreground">
                        {log.autor?.nome ?? "Sistema"}
                      </span>
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
