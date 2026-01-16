// frontend/src/constants/options.ts
import { STATUS_CONFIG } from './cases/styles'
import { URGENCIA_NIVEIS, LISTA_VIOLACOES, LISTA_DESTINOS } from './cases/definitions'

// --- CONSTANTES EXPORTADAS (Fontes de Verdade) ---

// [IMPORTANTE] 'as const' é obrigatório para funcionar no Zod Enum
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

const FLAT_URGENCIA = [
  ...URGENCIA_NIVEIS.GRAVISSIMA,
  ...URGENCIA_NIVEIS.MUITO_GRAVE,
  ...URGENCIA_NIVEIS.GRAVE,
  ...URGENCIA_NIVEIS.LEVE
]

// --- OBJETO DE OPÇÕES PARA UI ---

export const OPTIONS = {
  sexo: ['Masculino', 'Feminino', 'Outro', 'Não Informado'],
  
  tipoContato: ['Pessoal', 'Residencial', 'Trabalho', 'Vizinho', 'Parente', 'Outro'],
  
  // Reutiliza a constante, mas transformando em array mutável para o Select do UI se necessário
  ocupacao: [...OCUPACOES_ROL], 

  urgencia: FLAT_URGENCIA,
  violacao: LISTA_VIOLACOES,
  destinos: LISTA_DESTINOS,
  
  categoria: [
    'Mulher', 'POP RUA', 'LGBTQIA+', 'Migrante', 'Idoso', 
    'Criança/adolescente', 'PCD', 'Álcool/drogas', 'Família em vulnerabilidade'
  ],

  origem: [
    { id: 'ESPONTANEA', label: 'Demanda Espontânea (Balcão)' },
    { id: 'DOCUMENTAL', label: 'Demanda Documental (SEI/Ofício)' },
    { id: 'REFERENCIADA', label: 'Encaminhamento de Rede' },
    { id: 'BUSCA_ATIVA', label: 'Busca Ativa' }
  ],

  transferenciaRenda: [
    'PROGRAMA BOLSA FAMÍLIA (PBF)', 
    'PROGRAMA DF SOCIAL', 
    'PROGRAMA CARTÃO GÁS', 
    'BENEFÍCIO DE PRESTAÇÃO CONTINUADA (BPC)'
  ],

  status: Object.entries(STATUS_CONFIG).map(([key, config]) => ({
    value: key,
    label: config.label
  }))
}