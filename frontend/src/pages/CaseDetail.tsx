// frontend/src/pages/CaseDetail.tsx
import { useParams } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { clsx } from 'clsx'

import {
  getCaseStatusInfo,
} from '@/constants/caseConstants' //
import { useCaseDetail } from '@/hooks/api/useCaseQueries' //
import { formatCPF, formatPhone, formatDateSafe } from '@/utils/formatters' //
import { CaseActions } from '@/components/case/CaseActions' //
// REMOVIDO: import { ManagerActions } ... (Não é mais necessário)
import { PafSection } from '@/components/case/PafSection' //
import { EvolutionsSection } from '@/components/case/EvolutionsSection' //
import { DetailField } from '@/components/case/DetailField' //
import { DetailSkeleton } from '@/components/case/DetailSkeleton' //
import { Badge } from '@/components/ui/badge' //

export function CaseDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: caseDetail, isLoading, isError } = useCaseDetail(id)

  if (!id) {
    return <p className="text-center text-destructive">ID inválido.</p>
  }

  if (isLoading) return <DetailSkeleton />

  if (isError || !caseDetail) {
    return (
      <div className="flex h-full items-center justify-center text-center">
        <div>
          <h2 className="text-xl font-bold text-destructive">Erro ao carregar o caso.</h2>
          <p className="text-muted-foreground">
            O caso pode não existir ou ocorreu um erro no servidor.
          </p>
        </div>
      </div>
    )
  }

  const statusInfo = getCaseStatusInfo(caseDetail.status)

  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-foreground">{caseDetail.nomeCompleto}</h2>

        <div className="mt-2 flex flex-wrap items-center gap-4">
          <Badge
            className={clsx('border-transparent', statusInfo.style)}
          >
            {statusInfo.text}
          </Badge>

          <p className="text-sm text-muted-foreground">
            Criado por: {caseDetail.criadoPor.nome}
          </p>
        </div>
      </div>

      {/* Informações pessoais */}
      <div className="rounded-lg border bg-background p-4">
        <h3 className="text-base font-semibold text-foreground mb-4">Informações Pessoais</h3>

        <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
          <DetailField label="Nome Completo" value={caseDetail.nomeCompleto} />
          <DetailField label="CPF" value={formatCPF(caseDetail.cpf)} />
          <DetailField label="Data de Nascimento" value={formatDateSafe(caseDetail.nascimento)} />
          <DetailField label="Sexo" value={caseDetail.sexo} />
          <DetailField label="Telefone" value={formatPhone(caseDetail.telefone)} />
          <DetailField label="Endereço" value={caseDetail.endereco} className="lg:col-span-2" />
        </dl>
      </div>

      {/* Detalhes do caso */}
      <div className="rounded-lg border bg-background p-4">
        <h3 className="text-base font-semibold text-foreground mb-4">
          Detalhes do Caso e Benefícios
        </h3>

        <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">

          <DetailField label="Data de Entrada" value={formatDateSafe(caseDetail.dataEntrada)} />
          <DetailField label="Nível de Urgência" value={caseDetail.urgencia} />
          <DetailField label="Violação de Direito" value={caseDetail.violacao} />
          <DetailField label="Categoria do Público" value={caseDetail.categoria} />
          <DetailField label="Órgão Demandante" value={caseDetail.orgaoDemandante} />
          <DetailField label="Agente Social (Acolhida)" value={caseDetail.agenteAcolhida?.nome ?? '-'} />
          <DetailField label="Especialista PAEFI" value={caseDetail.especialistaPAEFI?.nome ?? '-'} />
          <DetailField label="Número do SEI" value={caseDetail.numeroSei ?? '-'} />

          <DetailField
            label="Link do SEI"
            value={
              caseDetail.linkSei ? (
                <a
                  href={caseDetail.linkSei}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  Abrir no SEI <ExternalLink size={14} />
                </a>
              ) : '-'
            }
          />

          <div className="lg:col-span-3">
            <DetailField
              label="Observações Iniciais"
              value={caseDetail.observacoes ?? '-'}
            />
          </div>

          {/* Benefícios */}
          <div className="lg:col-span-3">
            <DetailField
              label="Benefícios Registrados"
              value={
                caseDetail.beneficios?.length
                  ? caseDetail.beneficios.map((b) => (
                      <Badge key={b} variant="secondary" className="mr-1 mb-1">{b}</Badge>
                    ))
                  : 'Nenhum benefício registrado.'
              }
            />
          </div>

          {/* Bloco de desligamento */}
          {caseDetail.status === 'DESLIGADO' && (
            <div className="lg:col-span-3 mt-6 pt-6 border-t space-y-4">
              <DetailField label="Motivo do Desligamento" value={caseDetail.motivoDesligamento ?? '-'} />
              <DetailField label="Parecer Final" value={caseDetail.parecerFinal ?? '-'} />
            </div>
          )}
        </dl>
      </div>
      
      {/* Ações Unificadas */}
      <CaseActions caseData={caseDetail} />
      
      {/* REMOVIDO: <ManagerActions ... /> pois foi integrado ao CaseActions */}

      {/* Sessões */}
      <PafSection caseData={caseDetail} />
      <EvolutionsSection caseId={caseDetail.id} />
    </div>
  )
}