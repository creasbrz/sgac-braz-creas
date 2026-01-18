// frontend/src/pages/CaseDetail.tsx
import { useState, Suspense, lazy } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeft, Calendar, FileText, AlertTriangle,
  Paperclip, LayoutDashboard, Edit, ShieldCheck, Network, 
  Users, PackageCheck, User, Loader2, ClipboardList
} from "lucide-react" 
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { api } from '@/lib/api'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { CaseStatusBadge } from "@/components/case/CaseStatusBadge"
import { isValidBrazilianPhone } from "@/utils/phone"
import { formatCPF } from '@/utils/formatters'

// [CORREÇÃO] Importando o template recém-criado
import { PDFDownloadButton } from '@/components/reports/PDFDownloadButton'
import { CaseDoc } from '@/components/reports/templates/CaseDoc'

// Componentes de Conteúdo (Abas)
import { OverviewTab } from '@/components/case/tabs/OverviewTab'
import { ReferralsTab } from '@/components/case/tabs/ReferralsTab'
import { FamilyTab } from '@/components/case/tabs/FamilyTab'
import { DeliverablesTab } from '@/components/case/tabs/DeliverablesTab'
import { AppointmentsTab } from "@/components/case/tabs/AppointmentsTab"
import { PafTab } from "@/components/case/tabs/PafTab"

// Componentes de Layout
import { CaseWorkflow } from "@/components/case/CaseWorkflow"
import { CaseContactList } from "@/components/case/CaseContactList"
import { CaseAddressCard } from "@/components/case/CaseAddressCard"
import { AttachmentsTab } from "@/components/case/tabs/AttachmentsTab"
import { CaseActions } from "@/components/case/CaseActions"

// Lazy Loading
const CaseForm = lazy(() => import("@/components/case/CaseForm").then(module => ({ default: module.CaseForm })))
const HistoryTab = lazy(() => import("@/components/case/tabs/HistoryTab").then(module => ({ default: module.CaseHistory })))
const CaseEvolutions = lazy(() => import("@/components/case/tabs/EvolutionsTab").then(module => ({ default: module.EvolutionsTab })))

import type { CaseDetailData } from '@/types/case'

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

function TabSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded-md" />
      <div className="h-32 w-full bg-muted/50 rounded-xl" />
    </div>
  )
}

// Header Minimalista com Botão PDF Atualizado
function MinimalHeader({ caseData, onEdit }: { caseData: CaseDetailData; onEdit: () => void }) {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground p-0 px-2" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <div className="flex items-center gap-2">
            
            {/* [CORREÇÃO] Removido className, apenas props suportadas */}
            <PDFDownloadButton 
              document={<CaseDoc data={caseData} />}
              fileName={`Prontuario_${caseData.nomeCompleto.replace(/\s+/g, '_')}.pdf`}
              label="PDF"
              variant="outline"
              size="sm"
            />
            
            <Button variant="default" size="sm" onClick={onEdit} className="h-8 text-xs">
               <Edit className="mr-2 h-3.5 w-3.5" /> Editar
            </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="h-14 w-14 md:h-16 md:w-16 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold shrink-0 border border-primary/20 select-none">
           {caseData.nomeCompleto.charAt(0)}
        </div>
        
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">{caseData.nomeCompleto}</h1>
            <CaseStatusBadge status={caseData.status} />
          </div>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
             <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 opacity-70"/> {formatCPF(caseData.cpf)}</span>
             <span className="hidden md:inline text-border">|</span>
             <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 opacity-70"/> {new Date(caseData.nascimento).toLocaleDateString()}</span>
             {caseData.origem && (
               <>
                <span className="hidden md:inline text-border">|</span>
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] tracking-wide">{caseData.origem.replace('_', ' ')}</Badge>
               </>
             )}
          </div>
        </div>

        <div className="w-full md:w-auto mt-2 md:mt-0">
           <Suspense fallback={<div className="h-9 w-32 bg-muted rounded" />}>
              <CaseActions caseId={caseData.id} status={caseData.status} currentSpecialistId={caseData.especialistaPAEFI?.id} />
           </Suspense>
        </div>
      </div>
    </div>
  )
}

// Sidebar Lateral (Mantido inalterado)
function SidebarInfo({ caseData }: { caseData: CaseDetailData }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="p-3 px-4 border-b bg-muted/20">
          <h3 className="font-semibold flex items-center gap-2 text-sm"><User className="h-4 w-4 text-primary"/> Ficha Rápida</h3>
        </div>
        <div className="p-4 space-y-5 text-sm">
           <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Responsável</p>
              <div className="flex items-start gap-2">
                 <div className="mt-0.5"><Users className="h-3.5 w-3.5 text-muted-foreground/70" /></div>
                 <div>
                    <p className="font-medium leading-tight">{caseData.responsavelLegal || "Não informado"}</p>
                    {caseData.parentescoResponsavel && <p className="text-xs text-muted-foreground mt-0.5">{caseData.parentescoResponsavel}</p>}
                 </div>
              </div>
           </div>
           <Separator />
           <div>
             <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2">Contatos</p>
             <CaseContactList contatos={caseData.contatos} telefoneAntigo={caseData.telefone} />
           </div>
           <Separator />
           <div>
             <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2">Localização</p>
             <CaseAddressCard caseData={caseData} />
           </div>
        </div>
      </div>
    </div>
  )
}

// --- PÁGINA PRINCIPAL ---

export function CaseDetail() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'overview'
  const navigate = useNavigate()
  
  const [isEditOpen, setIsEditOpen] = useState(false)

  const { data: caseData, isLoading, isError, refetch } = useQuery<CaseDetailData>({
    queryKey: ["case", id],
    queryFn: async () => (await api.get(`/cases/${id}`)).data,
    enabled: !!id,
    staleTime: 60 * 1000, 
  })

  if (isLoading) return <div className="container max-w-7xl py-10"><TabSkeleton /></div>
  
  if (isError || !caseData) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
      <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
      <h2 className="text-xl font-semibold text-foreground">Caso não encontrado</h2>
      <div className="flex items-center gap-2 mt-2 bg-muted p-2 rounded text-xs font-mono select-all">ID: {id}</div>
      <Button variant="link" onClick={() => navigate("/cases")} className="mt-4">Voltar para Lista</Button>
    </div>
  )

  const handleTabChange = (val: string) => setSearchParams(prev => { prev.set('tab', val); return prev }, { replace: true })

  return (
    <div className="container mx-auto max-w-7xl pb-10 space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header */}
      <MinimalHeader caseData={caseData} onEdit={() => setIsEditOpen(true)} />

      {/* 2. Workflow */}
      <CaseWorkflow status={caseData.status} />

      {/* 3. TABS CONTAINER */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        
        {/* BARRA DE ABAS */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 border-b w-full">
          <TabsList className="bg-transparent h-auto p-0 w-full justify-start overflow-x-auto scrollbar-hide flex gap-2">
            {[
              { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
              { id: 'evolutions', label: 'Evoluções', icon: FileText },
              { id: 'family', label: 'Família', icon: Users },
              
              { id: 'paf', label: 'Plano (PAF)', icon: ClipboardList },
              
              { id: 'appointments', label: 'Agenda', icon: Calendar },
              { id: 'deliverables', label: 'Benefícios', icon: PackageCheck },
              { id: 'referrals', label: 'Rede', icon: Network },
              { id: 'attachments', label: 'Anexos', icon: Paperclip },
              { id: 'history', label: 'Auditoria', icon: ShieldCheck },
            ].map(tab => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className={cn(
                  "rounded-full border border-transparent px-4 py-2 text-sm whitespace-nowrap transition-all flex items-center gap-2",
                  "data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20",
                  "text-muted-foreground hover:bg-muted"
                )}
              >
                <tab.icon className="h-4 w-4" /> {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* LAYOUT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-6">
          
          {/* CONTEÚDO PRINCIPAL (9 COLUNAS) */}
          <div className="lg:col-span-9 min-w-0">
            <div className="min-h-[400px]">
              <Suspense fallback={<TabSkeleton />}>
                <TabsContent value="overview" className="space-y-6 mt-0 animate-in fade-in slide-in-from-left-2">
                  <OverviewTab caseData={caseData} />
                  <div className="lg:hidden mt-8"><SidebarInfo caseData={caseData} /></div>
                </TabsContent>
                
                <TabsContent value="evolutions" className="mt-0"><CaseEvolutions caseId={id!} /></TabsContent>
                <TabsContent value="family" className="mt-0"><FamilyTab caseId={id!} titularRenda={Number(caseData.renda) || 0} /></TabsContent>
                
                <TabsContent value="paf" className="mt-0 animate-in fade-in">
                  <PafTab caseData={caseData} />
                </TabsContent>

                <TabsContent value="deliverables" className="mt-0"><DeliverablesTab caseId={id!} /></TabsContent>
                <TabsContent value="referrals" className="mt-0"><ReferralsTab caseId={id!} /></TabsContent>
                <TabsContent value="attachments" className="mt-0"><AttachmentsTab caseId={id!} onError={() => {}} /></TabsContent>
                <TabsContent value="history" className="mt-0"><HistoryTab caseId={id!} showOnlyLogs /></TabsContent>
                
                <TabsContent value="appointments" className="mt-0">
                  <AppointmentsTab 
                    caseId={id!} 
                    caseName={caseData.nomeCompleto} 
                    phone={isValidBrazilianPhone(caseData.telefone) ? caseData.telefone : null} 
                  />
                </TabsContent>
              </Suspense>
            </div>
          </div>

          {/* SIDEBAR (3 COLUNAS) */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-20">
             <SidebarInfo caseData={caseData} />
          </aside>

        </div>
      </Tabs>

      {/* MODAL DE EDIÇÃO */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Editar Prontuário</DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-2">
            <Suspense fallback={<div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <CaseForm initialData={caseData} caseId={id} onCaseCreated={() => {setIsEditOpen(false); refetch()}} />
            </Suspense>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}