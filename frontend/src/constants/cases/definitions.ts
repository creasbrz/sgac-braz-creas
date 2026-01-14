// frontend/src/constants/cases/definitions.ts
// Define os Status como constantes para usar em todo o app
export const CASE_STATUS = {
  AGUARDANDO_ACOLHIDA: 'AGUARDANDO_ACOLHIDA',
  EM_ACOLHIDA: 'EM_ACOLHIDA',
  AGUARDANDO_DISTRIBUICAO: 'AGUARDANDO_DISTRIBUICAO',
  EM_ACOLHIDA_ESPECIALIZADA: 'EM_ACOLHIDA_ESPECIALIZADA',
  EM_ACOMPANHAMENTO: 'EM_ACOMPANHAMENTO',
  EM_MONITORAMENTO: 'EM_MONITORAMENTO',
  DESLIGADO: 'DESLIGADO',
} as const

export type CaseStatusType = keyof typeof CASE_STATUS

// Listas de Domínio (Urgência, Violações, Motivos)
export const URGENCIA_NIVEIS = {
  GRAVISSIMA: ['Convive com agressor', 'Idoso 80+', 'Primeira infância', 'Risco de morte', 'Violência sexual'],
  MUITO_GRAVE: ['Risco de reincidência', 'Sofre ameaça', 'Risco de desabrigo', 'Criança/Adolescente'],
  GRAVE: ['PCD', 'Idoso', 'Internação', 'Acolhimento', 'Gestante/Lactante'],
  LEVE: ['Sem risco imediato', 'Visita periódica']
}

export const LISTA_VIOLACOES = [
  'Abandono', 'Negligência', 'Afastamento do convívio familiar', 
  'Violência física', 'Violência psicológica', 'Violência sexual',
  'Tráfico de seres humanos', 'Abuso financeiro/patrimonial',
  'Trabalho infantil', 'Discriminação', 'Situação de rua', 'Outros'
]

export const LISTA_MOTIVOS_DESLIGAMENTO = [
  'Transferência de território',
  'Falecimento do(a) usuário(a)',
  'Recusa do atendimento por parte do(a) usuário(a)',
  'Usuário(a) não localizado(a) após tentativas exaustivas',
  'Usuário(a) acolhido(a)',
  'Crianças e adolescentes inseridos em serviço de acolhimento institucional',
  'Minimização dos riscos (Autonomia)',
  'Situação não pertencente à demanda do CREAS'
]

export const LISTA_DESTINOS = [
  'Referenciado ao CRAS (PAIF)',
  'Serviço de Saúde (CAPS/UBS)',
  'Sistema de Justiça',
  'Acolhimento Institucional',
  'Superação da Vulnerabilidade (Autonomia)',
  'Mudança de Município/Estado',
  'Outro'
]