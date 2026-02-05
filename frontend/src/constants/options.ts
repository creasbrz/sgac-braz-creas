// frontend/src/constants/options.ts
import { STATUS_CONFIG } from './cases/styles'
import { URGENCIA_NIVEIS, LISTA_VIOLACOES, LISTA_DESTINOS } from './cases/definitions'

// --- TIPOS AUXILIARES ---
export interface OptionItem {
  value: string
  label: string
  className?: string // Permite passar classes do Tailwind v4 para o Select
}

// --- CONSTANTES DE DOMÍNIO (Single Source of Truth) ---

/**
 * [IMPORTANTE] 'as const' é obrigatório aqui.
 * Transforma o array em uma Tupla Readonly de literais.
 * Isso permite: z.enum([...OCUPACOES_ROL]) funcionar no schema do Zod.
 */
export const OCUPACOES_ROL = [
  'Não trabalha',
  'Estudante',
  'Do lar',
  'Aposentado/Pensionista',
  'Autônomo/Informal',
  'Trabalhador Assalariado (CLT)',
  'Trabalhador Assalariado (Sem Carteira)',
  'BPC/LOAS',
  'Desempregado',
  'Outro'
] as const;

// Flatten dos níveis de urgência para uso em listas simples
// O uso de 'as readonly string[]' garante compatibilidade com as definições estritas
const FLAT_URGENCIA = [
  ...(URGENCIA_NIVEIS.GRAVISSIMA as readonly string[] || []),
  ...(URGENCIA_NIVEIS.MUITO_GRAVE as readonly string[] || []),
  ...(URGENCIA_NIVEIS.GRAVE as readonly string[] || []),
  ...(URGENCIA_NIVEIS.LEVE as readonly string[] || [])
]

// --- OBJETO DE OPÇÕES PARA UI (Consumo no Frontend) ---

export const OPTIONS = {
  sexo: ['Masculino', 'Feminino', 'Outro', 'Não Informado'],
  
  tipoContato: ['Pessoal', 'Residencial', 'Trabalho', 'Vizinho', 'Parente', 'Outro'],
  
  // Spread operator transforma a tupla readonly em array mutável para .map()
  ocupacao: [...OCUPACOES_ROL], 

  urgencia: FLAT_URGENCIA,
  
  violacao: [...LISTA_VIOLACOES], // Convertendo para array mutável se necessário
  
  destinos: [...LISTA_DESTINOS],
  
  categoria: [
    'Mulher', 
    'POP RUA', 
    'LGBTQIA+', 
    'Migrante', 
    'Idoso', 
    'Criança/adolescente', 
    'PCD', 
    'Álcool/drogas', 
    'Família em vulnerabilidade'
  ],

  origem: [
    { id: 'ESPONTANEA', label: 'Demanda Espontânea (Balcão)' },
    { id: 'DOCUMENTAL', label: 'Demanda Documental (SEI/Ofício)' },
    { id: 'REFERENCIADA', label: 'Encaminhamento de Rede' },
    { id: 'BUSCA_ATIVA', label: 'Busca Ativa' }
  ] as const,

  transferenciaRenda: [
    'PROGRAMA BOLSA FAMÍLIA (PBF)', 
    'PROGRAMA DF SOCIAL', 
    'PROGRAMA CARTÃO GÁS', 
    'BENEFÍCIO DE PRESTAÇÃO CONTINUADA (BPC)'
  ],

  // Transforma a config de estilos em opções ricas para Selects
  // Inclui 'className' para que o componente UI possa renderizar as cores do Tailwind v4
  status: Object.entries(STATUS_CONFIG).map(([key, config]) => ({
    value: key,
    label: config.label,
    className: config.className // Passa as classes de estilo (bg-blue-100, etc.)
  })) as OptionItem[]
}