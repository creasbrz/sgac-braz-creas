// [CORREÇÃO] Adicionado 'useMemo' aos imports
import { useState, Suspense, lazy, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft, Calendar, MapPin, Phone, FileText, Clock, AlertTriangle,
  Paperclip, Activity, Edit, CheckCircle2, Circle, ShieldCheck, Network, 
  Loader2, Users, PackageCheck, Printer, Copy
} from "lucide-react"
import { clsx } from "clsx"

// Imports para o Formulário Padronizado
import { useForm, Controller, type SubmitHandler } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

import { CaseStatusBadge } from "@/components/case/CaseStatusBadge"
import { getUrgencyColor } from "@/constants/caseConstants"
import { isValidBrazilianPhone } from "@/utils/phone"
import { format, parse, isAfter } from "date-fns"
import { ptBR } from "date-fns/locale"
import { formatCPF, formatPhone } from '@/utils/formatters'

// Gerador de PDF
import { generateCasePDF } from '@/utils/pdfGenerator'

// Abas
import { OverviewTab } from '@/components/case/tabs/OverviewTab'
import { ReferralsTab } from '@/components/case/tabs/ReferralsTab'
import { FamilyTab } from '@/components/case/tabs/FamilyTab'
import { DeliverablesTab } from '@/components/case/tabs/DeliverablesTab'

// Lazy Components
const CaseForm = lazy(() => import("@/components/case/CaseForm").then(module => ({ default: module.CaseForm })))
const CaseHistory = lazy(() => import("@/components/case/CaseHistory").then(module => ({ default: module.CaseHistory })))
const CaseEvolutions = lazy(() => import("@/components/case/CaseEvolutions").then(module => ({ default: module.CaseEvolutions })))
import { CaseAttachments } from "@/components/case/CaseAttachments"
const WhatsAppButton = lazy(() => import("@/components/common/WhatsAppButton").then(module => ({ default: module.WhatsAppButton })))
const CaseActions = lazy(() => import("@/components/case/CaseActions").then(module => ({ default: module.CaseActions })))
const PafSection = lazy(() => import("@/components/case/PafSection").then(module => ({ default: module.PafSection })))

import type { CaseDetailData } from '@/types/case'

// Cores Institucionais para Agendamento
const TYPE_COLORS: Record<string, string> = {
  'Atendimento': '#2563eb', // Azul
  'Visita': '#16a34a',      // Verde
  'Retorno': '#f97316',     // Laranja
  'Reunião': '#9333ea',     // Roxo
  'Grupo': '#7c3aed',       // Roxo Escuro
  'Outro': '#64748b'        // Cinza
}

function combineDateAndTime(dateStr: string, timeStr: string): string {
  try {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date())
    const [hours, minutes] = timeStr.split(':').map(Number)
    date.setHours(hours, minutes, 0, 0)
    return date.toISOString()
  } catch (e) {
    return new Date().toISOString()
  }
}

const appointmentFormSchema = z.object({
  titulo: z.string().min(1, 'O título é obrigatório.'),
  data: z.string().min(1, 'Data obrigatória'),
  time: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (HH:MM).'),
  tipo: z.string(),
  observacoes: z.string(),
})

type AppointmentFormData = z.infer<typeof appointmentFormSchema>

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

// Workflow Visual do Caso
function CaseWorkflow({ status }: { status: string }) {
  const steps = [
    { id: 'AGUARDANDO_ACOLHIDA', label: 'Triagem' },
    { id: 'EM_ACOLHIDA', label: 'Acolhida' },
    { id: 'AGUARDANDO_DISTRIBUICAO', label: 'Distribuição' },
    { id: 'EM_ACOLHIDA_ESPECIALIZADA', label: 'Acolhida Esp.' },
    { id: 'EM_ACOMPANHAMENTO', label: 'Acompanhamento' },
    { id: 'EM_MONITORAMENTO', label: 'Monitoramento' },
    { id: 'DESLIGADO', label: 'Finalizado' }
  ]

  const currentIndex = steps.findIndex(s => s.id === status)
  const activeIndex = currentIndex === -1 ? 0 : currentIndex

  return (
    <div className="w-full overflow-x-auto py-6">
       <div className="min-w-[800px] flex items-center justify-between relative px-4">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted -z-10 rounded-full" />
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary -z-10 transition-all duration-700 ease-out rounded-full shadow-sm" 
          style={{ width: `${(activeIndex / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, index) => {
          const isCompleted = index <= activeIndex
          const isCurrent = index === activeIndex

          return (
            <div key={step.id} className="flex flex-col items-center gap-3 bg-background px-2 z-10 group cursor-default">
               <div 
                className={clsx(
                  "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-sm",
                  isCompleted ? "bg-primary border-primary text-primary-foreground" : "bg-muted border-muted-foreground/30 text-muted-foreground",
                  isCurrent && "ring-4 ring-primary/10 scale-110"
                )}
              >
                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
              </div>
               <span className={clsx("text-xs font-semibold uppercase tracking-tight transition-colors", isCurrent ? "text-primary" : "text-muted-foreground/70")}>
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
      {/* Informações Principais */}
      <div className="space-y-3 flex-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Button variant="ghost" size="sm" className="-ml-2 h-8 px-2 hover:bg-muted/80" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <span className="text-xs text-muted-foreground/30">•</span>
          <Badge variant="secondary" className="text-[10px] tracking-wider font-normal bg-muted text-muted-foreground border-border">
             {caseData.orgaoDemandante}
          </Badge>
          {caseData.origem && (
             <Badge variant="outline" className="text-[10px] tracking-wider font-normal border-primary/20 text-primary/80">
                {caseData.origem.replace('_', ' ')}
             </Badge>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary text-2xl font-bold flex items-center justify-center border border-primary/10 shadow-sm shrink-0">
            {initial}
          </div>
          
          <div>
             <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">{caseData.nomeCompleto}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <CaseStatusBadge status={caseData.status} />
              <Badge variant="outline" className={`${getUrgencyColor(caseData.urgencia)} border bg-background/50`}>
                {caseData.urgencia || "Não classificado"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground mt-2 pl-1 sm:pl-[5.25rem]">
          <div className="flex items-center gap-2" title="CPF">
            <FileText className="h-4 w-4 opacity-70" /> 
            <span className="font-medium">{formatCPF(caseData.cpf)}</span>
          </div>
          
          <div className="flex items-center gap-2 group cursor-pointer" title="Telefone">
            <Phone className="h-4 w-4 opacity-70" />
            <span className="font-medium">{formatPhone(caseData.telefone) || "Sem telefone"}</span>
            {isValidBrazilianPhone(caseData.telefone) && (
              <Suspense fallback={null}>
                <WhatsAppButton 
                  phone={caseData.telefone!} 
                  name={caseData.nomeCompleto} 
                  template="geral" 
                  size="icon" 
                  variant="ghost" 
                  label=""
                  className="h-6 w-6 ml-1" 
                />
              </Suspense>
            )}
           </div>

          <div className="flex items-center gap-2 max-w-md truncate" title={caseData.endereco}>
            <MapPin className="h-4 w-4 opacity-70" /> 
            <span>{caseData.endereco || "Endereço não informado"}</span>
          </div>
        </div>
      </div>

      {/* Ações da Página - Refinado */}
      <div className="flex flex-col items-end gap-3 mt-4 md:mt-0">
        <div className="flex items-center gap-2 bg-muted/20 p-1.5 rounded-xl border border-border/50 shadow-sm">
          <Button variant="ghost" size="sm" onClick={() => generateCasePDF(caseData)} className="text-muted-foreground hover:text-foreground h-8">
            <Printer className="mr-2 h-4 w-4" /> Prontuário
          </Button>

          <div className="w-px h-4 bg-border mx-1"></div>

          <Dialog>
            <DialogTrigger asChild>
               <Button variant="ghost" size="sm" onClick={onEdit} className="text-muted-foreground hover:text-foreground h-8">
                <Edit className="mr-2 h-4 w-4" /> Editar
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>

        <Suspense fallback={<Button disabled variant="outline" size="sm">...</Button>}>
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

  const { control, handleSubmit, reset, formState: { errors } } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      titulo: '',
      data: format(new Date(), 'yyyy-MM-dd'),
      time: '09:00',
      tipo: 'Atendimento',
      observacoes: ''
    }
  })

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

  // Ordenação de Agendamentos (Futuros primeiro)
  const appointmentsList = useMemo(() => {
    const list = Array.isArray(appointmentsQuery.data) ? appointmentsQuery.data : []
    return list.sort((a: any, b: any) => new Date(b.data || b.start).getTime() - new Date(a.data || a.start).getTime())
  }, [appointmentsQuery.data])

  const { mutate: createAppointment, isPending: isCreatingAppt } = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      const isoDate = combineDateAndTime(data.data, data.time)
      await api.post("/appointments", {
        titulo: data.titulo,
        data: isoDate,
        tipo: data.tipo,
        observacoes: data.observacoes,
        casoId: id
      })
    },
    onSuccess: () => {
      toast.success("Agendamento criado com sucesso!")
      setIsApptOpen(false)
      reset()
      queryClient.invalidateQueries({ queryKey: ["appointments", id] })
      queryClient.invalidateQueries({ queryKey: ["case-logs", id] })
    },
    onError: () => toast.error("Erro ao criar agendamento.")
  })

  const onSubmitAppt: SubmitHandler<AppointmentFormData> = (data) => createAppointment(data)

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
        <div className="flex items-center gap-2 mt-2 bg-muted p-2 rounded text-xs font-mono select-all">
           ID: {id} <Copy className="h-3 w-3 cursor-pointer" onClick={() => navigator.clipboard.writeText(id!)}/>
        </div>
        <div className="flex gap-2 mt-6">
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
        <TabsList className="w-full justify-start h-auto p-1 bg-muted/40 border border-border/50 overflow-x-auto flex-wrap gap-1 rounded-lg">
          <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary">
            <Activity className="h-4 w-4" /> Visão Geral
          </TabsTrigger>
          
          <TabsTrigger value="family" className="gap-2 data-[state=active]:bg-background data-[state=active]:text-primary">
             <Users className="h-4 w-4" /> Família
          </TabsTrigger>

          <TabsTrigger value="deliverables" className="gap-2 data-[state=active]:bg-background data-[state=active]:text-primary">
            <PackageCheck className="h-4 w-4" /> Benefícios
          </TabsTrigger>

          {['EM_ACOLHIDA_ESPECIALIZADA', 'EM_ACOMPANHAMENTO', 'DESLIGADO'].includes(caseData.status) && (
            <TabsTrigger value="paf" className="gap-2 data-[state=active]:bg-background data-[state=active]:text-primary">
              <FileText className="h-4 w-4" /> PAF
            </TabsTrigger>
          )}

          <TabsTrigger value="evolutions" className="gap-2 data-[state=active]:bg-background data-[state=active]:text-primary">
            <FileText className="h-4 w-4" /> Evoluções
          </TabsTrigger>
          
          <TabsTrigger value="referrals" className="gap-2 data-[state=active]:bg-background data-[state=active]:text-primary">
            <Network className="h-4 w-4" /> Rede
          </TabsTrigger>

          <TabsTrigger value="appointments" className="gap-2 data-[state=active]:bg-background data-[state=active]:text-primary">
            <Calendar className="h-4 w-4" /> Agendamentos
           </TabsTrigger>
          <TabsTrigger value="attachments" className="gap-2 data-[state=active]:bg-background data-[state=active]:text-primary">
            <Paperclip className="h-4 w-4" /> Anexos
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-background data-[state=active]:text-primary">
            <ShieldCheck className="h-4 w-4" /> Auditoria
          </TabsTrigger>
        </TabsList>

        <div className="min-h-[400px]">
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
                    <CardTitle className="text-lg">Agendamentos e Compromissos</CardTitle>
                    <CardDescription>Histórico de atendimentos e visitas</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setIsApptOpen(true)} className="shadow-sm">
                    <Calendar className="mr-2 h-4 w-4"/> Novo Agendamento
                  </Button>
                </CardHeader>
                <CardContent>
                   {appointmentsQuery.isLoading ? <TabSkeleton /> : (appointmentsList.length === 0 ? <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">Nenhum agendamento registrado.</div> : (
                     <div className="space-y-3">
                        {appointmentsList.map((app: any) => {
                          const safeDate = app.start || app.data;
                          const safeTitle = app.title || app.titulo;
                          const isFuture = safeDate && isAfter(new Date(safeDate), new Date());
                          const typeColor = TYPE_COLORS[app.tipo] || TYPE_COLORS['Outro'];
                          
                          return (
                           <div 
                              key={app.id} 
                              className={clsx(
                                "flex items-center justify-between p-4 border rounded-lg transition-all border-l-[4px]",
                                isFuture ? "bg-card shadow-sm hover:shadow-md" : "bg-muted/10 opacity-70 hover:opacity-100"
                              )}
                              style={{ borderLeftColor: typeColor }}
                           >
                              <div className="flex gap-4">
                                <div className={clsx("p-2.5 rounded-lg h-fit", isFuture ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                                  <Clock className="h-5 w-5"/>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-sm flex items-center gap-2">
                                    {safeTitle}
                                    {isFuture && <Badge variant="secondary" className="text-[10px] h-5">Em breve</Badge>}
                                  </h4>
                                  <div className="flex flex-col sm:flex-row gap-1 sm:gap-3 text-sm text-muted-foreground mt-0.5">
                                    <span className="capitalize">{safeDate ? format(new Date(safeDate), "eeee, dd 'de' MMMM", { locale: ptBR }) : "Data a definir"}</span>
                                    <span className="hidden sm:inline">•</span>
                                    <span>{safeDate ? format(new Date(safeDate), "HH:mm", { locale: ptBR }) : "--:--"}</span>
                                    <span className="hidden sm:inline">•</span>
                                    <span className="font-medium" style={{ color: typeColor }}>{app.tipo || 'Geral'}</span>
                                  </div>
                                </div>
                              </div>
                              <Suspense fallback={null}>
                                {isValidBrazilianPhone(caseData.telefone) && safeDate && isFuture && (
                                  <WhatsAppButton 
                                    phone={caseData.telefone!} 
                                    name={caseData.nomeCompleto} 
                                    template="agendamento" 
                                    data={{ date: safeDate }} 
                                    label="Confirmar" 
                                    size="sm" 
                                    variant="outline"
                                  />
                                )}
                              </Suspense>
                           </div>
                          )
                        })}
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
        </div>
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
        <DialogContent className="sm:max-w-[500px]">
           <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
            <DialogDescription>Vinculado ao caso de {caseData.nomeCompleto}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmitAppt)} className="space-y-6 py-2">
            
            {/* Bloco 1: O Que */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-3 w-3" /> Detalhes da Atividade
              </h4>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="titulo">Título</Label>
                  <Controller
                    name="titulo"
                    control={control}
                    render={({ field }) => <Input id="titulo" placeholder="Ex: Visita Domiciliar" {...field} />}
                  />
                  {errors.titulo && <p className="text-xs text-destructive">{errors.titulo.message}</p>}
                </div>

                <div className="space-y-1">
                  <Label>Tipo</Label>
                  <Controller
                    name="tipo"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[field.value || 'Atendimento'] }} />
                              {field.value}
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(TYPE_COLORS).filter(t => t !== 'Grupo').map(type => (
                            <SelectItem key={type} value={type}>
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[type] }} />
                                {type}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Bloco 2: Quando */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-3 w-3" /> Data e Hora
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="data">Data</Label>
                  <Controller
                    name="data"
                    control={control}
                    render={({ field }) => <Input type="date" id="data" {...field} />}
                  />
                  {errors.data && <p className="text-xs text-destructive">{errors.data.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="time">Hora</Label>
                  <Controller
                    name="time"
                    control={control}
                    render={({ field }) => <Input type="time" id="time" {...field} />}
                  />
                  {errors.time && <p className="text-xs text-destructive">{errors.time.message}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="obs">Observações (Opcional)</Label>
                <Controller
                  name="observacoes"
                  control={control}
                  render={({ field }) => (
                    <Textarea id="obs" placeholder="Detalhes adicionais..." className="resize-none h-20 text-sm" {...field} value={field.value || ''} />
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsApptOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isCreatingAppt}>
                {isCreatingAppt && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Agendar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  )
}