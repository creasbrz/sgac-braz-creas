// frontend/src/constants/caseConstants.ts

// O mapa é a "Fonte da Verdade" e usa tokens de cor do tema.
export const CASE_STATUS_MAP = {
  AGUARDANDO_ACOLHIDA: {
    text: 'Aguardando Acolhida',
    style: 'bg-secondary text-secondary-foreground', // Amarelo/Laranja -> Mapeado para Secundário (cinza)
  },
  EM_ACOLHIDA: {
    text: 'Em Acolhida',
    style: 'bg-primary/10 text-primary', // Azul -> Mapeado para Primário (com opacidade)
  },
  AGUARDANDO_DISTRIBUICAO_PAEFI: {
    text: 'Aguardando Distribuição',
    style: 'bg-secondary text-secondary-foreground', // Amarelo/Laranja -> Mapeado para Secundário (cinza)
  },
  EM_ACOMPANHAMENTO_PAEFI: {
    text: 'Acompanhamento PAEFI',
    style: 'bg-primary text-primary-foreground', // Verde -> Mapeado para Primário (sólido)
  },
  DESLIGADO: {
    text: 'Desligado',
    style: 'bg-muted text-muted-foreground', // Cinza -> Mapeado para Muted
  },
} as const // 'as const' é crucial para a inferência de tipo

// O Tipo agora é inferido automaticamente do mapa
export type CaseStatusIdentifier = keyof typeof CASE_STATUS_MAP
// --- FIM DA SUGESTÃO 3 ---

// --- SUGESTÃO 1 APLICADA ---
// Helper function para buscar os dados do mapa com segurança
/**
 * Retorna o texto e a classe de estilo para um determinado status de caso.
 */
export function getCaseStatusInfo(status: string | null | undefined) {
  if (status && status in CASE_STATUS_MAP) {
    // Se o status for válido, retorna suas propriedades
    return CASE_STATUS_MAP[status as CaseStatusIdentifier]
  }
  // Fallback para status desconhecido ou nulo
  return { text: 'Desconhecido', style: 'bg-muted text-muted-foreground' }
}
// --- FIM DA SUGESTÃO 1 ---

// Lista oficial de motivos de desligamento (do arquivo original)
export const MOTIVOS_DESLIGAMENTO = [ //
  'Mudança de território',
  'Falecimento',
  'Recusa de atendimento',
  'Violação cessada',
  'Contrareferenciamento',
  'Não localizado',
  'Acolhimento',
] //