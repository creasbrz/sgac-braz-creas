// frontend/src/pages/CaseDetail.tsx
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { api } from '../lib/api'
import { ArrowLeft, Loader2, ExternalLink } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import axios from 'axios'
import { useState, type ReactNode } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { statusStyles } from '../constants/caseStatus'
import { ROUTES } from '../constants/routes'
import { useAuth } from '../hooks/useAuth'
import { caseTransitions, type CaseStatus } from '../constants/caseTransitions'

// --- Interfaces de Dados ---
interface CaseDetailData {
  id: string
  nomeCompleto: string
  cpf: string
  nascimento: string
  sexo: string
  telefone: string
  endereco: string
  dataEntrada: string
  urgencia: string
  violacao: string
  categoria: string
  orgaoDemandante: string
  numeroSei: string | null
  linkSei: string | null
  observacoes: string | null
  status: string
  criadoPor: { nome: string }
  agenteAcolhida: { id: string; nome: string } | null
  especialistaPAEFI: { id: string; nome: string } | null
}

interface Evolution {
  id: string
  conteudo: string
  createdAt: string
  autor: { nome: string }
}

interface PafData {
  diagnostico: string
  objetivos: string
  estrategias: string
  prazos: string
  createdAt: string
  autor: { nome: string }
}

// --- Schemas de Validação ---
const evolutionFormSchema = z.object({
  conteudo: z.string().min(10, 'A evolução deve ter no mínimo 10 caracteres.'),
})
type EvolutionFormData = z.infer<typeof evolutionFormSchema>

const pafFormSchema = z.object({
  diagnostico: z.string().min(10, 'O diagnóstico é muito curto.'),
  objetivos: z.string().min(10, 'Defina objetivos claros.'),
  estrategias: z.string().min(10, 'Descreva as estratégias.'),
  prazos: z.string().min(5, 'Defina os prazos.'),
})
type PafFormData = z.infer<typeof pafFormSchema>

// --- Funções Utilitárias de Formatação ---
const formatCPF = (cpf: string) =>
  cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') ?? ''
const formatPhone = (tel: string) =>
  tel?.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') ?? ''
const formatDateSafe = (dateString: string) => {
  try {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return 'Data inválida'
  }
}

// --- Subcomponentes da Página ---

function DetailField({
  label,
  value,
  className = '',
}: {
  label: string
  value: ReactNode | null | undefined
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground whitespace-pre-wrap break-words">
        {value || 'Não informado'}
      </dd>
    </div>
  )
}

function CaseActions({ caseData }: { caseData: CaseDetailData }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)

  const { mutate: updateStatus, isPending } = useMutation({
    mutationFn: async (newStatus: string) => {
      return await api.patch(`/cases/${caseData.id}/status`, {
        status: newStatus,
      })
    },
    onSuccess: () => {
      toast.success('Status do caso atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['case', caseData.id] })
    },
    onError: (error) => {
      toast.error('Falha ao atualizar o status.')
    },
    onSettled: () => {
      setPendingStatus(null)
    },
  })

  const handleUpdateStatus = (newStatus: CaseStatus) => {
    setPendingStatus(newStatus)
    updateStatus(newStatus)
  }

  const isUserResponsible =
    user?.id === caseData.agenteAcolhida?.id ||
    user?.id === caseData.especialistaPAEFI?.id

  const allowedActions =
    caseTransitions[caseData.status as CaseStatus]?.filter(
      (action) =>
        (isUserResponsible || user?.cargo === 'Gerente') &&
        action.allowedRoles.includes(user?.cargo ?? ''),
    ) || []

  if (allowedActions.length === 0) return null

  return (
    <div className="rounded-lg border bg-background p-4">
      <h3 className="text-base font-semibold text-foreground">Ações Rápidas</h3>
      <div className="mt-4 flex flex-wrap gap-4">
        {allowedActions.map((action) => (
          <button
            key={action.nextStatus}
            onClick={() => handleUpdateStatus(action.nextStatus as CaseStatus)}
            disabled={isPending}
            className={clsx(
              'px-4 py-2 text-sm font-medium text-white rounded-md disabled:bg-slate-400 flex items-center justify-center w-48',
              action.style,
            )}
          >
            {isPending && pendingStatus === action.nextStatus ? (
              <Loader2 className="animate-spin" />
            ) : (
              action.label
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function ManagerActions({ caseData }: { caseData: CaseDetailData }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedSpecialist, setSelectedSpecialist] = useState('')

  const { data: specialists, isLoading: isLoadingSpecialists } = useQuery({
    queryKey: ['specialists'],
    queryFn: async () => {
      const response = await api.get('/users/specialists')
      return response.data
    },
  })

  const { mutate: assignSpecialist, isPending } = useMutation({
    mutationFn: async (specialistId: string) => {
      return await api.patch(`/cases/${caseData.id}/assign`, { specialistId })
    },
    onSuccess: () => {
      toast.success('Especialista atribuído com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['case', caseData.id] })
    },
    onError: (error) => {
      toast.error('Falha ao atribuir especialista.')
    },
  })

  if (
    user?.cargo !== 'Gerente' ||
    caseData.status !== 'AGUARDANDO_DISTRIBUICAO_PAEFI'
  ) {
    return null
  }

  const handleAssign = () => {
    if (!selectedSpecialist) {
      toast.error('Por favor, selecione um especialista.')
      return
    }
    assignSpecialist(selectedSpecialist)
  }

  return (
    <div className="rounded-lg border bg-background p-4">
      <h3 className="text-base font-semibold text-foreground">Ações do Gerente</h3>
      <div className="mt-4 flex flex-col sm:flex-row sm:items-end sm:gap-4 space-y-4 sm:space-y-0">
        <div className="flex-1">
          <label
            htmlFor="specialist"
            className="block text-sm font-medium text-muted-foreground mb-1"
          >
            Atribuir a Especialista
          </label>
          <select
            id="specialist"
            value={selectedSpecialist}
            onChange={(e) => setSelectedSpecialist(e.target.value)}
            disabled={isLoadingSpecialists || isPending}
            className="w-full px-3 py-2 border border-input rounded-md shadow-sm bg-background"
          >
            <option value="">
              {isLoadingSpecialists ? 'A carregar...' : 'Selecione...'}
            </option>
            {specialists?.map((s: { id: string; nome: string }) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleAssign}
          disabled={isPending || !selectedSpecialist}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-slate-400 w-full sm:w-auto"
        >
          {isPending ? <Loader2 className="animate-spin" /> : 'Atribuir'}
        </button>
      </div>
    </div>
  )
}

function EvolutionsSection({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EvolutionFormData>({
    resolver: zodResolver(evolutionFormSchema),
  })

  const { data: evolutions, isLoading: isLoadingEvolutions } = useQuery<
    Evolution[]
  >({
    queryKey: ['evolutions', caseId],
    queryFn: async () => {
      const response = await api.get(`/cases/${caseId}/evolutions`)
      return response.data
    },
  })

  const { mutate: createEvolution, isPending } = useMutation({
    mutationFn: async (data: EvolutionFormData) => {
      return await api.post(`/cases/${caseId}/evolutions`, data)
    },
    onSuccess: () => {
      toast.success('Evolução registada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['evolutions', caseId] })
      reset()
    },
    onError: (error) => {
      toast.error('Falha ao registar evolução.')
    },
  })

  const onSubmit: SubmitHandler<EvolutionFormData> = (data) => {
    createEvolution(data)
  }

  return (
    <div className="rounded-lg border bg-background p-4">
      <h3 className="text-base font-semibold text-foreground">
        Histórico de Evoluções
      </h3>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4">
        <textarea
          id="conteudo"
          rows={4}
          {...register('conteudo')}
          className="w-full px-3 py-2 border border-input rounded-md shadow-sm bg-background"
          placeholder="Descreva aqui o atendimento, visita ou encaminhamento..."
        />
        {errors.conteudo && (
          <p className="text-red-500 text-xs mt-1">{errors.conteudo.message}</p>
        )}
        <div className="flex justify-end mt-2">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400 flex items-center"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registar Evolução
          </button>
        </div>
      </form>

      <div className="mt-6 space-y-4">
        {isLoadingEvolutions && <p>A carregar histórico...</p>}
        {evolutions?.map((evo) => (
          <div key={evo.id} className="bg-card p-4 rounded-md border">
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {evo.conteudo}
            </p>
            <p className="text-xs text-muted-foreground mt-2 text-right">
              Registado por {evo.autor.nome} em{' '}
              {formatDateSafe(evo.createdAt)}
            </p>
          </div>
        ))}
        {!isLoadingEvolutions && evolutions?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma evolução registada.
          </p>
        )}
      </div>
    </div>
  )
}

function PafSection({
  caseId,
  caseStatus,
  specialistId,
  currentUserId,
}: {
  caseId: string
  caseStatus: string
  specialistId: string | null | undefined
  currentUserId: string | null
}) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PafFormData>({
    resolver: zodResolver(pafFormSchema),
  })

  const { data: paf, isLoading } = useQuery<PafData | null>({
    queryKey: ['paf', caseId],
    queryFn: async () => {
      const response = await api.get(`/cases/${caseId}/paf`)
      return response.data
    },
  })

  const { mutate: createPaf, isPending } = useMutation({
    mutationFn: async (data: PafFormData) => {
      return await api.post(`/cases/${caseId}/paf`, data)
    },
    onSuccess: () => {
      toast.success('PAF criado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['paf', caseId] })
    },
    onError: (error) => {
      toast.error('Falha ao criar o PAF.')
    },
  })

  const onSubmit: SubmitHandler<PafFormData> = (data) => {
    createPaf(data)
  }

  const canCreatePaf =
    !paf &&
    caseStatus === 'EM_ACOMPANHAMENTO_PAEFI' &&
    specialistId === currentUserId

  return (
    <div className="rounded-lg border bg-background p-4">
      <h3 className="text-base font-semibold text-foreground">
        Plano de Acompanhamento Familiar (PAF)
      </h3>
      {isLoading && (
        <p className="text-sm text-muted-foreground mt-4">A carregar PAF...</p>
      )}
      {!isLoading && paf && (
        <div className="mt-4 space-y-4">
          <DetailField label="Diagnóstico" value={paf.diagnostico} />
          <DetailField label="Objetivos" value={paf.objetivos} />
          <DetailField label="Estratégias" value={paf.estrategias} />
          <DetailField label="Prazos" value={paf.prazos} />
          <p className="text-xs text-muted-foreground pt-4 border-t text-right">
            Criado por {paf.autor.nome} em {formatDateSafe(paf.createdAt)}
          </p>
        </div>
      )}
      {!isLoading && !paf && caseStatus !== 'EM_ACOMPANHAMENTO_PAEFI' && (
        <p className="text-sm text-muted-foreground mt-4">
          O PAF estará disponível quando o caso for atribuído a um especialista.
        </p>
      )}
      {!isLoading && canCreatePaf && (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="diagnostico"
              className="block text-sm font-medium text-muted-foreground"
            >
              Diagnóstico
            </label>
            <textarea
              id="diagnostico"
              rows={3}
              {...register('diagnostico')}
              className="w-full mt-1 border-input rounded-md shadow-sm bg-background"
            />
            {errors.diagnostico && (
              <p className="text-red-500 text-xs">{errors.diagnostico.message}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="objetivos"
              className="block text-sm font-medium text-muted-foreground"
            >
              Objetivos
            </label>
            <textarea
              id="objetivos"
              rows={3}
              {...register('objetivos')}
              className="w-full mt-1 border-input rounded-md shadow-sm bg-background"
            />
            {errors.objetivos && (
              <p className="text-red-500 text-xs">{errors.objetivos.message}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="estrategias"
              className="block text-sm font-medium text-muted-foreground"
            >
              Estratégias
            </label>
            <textarea
              id="estrategias"
              rows={3}
              {...register('estrategias')}
              className="w-full mt-1 border-input rounded-md shadow-sm bg-background"
            />
            {errors.estrategias && (
              <p className="text-red-500 text-xs">{errors.estrategias.message}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="prazos"
              className="block text-sm font-medium text-muted-foreground"
            >
              Prazos
            </label>
            <textarea
              id="prazos"
              rows={2}
              {...register('prazos')}
              className="w-full mt-1 border-input rounded-md shadow-sm bg-background"
            />
            {errors.prazos && (
              <p className="text-red-500 text-xs">{errors.prazos.message}</p>
            )}
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400"
            >
              {isPending ? 'A salvar...' : 'Salvar PAF'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function DetailSkeleton() {
  return (
    <main className="container mx-auto p-4 md:p-8">
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <div className="h-6 w-1/3 bg-muted animate-pulse rounded mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="space-y-2">
                  <div className="h-4 w-1/4 bg-muted animate-pulse rounded"></div>
                  <div className="h-4 w-3/4 bg-muted animate-pulse rounded"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

// --- Componente Principal da Página ---

export function CaseDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()

  const {
    data: caseDetail,
    isLoading,
    isError,
  } = useQuery<CaseDetailData>({
    queryKey: ['case', id],
    queryFn: async () => {
      const response = await api.get(`/cases/${id}`)
      return response.data
    },
    enabled: !!id,
  })

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Link
            to={ROUTES.DASHBOARD}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} />
            Voltar para o Painel
          </Link>
        </div>
      </header>

      {isLoading ? (
        <DetailSkeleton />
      ) : isError || !caseDetail ? (
        <div className="flex h-[calc(100vh-80px)] items-center justify-center text-center">
          <div>
            <h2 className="text-xl font-bold text-destructive">
              Erro ao carregar o caso.
            </h2>
            <p className="text-muted-foreground">
              O caso pode não existir ou ocorreu um erro no servidor.
            </p>
          </div>
        </div>
      ) : (
        <main className="container mx-auto p-4 md:p-6">
          <div className="bg-card p-6 rounded-lg shadow-sm border">
            <div className="border-b pb-4 mb-6">
              <h2 className="text-2xl font-bold text-foreground">
                {caseDetail.nomeCompleto}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-4">
                <span
                  className={clsx(
                    'px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full',
                    statusStyles[caseDetail.status] ??
                      'bg-gray-100 text-gray-800',
                  )}
                >
                  {caseDetail.status}
                </span>
                <p className="text-sm text-muted-foreground">
                  Criado por: {caseDetail.criadoPor.nome}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-lg border bg-background p-4">
                <h3 className="text-base font-semibold text-foreground mb-4">
                  Informações Pessoais
                </h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                  <DetailField
                    label="Nome Completo"
                    value={caseDetail.nomeCompleto}
                  />
                  <DetailField label="CPF" value={formatCPF(caseDetail.cpf)} />
                  <DetailField
                    label="Data de Nascimento"
                    value={formatDateSafe(caseDetail.nascimento)}
                  />
                  <DetailField label="Sexo" value={caseDetail.sexo} />
                  <DetailField
                    label="Telefone"
                    value={formatPhone(caseDetail.telefone)}
                  />
                  <DetailField
                    label="Endereço"
                    value={caseDetail.endereco}
                    className="lg:col-span-2"
                  />
                </dl>
              </div>

              <div className="rounded-lg border bg-background p-4">
                <h3 className="text-base font-semibold text-foreground mb-4">
                  Detalhes do Caso
                </h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                  <DetailField
                    label="Data de Entrada"
                    value={formatDateSafe(caseDetail.dataEntrada)}
                  />
                  <DetailField
                    label="Nível de Urgência"
                    value={caseDetail.urgencia}
                  />
                  <DetailField
                    label="Violação de Direito"
                    value={caseDetail.violacao}
                  />
                  <DetailField
                    label="Categoria do Público"
                    value={caseDetail.categoria}
                  />
                  <DetailField
                    label="Órgão Demandante"
                    value={caseDetail.orgaoDemandante}
                  />
                  <DetailField
                    label="Agente Social (Acolhida)"
                    value={caseDetail.agenteAcolhida?.nome ?? 'Não designado'}
                  />
                  <DetailField
                    label="Especialista PAEFI"
                    value={
                      caseDetail.especialistaPAEFI?.nome ?? 'Não designado'
                    }
                  />
                  <DetailField
                    label="Número do SEI"
                    value={caseDetail.numeroSei}
                  />
                  <DetailField
                    label="Link do SEI"
                    value={
                      caseDetail.linkSei ? (
                        <a
                          href={caseDetail.linkSei}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                          title="Abrir processo no SEI"
                        >
                          Abrir no SEI <ExternalLink size={14} />
                        </a>
                      ) : null
                    }
                  />
                  <div className="lg:col-span-3">
                    <DetailField
                      label="Observações Iniciais"
                      value={caseDetail.observacoes}
                    />
                  </div>
                </dl>
              </div>

              <CaseActions caseData={caseDetail} />
              <ManagerActions caseData={caseDetail} />
              <PafSection
                caseId={caseDetail.id}
                caseStatus={caseDetail.status}
                specialistId={caseDetail.especialistaPAEFI?.id}
                currentUserId={user?.id}
              />
              <EvolutionsSection caseId={caseDetail.id} />
            </div>
          </div>
        </main>
      )}
    </div>
  )
}

