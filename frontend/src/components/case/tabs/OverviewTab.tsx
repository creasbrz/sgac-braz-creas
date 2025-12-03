// frontend/src/components/case/tabs/OverviewTab.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { FileText, User, AlertTriangle } from 'lucide-react'
import { formatDateSafe } from '@/utils/formatters'
import type { CaseDetailData } from '@/types/case'

/**
 * Componente responsável por exibir o resumo principal do caso.
 * Contém a ficha técnica, observações críticas e a equipe responsável.
 */
export function OverviewTab({ caseData }: { caseData: CaseDetailData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
      
      {/* --- COLUNA ESQUERDA (2/3): Detalhes Técnicos --- */}
      <Card className="md:col-span-2 shadow-sm border-l-4 border-l-primary">
        <CardHeader className="pb-2 bg-muted/10">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Ficha Técnica
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          
          {/* Grid de Informações Chave */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Violação Principal
              </span>
              <p className="font-medium p-2 bg-muted/30 rounded-md border border-muted/50">
                {caseData.violacao}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Categoria
              </span>
              <p className="font-medium p-2 bg-muted/30 rounded-md border border-muted/50">
                {caseData.categoria}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Data de Entrada
              </span>
              <p className="font-medium p-1">
                {formatDateSafe(caseData.dataEntrada)}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Processo SEI
              </span>
              <p className="font-mono mt-1 text-primary font-medium">
                {caseData.numeroSei || "Não informado"}
              </p>
            </div>
          </div>

          {/* Área de Observações (apenas se existir) */}
          {caseData.observacoes && (
            <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-lg mt-4">
              <span className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase mb-2">
                <AlertTriangle className="h-3 w-3" /> Observações Importantes
              </span>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                {caseData.observacoes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- COLUNA DIREITA (1/3): Equipe e Benefícios --- */}
      <div className="space-y-6">
        
        {/* Card da Equipe */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Referência Técnica
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Acolhida</span>
              <div className="flex items-center gap-2">
                {/* Indicador visual de status do técnico */}
                <span className={`h-2 w-2 rounded-full ${caseData.agenteAcolhida ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm font-medium">{caseData.agenteAcolhida?.nome || "Pendente"}</span>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">PAEFI</span>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${caseData.especialistaPAEFI ? 'bg-blue-500' : 'bg-gray-300'}`} />
                <span className="text-sm font-medium">{caseData.especialistaPAEFI?.nome || "Aguardando"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card de Benefícios */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Benefícios Ativos</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-2">
              {caseData.beneficios && caseData.beneficios.length > 0 ? (
                caseData.beneficios.map(b => (
                  <Badge 
                    key={b} 
                    variant="secondary" 
                    className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                  >
                    {b}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground italic">Nenhum benefício declarado.</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}