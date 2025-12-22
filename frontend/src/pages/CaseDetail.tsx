// frontend/src/pages/CaseDetail.tsx
import { useState, Suspense, lazy } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft, Calendar, MapPin, Phone, FileText, Clock, AlertTriangle,
  Paperclip, Activity, Edit, CheckCircle2, Circle, ShieldCheck, Network, 
  Loader2, Users, PackageCheck, Printer
} from "lucide-react"
import { clsx } from "clsx"

import { api } from '@/lib/api'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

import { CaseStatusBadge } from "@/components/CaseStatusBadge"
import { getUrgencyColor } from "@/constants/caseConstants"
import { isValidBrazilianPhone } from "@/utils/phone"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { formatCPF, formatPhone } from '@/utils/formatters'

// Gerador de PDF
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import { OverviewTab } from '@/components/case/tabs/OverviewTab'
import { ReferralsTab } from '@/components/case/tabs/ReferralsTab'
import { FamilyTab } from '@/components/case/tabs/FamilyTab'
import { DeliverablesTab } from '@/components/case/tabs/DeliverablesTab'

const CaseForm = lazy(() => import("@/components/CaseForm").then(module => ({ default: module.CaseForm })))
const CaseHistory = lazy(() => import("@/components/case/CaseHistory").then(module => ({ default: module.CaseHistory })))
const CaseEvolutions = lazy(() => import("@/components/case/CaseEvolutions").then(module => ({ default: module.CaseEvolutions })))
const CaseAttachments = lazy(() => import("@/components/case/CaseAttachments").then(module => ({ default: module.CaseAttachments })))
const WhatsAppButton = lazy(() => import("@/components/common/WhatsAppButton").then(module => ({ default: module.WhatsAppButton })))
const CaseActions = lazy(() => import("@/components/case/CaseActions").then(module => ({ default: module.CaseActions })))
const PafSection = lazy(() => import("@/components/case/PafSection").then(module => ({ default: module.PafSection })))

import type { CaseDetailData } from '@/types/case'

// Função Geradora de PDF (CORRIGIDA)
const generateCasePDF = (caso: any) => {
  const doc = new jsPDF()
  const today = new Date().toLocaleDateString('pt-BR')

  doc.setFillColor(41, 37, 36)
  doc.rect(0, 0, 210, 30, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('PRONTUÁRIO TÉCNICO - CREAS', 105, 12, { align: 'center' })
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Gerado em: ${today} • Confidencial`, 105, 20, { align: 'center' })

  let y = 45
  doc.setTextColor(0, 0, 0)

  // 1. IDENTIFICAÇÃO
  doc.setFontSize(12).setFont('helvetica', 'bold').text('1. IDENTIFICAÇÃO', 14, y)
  doc.setLineWidth(0.5).line(14, y + 2, 196, y + 2)
  y += 10
  
  doc.setFontSize(10).setFont('helvetica', 'normal')
  doc.text(`Nome: ${caso.nomeCompleto}`, 14, y)
  doc.text(`CPF: ${caso.cpf || '-'}`, 120, y)
  y += 7
  doc.text(`Data Nasc.: ${caso.nascimento ? new Date(caso.nascimento).toLocaleDateString('pt-BR') : '-'}`, 14, y)
  doc.text(`Telefone: ${caso.telefone || '-'}`, 120, y)
  y += 7
  doc.text(`Endereço: ${caso.endereco}`, 14, y)
  
  // Benefícios Fixos (Array)
  if (caso.beneficios && caso.beneficios.length > 0) {
    y += 7
    doc.text(`Benefícios Ativos: ${caso.beneficios.join(', ')}`, 14, y)
  }
  y += 15

  // 2. FAMÍLIA (Usando relação correta 'familia')
  doc.setFontSize(12).setFont('helvetica', 'bold').text('2. COMPOSIÇÃO FAMILIAR', 14, y)
  doc.line(14, y + 2, 196, y + 2)
  y += 5

  if (caso.familia && caso.familia.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Nome', 'Parentesco', 'Idade', 'Renda']],
      body: caso.familia.map((m: any) => [
        m.nome, 
        m.parentesco, 
        m.idade ? `${m.idade} anos` : '-',
        m.renda ? `R$ ${m.renda}` : '-'
      ]),
      theme: 'striped',
      styles: { fontSize: 9 }
    })
    // @ts-ignore
    y = doc.lastAutoTable.finalY + 15
  } else {
    doc.setFont('helvetica', 'italic').text('Sem registros familiares.', 14, y + 5)
    y += 15
  }

  // 3. BENEFÍCIOS EVENTUAIS E REDE
  if (y > 220) { doc.addPage(); y = 20 }
  
  doc.setFontSize(12).setFont('helvetica', 'bold').text('3. BENEFÍCIOS EVENTUAIS E REDE', 14, y)
  doc.line(14, y + 2, 196, y + 2)
  y += 5

  doc.setFontSize(10).text('Benefícios Eventuais (Entregas):', 14, y + 5)
  
  // [CORREÇÃO] Usando 'entregas' (ServiceDeliverable)
  const benData = caso.entregas?.length ? caso.entregas.map((b: any) => [
      new Date(b.dataSolicitacao).toLocaleDateString('pt-BR'),
      b.tipo,
      b.status
  ]) : [['-', 'Nenhum', '-']]

  autoTable(doc, {
      startY: y + 8,
      head: [['Data', 'Item', 'Status']],
      body: benData,
      theme: 'plain',
      tableWidth: 85,
      margin: { left: 14 },
      styles: { fontSize: 8 }
  })

  // @ts-ignore
  const finalYBen = doc.lastAutoTable.finalY
  
  doc.text('Encaminhamentos (Rede):', 110, y + 5)
  
  const encData = caso.encaminhamentos?.length ? caso.encaminhamentos.map((e: any) => [
      new Date(e.dataEnvio).toLocaleDateString('pt-BR'),
      e.instituicao,
      e.status
  ]) : [['-', 'Nenhum', '-']]

  autoTable(doc, {
      startY: y + 8,
      head: [['Data', 'Local', 'Status']],
      body: encData,
      theme: 'plain',
      tableWidth: 85,
      margin: { left: 110 },
      styles: { fontSize: 8 }
  })

  // @ts-ignore
  y = Math.max(finalYBen, doc.lastAutoTable.finalY) + 20

  // 4. EVOLUÇÕES
  if (y > 250) { doc.addPage(); y = 20 }
  doc.setFontSize(12).setFont('helvetica', 'bold').text('4. HISTÓRICO TÉCNICO', 14, y)
  doc.line(14, y + 2, 196, y + 2)
  y += 5

  if (caso.evolucoes && caso.evolucoes.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Data', 'Técnico', 'Descrição']],
      body: caso.evolucoes.map((e: any) => [
        new Date(e.createdAt).toLocaleDateString('pt-BR') + ' ' + new Date(e.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
        e.autor?.nome || 'Sistema',
        e.conteudo
      ]),
      theme: 'grid',
      headStyles: { fillColor: [50, 50, 50] },
      columnStyles: { 
        0: { cellWidth: 30 },
        1: { cellWidth: 35 },
        2: { cellWidth: 'auto' } 
      },
      styles: { fontSize: 9, cellPadding: 3 }
    })
  } else {
    doc.setFont('helvetica', 'italic').text('Sem evoluções registradas.', 14, y + 5)
  }

  doc.save(`prontuario_${caso.nomeCompleto.replace(/\s/g, '_')}.pdf`)
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

function CaseWorkflow({ status }: { status: string }) {
  const steps = [
    { id: 'AGUARDANDO_ACOLHIDA', label: 'Triagem' },
    { id: 'EM_ACOLHIDA', label: 'Acolhida' },
    { id: 'AGUARDANDO_DISTRIBUICAO_PAEFI', label: 'Distribuição' },
    { id: 'EM_ACOLHIDA_ESPECIALIZADA', label: 'Acolhida Esp.' },
    { id: 'EM_ACOMPANHAMENTO_PAEFI', label: 'Acompanhamento' },
    { id: 'EM_MONITORAMENTO', label: 'Monitoramento' },
    { id: 'DESLIGADO', label: 'Finalizado' }
  ]

  const currentIndex = steps.findIndex(s => s.id === status)
  const activeIndex = currentIndex === -1 ? 0 : currentIndex

  return (
    <div className="w-full overflow-x-auto py-4">
       <div className="min-w-[800px] flex items-center justify-between relative px-2">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted -z-10 rounded-full" />
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary -z-10 transition-all duration-500 rounded-full" 
          style={{ width: `${(activeIndex / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, index) => {
          const isCompleted = index <= activeIndex
          const isCurrent = index === activeIndex

          return (
            <div key={step.id} className="flex flex-col items-center gap-2 bg-background px-2 z-10">
               <div 
                className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300",
                  isCompleted ? "bg-primary border-primary text-primary-foreground" : "bg-muted border-muted-foreground/30 text-muted-foreground",
                  isCurrent && "ring-4 ring-primary/20 scale-110"
                )}
              >
                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
              </div>
               <span className={clsx("text-xs font-medium transition-colors", isCurrent ? "text-primary font-bold" : "text-muted-foreground")}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

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
             {caseData.orgaoDemandante}
          </Badge>
          {caseData.origem && (
             <Badge variant="outline" className="text-[10px] tracking-wider font-normal border-primary/20 text-primary">
                {caseData.origem.replace('_', ' ')}
             </Badge>
          )}
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
            <FileText className="h-4 w-4" /> {formatCPF(caseData.cpf)}
          </div>
          
          <div className="flex items-center gap-1.5 group cursor-pointer" title="Telefone">
            <Phone className="h-4 w-4" />
            <span>{formatPhone(caseData.telefone) || "Sem telefone"}</span>
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

      <div className="flex flex-wrap gap-2 pl-1 sm:pl-0 mt-4 md:mt-0 items-start justify-end">
        {/* BOTÃO PRONTUÁRIO */}
        <Button variant="outline" onClick={() => generateCasePDF(caseData)} className="shadow-sm">
          <Printer className="mr-2 h-4 w-4" /> Prontuário
        </Button>

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

export function CaseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  
  const [isApptOpen, setIsApptOpen] = useState(false)
  const [apptTitle, setApptTitle] = useState("")
  const [apptDate, setApptDate] = useState("")
  const [apptObs, setApptObs] = useState("")

  const { data: caseData, isLoading, isError, refetch } = useQuery<CaseDetailData>({
    queryKey: ["case", id],
    queryFn: async () => (await api.get(`/cases/${id}`)).data,
    enabled: !!id,
    staleTime: 1000 * 60,
  })

  const appointmentsQuery = useQuery({
    queryKey: ["appointments", id],
    queryFn: async () => {
      try { return (await api.get(`/appointments`, { params: { caseId: id } })).data }
      catch { return [] }
    },
    enabled: !!id && activeTab === "appointments",
    staleTime: 1000 * 30,
  })

  const appointmentsList = Array.isArray(appointmentsQuery.data) ? appointmentsQuery.data : []

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
          
          <TabsTrigger value="family" className="gap-2 data-[state=active]:bg-background">
             <Users className="h-4 w-4" /> Família
          </TabsTrigger>

          <TabsTrigger value="deliverables" className="gap-2 data-[state=active]:bg-background">
            <PackageCheck className="h-4 w-4" /> Benefícios
          </TabsTrigger>

          {/* Mostrar PAF se estiver em acompanhamento, acolhida especializada ou desligado */}
          {['EM_ACOLHIDA_ESPECIALIZADA', 'EM_ACOMPANHAMENTO_PAEFI', 'DESLIGADO'].includes(caseData.status) && (
            <TabsTrigger value="paf" className="gap-2 data-[state=active]:bg-background">
              <FileText className="h-4 w-4" /> PAF
            </TabsTrigger>
          )}

          <TabsTrigger value="evolutions" className="gap-2 data-[state=active]:bg-background">
            <FileText className="h-4 w-4" /> Evoluções
          </TabsTrigger>
          
          <TabsTrigger value="referrals" className="gap-2 data-[state=active]:bg-background">
            <Network className="h-4 w-4" /> Rede
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

        <TabsContent value="overview" className="mt-6 focus-visible:outline-none">
           <OverviewTab caseData={caseData} />
        </TabsContent>

        <TabsContent value="family" className="mt-6">
          <Suspense fallback={<TabSkeleton />}>
            <FamilyTab caseId={id!} />
          </Suspense>
        </TabsContent>

        <TabsContent value="deliverables" className="mt-6">
           <Suspense fallback={<TabSkeleton />}>
              <DeliverablesTab caseId={id!} />
           </Suspense>
        </TabsContent>

        <TabsContent value="paf" className="mt-6">
          <Suspense fallback={<TabSkeleton />}>
            <PafSection caseData={caseData} />
          </Suspense>
        </TabsContent>

        <TabsContent value="evolutions" className="mt-6">
          <Suspense fallback={<TabSkeleton />}>
            <CaseEvolutions caseId={id!} />
          </Suspense>
        </TabsContent>

        <TabsContent value="referrals" className="mt-6">
          <Suspense fallback={<TabSkeleton />}>
            <ReferralsTab caseId={id!} />
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

       <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Prontuário</DialogTitle></DialogHeader>
          <Suspense fallback={<div className="h-64 flex items-center justify-center"><Skeleton className="h-10 w-10 rounded-full animate-spin" /></div>}>
            <CaseForm initialData={caseData} caseId={caseData.id} onCaseCreated={() => { setIsEditOpen(false); refetch(); }} />
          </Suspense>
        </DialogContent>
      </Dialog>

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