// frontend/src/components/case/tabs/OverviewTab.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  FileText, AlertTriangle, 
  Calendar, Tag, Shield, CheckCircle2, Clock, 
  Wallet, Briefcase 
} from 'lucide-react'
import { formatDateSafe } from '@/utils/formatters'
import type { CaseDetailData } from '@/types/case'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// [NOVO] Importação do gerenciador do SEI
import { SeiManager } from '@/components/case/SeiManager'

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

/**
 * Componente auxiliar para exibir um campo de dado com ícone
 */
function InfoField({ icon: Icon, label, value, className }: { icon: any, label: string, value: React.ReactNode, className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
        <Icon className="h-3 w-3" /> {label}
      </span>
      <div className="font-medium text-sm text-foreground break-words bg-muted/30 p-2 rounded-md border border-muted/50 min-h-[40px] flex items-center">
        {value || <span className="text-muted-foreground italic font-normal">Não informado</span>}
      </div>
    </div>
  )
}

/**
 * Componente para exibir membro da equipe com Avatar/Status
 */
function TeamMemberRow({ 
  role, 
  member, 
  colorClass 
}: { 
  role: string, 
  member?: { nome: string } | null, 
  colorClass: string 
}) {
  const initial = member?.nome ? member.nome.charAt(0).toUpperCase() : "?"
  const statusColor = member ? colorClass : "bg-muted text-muted-foreground"
  
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex flex-col">
        <span className="text-[10px] uppercase font-bold text-muted-foreground">{role}</span>
        <span className="text-sm font-medium">{member?.nome || "Pendente"}</span>
      </div>
      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-background shadow-sm", statusColor)}>
        {member ? initial : <Clock className="h-4 w-4" />}
      </div>
    </div>
  )
}

export function OverviewTab({ caseData }: { caseData: CaseDetailData }) {
  
  // Renderização das Violações como Badges
  const renderViolations = () => {
    const violations = Array.isArray(caseData.violacao) 
      ? caseData.violacao 
      : (caseData.violacao ? [caseData.violacao] : []);

    if (violations.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2">
        {violations.map((v) => (
          <Badge 
            key={v} 
            variant="outline" 
            className="bg-destructive/5 text-destructive border-destructive/20 px-2 py-0.5 text-xs font-medium hover:bg-destructive/10 transition-colors"
          >
            <AlertTriangle className="w-3 h-3 mr-1.5" />
            {v}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* --- COLUNA ESQUERDA (2/3): Detalhes Técnicos --- */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="shadow-sm border-l-[3px] border-l-primary h-full">
          <CardHeader className="pb-3 border-b bg-muted/5">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Ficha Técnica do Prontuário
            </CardTitle>
          </CardHeader>
          
          <CardContent className="pt-6 space-y-6">
            
            {/* 1. Seção de Violações Identificadas */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" /> Violações de Direitos Detectadas
              </span>
              <div className="bg-muted/20 p-3 rounded-lg border border-muted/50 min-h-[50px]">
                {renderViolations() || (
                   <span className="text-muted-foreground italic text-sm">Nenhuma violação selecionada</span>
                )}
              </div>
            </div>

            {/* 2. [NOVO] Gerenciador do SEI (Número, Link e Status de Resposta) */}
            <div className="py-1">
              <SeiManager 
                caseId={caseData.id}
                numeroSei={caseData.numeroSei}
                linkSei={caseData.linkSei}
                // Garante valores booleanos mesmo se vier null do banco antigo
                seiRespondido={!!caseData.seiRespondido}
                dataRespostaSei={caseData.dataRespostaSei}
              />
            </div>

            <Separator className="bg-border/60" />

            {/* 3. Grid de Informações Básicas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <InfoField 
                icon={Tag} 
                label="Categoria do Público" 
                value={caseData.categoria} 
              />
              <InfoField 
                icon={Calendar} 
                label="Data de Entrada" 
                value={formatDateSafe(caseData.dataEntrada)} 
              />
            </div>

            {/* 4. Grid Socioeconômico do Titular */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <InfoField 
                icon={Briefcase} 
                label="Ocupação Atual" 
                value={caseData.ocupacao} 
              />
              <InfoField 
                icon={Wallet} 
                label="Renda Individual" 
                value={caseData.renda ? Number(caseData.renda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null} 
                className="text-emerald-700 font-medium"
              />
            </div>

            {/* 5. Área de Observações Críticas */}
            {caseData.observacoes && (
              <div className="mt-2">
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-lg p-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-400" />
                  <h4 className="text-xs font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5" /> Notas Técnicas de Atenção
                  </h4>
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {caseData.observacoes}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- COLUNA DIREITA (1/3): Equipe e Benefícios --- */}
      <div className="space-y-6">
        
        {/* Card da Equipe de Referência */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b bg-muted/5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Equipe de Referência
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
             <TeamMemberRow 
                role="Agente de Acolhida" 
                member={caseData.agenteAcolhida} 
                colorClass="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" 
             />
             <Separator />
             <TeamMemberRow 
                role="Técnico PAEFI" 
                member={caseData.especialistaPAEFI} 
                colorClass="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" 
             />
          </CardContent>
        </Card>

        {/* Card de Benefícios */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b bg-muted/5">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Benefícios Ativos
              </div>
              <Badge variant="outline" className="text-[10px] h-5">{caseData.beneficios?.length || 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-2">
              {caseData.beneficios && caseData.beneficios.length > 0 ? (
                caseData.beneficios.map(b => (
                  <Badge 
                    key={b} 
                    variant="secondary" 
                    className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 text-[10px] py-0.5"
                  >
                    {b}
                  </Badge>
                ))
              ) : (
                <div className="text-center w-full py-6 text-muted-foreground text-xs italic bg-muted/30 rounded-md border border-dashed">
                  Nenhum benefício vinculado.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}