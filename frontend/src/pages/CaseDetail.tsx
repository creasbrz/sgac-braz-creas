// frontend/src/pages/CaseDetail.tsx
import React, { useState, Suspense, lazy } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft, Calendar, MapPin, Phone, FileText, Clock, AlertTriangle,
  Paperclip, Activity, Edit, CheckCircle2, Circle, User, ShieldCheck, Loader2
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { clsx } from "clsx"

import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
// [CORREÇÃO AQUI]: Adicionado DialogDescription aos imports
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter, 
  DialogDescription 
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

import { CaseStatusBadge } from "@/components/CaseStatusBadge"
import { getUrgencyColor } from "@/constants/caseConstants"
import { isValidBrazilianPhone } from "@/utils/phone" 

// --- LAZY IMPORTS ---
const CaseForm = lazy(() => import("@/components/CaseForm").then(module => ({ default: module.CaseForm })))
const CaseHistory = lazy(() => import("@/components/case/CaseHistory").then(module => ({ default: module.CaseHistory })))
const CaseEvolutions = lazy(() => import("@/components/case/CaseEvolutions").then(module => ({ default: module.CaseEvolutions })))
const CaseAttachments = lazy(() => import("@/components/case/CaseAttachments").then(module => ({ default: module.CaseAttachments })))
const WhatsAppButton = lazy(() => import("@/components/common/WhatsAppButton").then(module => ({ default: module.WhatsAppButton })))
const CaseActions = lazy(() => import("@/components/case/CaseActions").then(module => ({ default: module.CaseActions })))

// --- TYPES ---
interface CaseDetailData {
  id: string
  nomeCompleto: string
  cpf: string
  status: string
  urgencia: string
  violacao: string
  categoria: string
  orgaoDemandante: string
  telefone?: string
  endereco?: string
  dataEntrada: string
  dataDesligamento?: string
  motivoDesligamento?: string
  observacoes?: string
  numeroSei?: string
  beneficios?: string[]
  agenteAcolhida?: { id: string; nome: string }
  especialistaPAEFI?: { id: string; nome: string }
}

// --- UTILS ---
function formatDateSafe(date?: string | Date | null) {
  if (!date) return "-"
  try { return format(new Date(date), "dd/MM/yyyy", { locale: ptBR }) } catch { return "-" }
}

function TabSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-1/3" />
      <div className="grid gap-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-10 w-2/3" />
      </div>
    </div>
  )
}

// --- COMPONENTE: WORKFLOW VISUAL ---
function CaseWorkflow({ status }: { status: string }) {
  const steps = [
    { id: 'AGUARDANDO_ACOLHIDA', label: 'Triagem' },
    { id: 'EM_ACOLHIDA', label: 'Acolhida' },
    { id: 'AGUARDANDO_DISTRIBUICAO_PAEFI', label: 'Distribuição' },
    { id: 'EM_ACOMPANHAMENTO_PAEFI', label: 'Acompanhamento' },
    { id: 'DESLIGADO', label: 'Finalizado' }
  ]

  const currentIndex = steps.findIndex(s => s.id === status)
  const activeIndex = currentIndex === -1 ? 0 : currentIndex

  return (
    <div className="w-full overflow-x-auto py-4">
      <div className="min-w-[600px] flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted -z-10" />
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary -z-10 transition-all duration-500" 
          style={{ width: `${(activeIndex / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, index) => {
          const isCompleted = index <= activeIndex
          const isCurrent = index === activeIndex

          return (
            <div key={step.id} className="flex flex-col items-center gap-2 bg-background px-2">
              <div 
                className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors",
                  isCompleted ? "bg-primary border-primary text-primary-foreground" : "bg-muted border-muted-foreground text-muted-foreground",
                  isCurrent && "ring-4 ring-primary/20"
                )}
              >
                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
              </div>
              <span className={clsx("text-xs font-medium", isCompleted ? "text-primary" : "text-muted-foreground")}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// --- COMPONENTE: HEADER ---
function CaseHeader({ caseData, onEdit }: { caseData: CaseDetailData; onEdit: () => void }) {
  const initial = (caseData.nomeCompleto || "U").charAt(0).toUpperCase()
  
  return (
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
      <div className="space-y-2 flex-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Button variant="ghost" size="sm" className="-ml-2 h-8" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <span className="text-xs text-muted-foreground/50">•</span>
          <Badge variant="secondary" className="text-[10px] tracking-wider font-normal">
            {caseData.orgaoDemandante || "DEMANDA ESPONTÂNEA"}
          </Badge>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 text-primary text-2xl font-bold flex items-center justify-center border-2 border-background shadow-sm shrink-0">
            {initial}
          </div>
          
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{caseData.nomeCompleto}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <CaseStatusBadge status={caseData.status} />
              <Badge variant="outline" className={`${getUrgencyColor(caseData.urgencia)} border`}>
                {caseData.urgencia || "Não classificado"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-4 pl-1 sm:pl-20">
          <div className="flex items-center gap-1.5" title="CPF">
            <FileText className="h-4 w-4" /> {caseData.cpf}
          </div>
          
          <div className="flex items-center gap-1.5 group cursor-pointer" title="Telefone">
            <Phone className="h-4 w-4" />
            <span>{caseData.telefone || "Sem telefone"}</span>
            {isValidBrazilianPhone(caseData.telefone) && (
              <Suspense fallback={null}>
                <WhatsAppButton 
                  phone={caseData.telefone!} 
                  name={caseData.nomeCompleto} 
                  template="geral" 
                  size="icon" 
                  variant="ghost" 
                  label="" 
                />
              </Suspense>
            )}
          </div>

          <div className="flex items-center gap-1.5 max-w-md truncate" title={caseData.endereco}>
            <MapPin className="h-4 w-4" /> {caseData.endereco || "Endereço não informado"}
          </div>
        </div>
      </div>

      <div className="flex gap-2 pl-1 sm:pl-0 mt-4 md:mt-0 items-start">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={onEdit} className="shadow-sm">
              <Edit className="mr-2 h-4 w-4" /> Editar
            </Button>
          </DialogTrigger>
        </Dialog>

        <Suspense fallback={<Button disabled variant="outline">...</Button>}>
          <CaseActions 
            caseId={caseData.id} 
            status={caseData.status} 
            currentSpecialistId={caseData.especialistaPAEFI?.id} 
          />
        </Suspense>
      </div>
    </div>
  )
}

// --- COMPONENTE PRINCIPAL ---
export function CaseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  
  // Estados para Novo Agendamento
  const [isApptOpen, setIsApptOpen] = useState(false)
  const [apptTitle, setApptTitle] = useState("")
  const [apptDate, setApptDate] = useState("")
  const [apptObs, setApptObs] = useState("")

  // 1. Fetch Principal
  const { data: caseData, isLoading, isError, refetch } = useQuery<CaseDetailData>({
    queryKey: ["case", id],
    queryFn: async () => (await api.get(`/cases/${id}`)).data,
    enabled: !!id,
    staleTime: 1000 * 60,
  })

  // 2. Fetch Agendamentos
  const appointmentsQuery = useQuery({
    queryKey: ["appointments", id],
    queryFn: async () => {
      try { return (await api.get(`/cases/${id}/appointments`)).data }
      catch { return (await api.get(`/appointments`, { params: { caseId: id } })).data }
    },
    enabled: !!id && activeTab === "appointments",
    staleTime: 1000 * 30,
  })

  const appointmentsList = React.useMemo(() => {
    const data = appointmentsQuery.data
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data.items)) return data.items 
    return [] 
  }, [appointmentsQuery.data])

  // 3. Mutação: Criar Agendamento
  const { mutate: createAppointment, isPending: isCreatingAppt } = useMutation({
    mutationFn: async () => {
      await api.post("/appointments", {
        titulo: apptTitle,
        data: new Date(apptDate).toISOString(),
        observacoes: apptObs,
        casoId: id
      })
    },
    onSuccess: () => {
      toast.success("Agendamento criado com sucesso!")
      setIsApptOpen(false)
      setApptTitle("")
      setApptDate("")
      setApptObs("")
      queryClient.invalidateQueries({ queryKey: ["appointments", id] })
      queryClient.invalidateQueries({ queryKey: ["case-logs", id] })
    },
    onError: () => toast.error("Erro ao criar agendamento.")
  })

  if (isLoading) {
    return (
      <div className="p-8 space-y-8 container mx-auto max-w-6xl">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2 w-full max-w-md">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-[200px] w-full rounded-xl" />
      </div>
    )
  }

  if (isError || !caseData) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground animate-in zoom-in-95">
        <div className="bg-destructive/10 p-4 rounded-full mb-4">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Caso não encontrado</h2>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={() => navigate("/cases")}>Voltar para Lista</Button>
          <Button onClick={() => refetch()}>Tentar Novamente</Button>
        </div>
      </div>
    )
  }

  const handleOpenEdit = () => setIsEditOpen(true)

  return (
    <div className="container mx-auto max-w-6xl py-6 space-y-8 animate-in fade-in duration-500">
      
      <CaseHeader caseData={caseData} onEdit={handleOpenEdit} />

      <Separator />

      <CaseWorkflow status={caseData.status} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start h-auto p-1 bg-muted/40 border border-border/50 overflow-x-auto flex-wrap gap-1">
          <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Activity className="h-4 w-4" /> Visão Geral
          </TabsTrigger>
          <TabsTrigger value="evolutions" className="gap-2 data-[state=active]:bg-background">
            <FileText className="h-4 w-4" /> Evoluções
          </TabsTrigger>
          <TabsTrigger value="appointments" className="gap-2 data-[state=active]:bg-background">
            <Calendar className="h-4 w-4" /> Agendamentos
          </TabsTrigger>
          <TabsTrigger value="attachments" className="gap-2 data-[state=active]:bg-background">
            <Paperclip className="h-4 w-4" /> Anexos
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-background">
            <ShieldCheck className="h-4 w-4" /> Auditoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6 focus-visible:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 shadow-sm border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Ficha Técnica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                  <div><span className="text-xs font-medium text-muted-foreground uppercase">Violação</span><p className="font-medium">{caseData.violacao}</p></div>
                  <div><span className="text-xs font-medium text-muted-foreground uppercase">Categoria</span><p className="font-medium">{caseData.categoria}</p></div>
                  <div><span className="text-xs font-medium text-muted-foreground uppercase">Entrada</span><p className="font-medium">{formatDateSafe(caseData.dataEntrada)}</p></div>
                  <div><span className="text-xs font-medium text-muted-foreground uppercase">SEI</span><p className="font-mono">{caseData.numeroSei || "-"}</p></div>
                </div>
                {caseData.observacoes && (
                  <div className="pt-4 mt-2 border-t border-border/50">
                    <span className="text-xs font-medium text-muted-foreground uppercase mb-2 block">Observações</span>
                    <div className="bg-muted/30 p-3 rounded-md text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{caseData.observacoes}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="shadow-sm border-border/60">
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Equipe Técnica</CardTitle></CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div><span className="text-xs text-muted-foreground block mb-1">Agente (Acolhida)</span><div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-emerald-500" /><span className="text-sm font-medium">{caseData.agenteAcolhida?.nome || "Pendente"}</span></div></div>
                  <Separator />
                  <div><span className="text-xs text-muted-foreground block mb-1">Especialista (PAEFI)</span><div className="flex items-center gap-2"><div className={`h-2 w-2 rounded-full ${caseData.especialistaPAEFI ? 'bg-blue-500' : 'bg-gray-300'}`} /><span className="text-sm font-medium">{caseData.especialistaPAEFI?.nome || "Aguardando"}</span></div></div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/60">
                <CardHeader className="pb-2"><CardTitle className="text-base">Benefícios</CardTitle></CardHeader>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap gap-2">
                    {caseData.beneficios && caseData.beneficios.length > 0 ? caseData.beneficios.map(b => <Badge key={b} variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">{b}</Badge>) : <span className="text-xs text-muted-foreground italic">Nenhum declarado.</span>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="evolutions" className="mt-6">
          <Suspense fallback={<TabSkeleton />}>
            <CaseEvolutions caseId={id!} />
          </Suspense>
        </TabsContent>

        <TabsContent value="appointments" className="mt-6">
          <Suspense fallback={<TabSkeleton />}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Agendamentos</CardTitle>
                  <CardDescription>Gestão de comparecimentos</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => setIsApptOpen(true)}>
                  <Calendar className="mr-2 h-4 w-4"/> Novo
                </Button>
              </CardHeader>
              <CardContent>
                {appointmentsQuery.isLoading ? <TabSkeleton /> : (appointmentsList.length === 0 ? <div className="text-center py-10 text-muted-foreground">Nenhum agendamento.</div> : (
                   <div className="space-y-3">
                     {appointmentsList.map((app: any) => (
                       <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/5 transition-all">
                         <div className="flex gap-4"><div className="bg-primary/10 p-2.5 rounded-lg h-fit text-primary"><Clock className="h-5 w-5"/></div><div><h4 className="font-semibold text-sm">{app.titulo}</h4><p className="text-sm text-muted-foreground capitalize">{format(new Date(app.data), "eeee, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}</p></div></div>
                         <Suspense fallback={null}>{isValidBrazilianPhone(caseData.telefone) && <WhatsAppButton phone={caseData.telefone!} name={caseData.nomeCompleto} template="agendamento" data={{ date: app.data }} label="Confirmar" size="sm" />}</Suspense>
                       </div>
                     ))}
                   </div>
                 ))}
              </CardContent>
            </Card>
          </Suspense>
        </TabsContent>

        <TabsContent value="attachments" className="mt-6">
          <Suspense fallback={<TabSkeleton />}>
            <CaseAttachments caseId={id!} onError={() => toast.error("Erro ao carregar anexos.")} />
          </Suspense>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Suspense fallback={<TabSkeleton />}>
            <CaseHistory caseId={id!} showOnlyLogs />
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* MODAL DE EDIÇÃO */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Prontuário</DialogTitle></DialogHeader>
          <Suspense fallback={<div className="h-64 flex items-center justify-center"><Skeleton className="h-10 w-10 rounded-full animate-spin" /></div>}>
            <CaseForm initialData={caseData} caseId={caseData.id} onCaseCreated={() => { setIsEditOpen(false); refetch(); }} />
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* MODAL DE NOVO AGENDAMENTO */}
      <Dialog open={isApptOpen} onOpenChange={setIsApptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
            <DialogDescription>Marcar atendimento para {caseData.nomeCompleto}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="titulo">Título / Tipo</Label>
              <Input id="titulo" placeholder="Ex: Atendimento Psicossocial" value={apptTitle} onChange={(e) => setApptTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="data">Data e Hora</Label>
              <Input id="data" type="datetime-local" value={apptDate} onChange={(e) => setApptDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="obs">Observações</Label>
              <Textarea id="obs" placeholder="Detalhes do agendamento..." value={apptObs} onChange={(e) => setApptObs(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApptOpen(false)}>Cancelar</Button>
            <Button onClick={() => createAppointment()} disabled={!apptTitle || !apptDate || isCreatingAppt}>
              {isCreatingAppt && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}