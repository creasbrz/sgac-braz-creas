// frontend/src/constants/options.ts
import { STATUS_CONFIG } from './cases/styles'
import { URGENCIA_NIVEIS, LISTA_VIOLACOES, LISTA_DESTINOS } from './cases/definitions'

// Achatar a lista de urgências para usar em dropdowns simples
const FLAT_URGENCIA = [
  ...URGENCIA_NIVEIS.GRAVISSIMA,
  ...URGENCIA_NIVEIS.MUITO_GRAVE,
  ...URGENCIA_NIVEIS.GRAVE,
  ...URGENCIA_NIVEIS.LEVE
]

export const OPTIONS = {
  sexo: ['Masculino', 'Feminino', 'Outro', 'Não Informado'],
  
  // Fontes de verdade
  urgencia: FLAT_URGENCIA,
  violacao: LISTA_VIOLACOES,
  destinos: LISTA_DESTINOS, // [ADICIONADO] Para o modal de desligamento
  
  categoria: [
    'Mulher', 'POP RUA', 'LGBTQIA+', 'Migrante', 'Idoso', 
    'Criança/adolescente', 'PCD', 'Álcool/drogas', 'Família em vulnerabilidade'
  ],

  // Formata para { value, label } para componentes de Select
  status: Object.entries(STATUS_CONFIG).map(([key, config]) => ({
    value: key,
    label: config.label
  }))
}