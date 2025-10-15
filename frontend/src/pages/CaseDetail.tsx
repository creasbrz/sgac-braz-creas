// frontend/src/pages/CaseDetail.tsx
import { useParams } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { clsx } from 'clsx'

import { CASE_STATUS_MAP, type CaseStatusIdentifier } from '@/constants/caseConstants'
import { useCaseDetail } from '@/hooks/api/useCaseQueries'
import { formatCPF, formatPhone, formatDateSafe } from '@/utils/formatters'
import { CaseActions } from '@/components/case/CaseActions'
import { ManagerActions } from '@/components/case/ManagerActions'
import { PafSection } from '@/components/case/PafSection'
import { EvolutionsSection } from '@/components/case/EvolutionsSection'
import { DetailField } from '@/components/case/DetailField'
import { DetailSkeleton } from '@/components/case/DetailSkeleton'

export function CaseDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: caseDetail, isLoading, isError } = useCaseDetail(id)

  if (isLoading) {
    return <DetailSkeleton />
  }

  if (isError || !caseDetail) {
    return (
      <div className="flex h-full items-center justify-center text-center">
        <div>
          <h2 className="text-xl font-bold text-destructive">
            Erro ao carregar o caso.
          </h2>
          <p className="text-muted-foreground">
            O caso pode não existir ou ocorreu um erro no servidor.
          </p>
        </div>
      </div>
    )
  }
  const statusInfo = CASE_STATUS_MAP[caseDetail.status as CaseStatusIdentifier]

  return (
    <div className="bg-card p-6 rounded-lg shadow-sm border space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-foreground">
          {caseDetail.nomeCompleto}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <span
            className={clsx(
              'px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full',
              statusInfo?.style ?? 'bg-gray-100 text-gray-800',
            )}
          >
            {statusInfo?.text ?? caseDetail.status}
          </span>
          <p className="text-sm text-muted-foreground">
            Criado por: {caseDetail.criadoPor.nome}
          </p>
        </div>
      </div>

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
      <PafSection caseData={caseDetail} />
      <EvolutionsSection caseId={caseDetail.id} />
    </div>
  )
}