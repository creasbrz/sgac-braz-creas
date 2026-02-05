// frontend/src/constants/cases/definitions.ts

// --- STATUS DO CASO ---
// Utiliza 'as const' para garantir que os valores sejam literais e imutáveis
export const CASE_STATUS = {
  AGUARDANDO_ACOLHIDA: 'AGUARDANDO_ACOLHIDA',
  EM_ACOLHIDA: 'EM_ACOLHIDA',
  AGUARDANDO_DISTRIBUICAO: 'AGUARDANDO_DISTRIBUICAO',
  EM_ACOLHIDA_ESPECIALIZADA: 'EM_ACOLHIDA_ESPECIALIZADA',
  EM_ACOMPANHAMENTO: 'EM_ACOMPANHAMENTO',
  EM_MONITORAMENTO: 'EM_MONITORAMENTO',
  DESLIGADO: 'DESLIGADO',
} as const

// Tipo derivado automaticamente das chaves
export type CaseStatusType = keyof typeof CASE_STATUS

// --- NÍVEIS DE URGÊNCIA ---
export const URGENCIA_NIVEIS = {
  GRAVISSIMA: [
    'Convive com agressor', 
    'Idoso 80+', 
    'Primeira infância', 
    'Risco de morte', 
    'Risco de reincidência',
    'Sofre ameaça'
  ],
  MUITO_GRAVE: [
    'Risco de desabrigo', 
    'Criança/Adolescente',
    'PCD', 
    'Idoso'
  ],
  GRAVE: [
    'Internação', 
    'Acolhimento', 
    'Gestante/Lactante'
  ],
  LEVE: [
    'Sem risco imediato', 
    'Visita periódica'
  ]
} as const

export type UrgenciaNivelType = keyof typeof URGENCIA_NIVEIS

// --- LISTAS DE DOMÍNIO ---
// 'as const' permite usar essas listas diretamente no Zod .enum([...LISTA])

export const LISTA_VIOLACOES = [
  'Abandono', 
  'Negligência', 
  'Afastamento do convívio familiar', 
  'Violência física', 
  'Violência psicológica', 
  'Abuso sexual', 
  'Exploração sexual',
  'Tráfico de seres humanos', 
  'Abuso financeiro/patrimonial', 
  'Trabalho infantil', 
  'Discriminação', 
  'Situação de rua', 
  'Outros'
] as const

export type ViolacaoType = typeof LISTA_VIOLACOES[number]

export const LISTA_MOTIVOS_DESLIGAMENTO = [
  'Transferência de território',
  'Falecimento do(a) usuário(a)',
  'Recusa do atendimento por parte do(a) usuário(a)',
  'Usuário(a) não localizado(a) após tentativas exaustivas',
  'Usuário(a) acolhido(a)',
  'Crianças e adolescentes inseridos em serviço de acolhimento institucional',
  'Minimização dos riscos (Autonomia)',
  'Situação não pertencente à demanda do CREAS',
  'Referenciada ao CREAS'
] as const

export type MotivoDesligamentoType = typeof LISTA_MOTIVOS_DESLIGAMENTO[number]

export const LISTA_DESTINOS = [
  'Referenciado ao CRAS (PAIF)',
  'Serviço de Saúde (CAPS/UBS)',
  'Sistema de Justiça',
  'Acolhimento Institucional',
  'Superação da Vulnerabilidade (Autonomia)',
  'Mudança de Município/Estado',
  'Referenciada ao CREAS',
  'Outro'
] as const

export type DestinoType = typeof LISTA_DESTINOS[number]