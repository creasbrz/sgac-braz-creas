// frontend/src/constants/options.ts
import { STATUS_CONFIG } from './cases/styles'
import { URGENCIA_NIVEIS, LISTA_VIOLACOES, LISTA_DESTINOS } from './cases/definitions'

// Achatar a lista de urgências para dropdowns
const FLAT_URGENCIA = [
  ...URGENCIA_NIVEIS.GRAVISSIMA,
  ...URGENCIA_NIVEIS.MUITO_GRAVE,
  ...URGENCIA_NIVEIS.GRAVE,
  ...URGENCIA_NIVEIS.LEVE
]

export const OPTIONS = {
  sexo: ['Masculino', 'Feminino', 'Outro', 'Não Informado'],
  
  tipoContato: ['Pessoal', 'Residencial', 'Trabalho', 'Vizinho', 'Parente', 'Outro'],
  
  // Fontes de verdade (definitions.ts)
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

  // Formata para { value, label } para componentes de Select
  status: Object.entries(STATUS_CONFIG).map(([key, config]) => ({
    value: key,
    label: config.label
  }))
}