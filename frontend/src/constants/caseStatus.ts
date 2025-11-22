// frontend/src/constants/caseStatus.ts

// Define os tipos de status possíveis que vêm do backend
export const CASE_STATUSES = [ //
  'AGUARDANDO_ACOLHIDA', //
  'EM_ACOLHIDA', //
  'AGUARDANDO_DISTRIBUICAO_PAEFI', //
  'EM_ACOMPANHAMENTO_PAEFI', //
  'DESLIGADO', //
] as const // 'as const' torna o array readonly e os tipos literais

// Define o tipo CaseStatus baseado nas chaves do array
export type CaseStatus = (typeof CASE_STATUSES)[number]

// Define as propriedades de exibição para cada status (cor e texto)
type StatusDisplayConfig = {
  label: string
  color: 'blue' | 'yellow' | 'green' | 'red' | 'gray'
}

// --- ESTA É A CONSTANTE QUE ESTAVA FALTANDO ---
// Mapeia cada status para sua configuração de exibição
export const CASE_STATUS_MAP: Record<CaseStatus | 'DESCONHECIDO', StatusDisplayConfig> = { //
  AGUARDANDO_ACOLHIDA: { //
    label: 'Aguardando Acolhida',
    color: 'yellow',
  },
  EM_ACOLHIDA: { //
    label: 'Em Acolhida',
    color: 'blue',
  },
  AGUARDANDO_DISTRIBUICAO_PAEFI: { //
    label: 'Aguardando Distribuição',
    color: 'yellow',
  },
  EM_ACOMPANHAMENTO_PAEFI: { //
    label: 'Acompanhamento PAEFI',
    color: 'green',
  },
  DESLIGADO: { //
    label: 'Desligado',
    color: 'red',
  },
  DESCONHECIDO: { // Um valor padrão para status inesperados
    label: 'Desconhecido',
    color: 'gray',
  },
}
// --- FIM DA CONSTANTE ---

// Função auxiliar para obter o texto legível do status
export function getCaseStatusDisplay(status: string | null | undefined): StatusDisplayConfig { //
  if (!status || !Object.keys(CASE_STATUS_MAP).includes(status)) { //
    return CASE_STATUS_MAP.DESCONHECIDO //
  }
  return CASE_STATUS_MAP[status as CaseStatus] //
}