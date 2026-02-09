// backend/src/domain/UrgencyRules.ts

export const URGENCY_LEVELS = {
  GRAVISSIMA: 4,
  MUITO_GRAVE: 3,
  GRAVE: 2,
  LEVE: 1
}

// Mapa com Chaves em CAIXA ALTA para evitar erros de case-sensitive
const URGENCY_MAP: Record<string, number> = {
  // GRAVÍSSIMA (4)
  'CONVIVE COM AGRESSOR': 4,
  'IDOSO 80+': 4,
  'PRIMEIRA INFÂNCIA': 4,
  'PRIMEIRA INFANCIA': 4, // Variação sem acento
  'RISCO DE MORTE': 4,
  'RISCO DE REINCIDÊNCIA': 4,
  'RISCO DE REINCIDENCIA': 4,
  'SOFRE AMEAÇA': 4,
  'SOFRE AMEACA': 4,
  'VIOLÊNCIA SEXUAL': 4,
  'VIOLENCIA SEXUAL': 4,

  // MUITO GRAVE (3)
  'RISCO DE DESABRIGO': 3,
  'CRIANÇA/ADOLESCENTE': 3,
  'CRIANCA/ADOLESCENTE': 3,
  'PCD': 3,
  'IDOSO': 3, // Idoso genérico (<80)

  // GRAVE (2)
  'INTERNAÇÃO': 2,
  'INTERNACAO': 2,
  'ACOLHIMENTO': 2,
  'GESTANTE/LACTANTE': 2,
  'VIOLÊNCIA FÍSICA': 2,
  'VIOLENCIA FISICA': 2,
  'VIOLÊNCIA PSICOLÓGICA': 2,
  'VIOLENCIA PSICOLOGICA': 2,
  'NEGLIGÊNCIA': 2,
  'NEGLIGENCIA': 2,

  // LEVE (1)
  'SEM RISCO IMEDIATO': 1,
  'VISITA PERIÓDICA': 1,
  'VISITA PERIODICA': 1
}

export function calculateUrgencyWeight(urgencia: string | null | undefined): number {
  if (!urgencia) return 1 // Default Leve
  
  // Normaliza: Tudo maiúsculo e sem espaços nas pontas
  const term = urgencia.toUpperCase().trim()

  // 1. Tenta Match Exato
  if (URGENCY_MAP[term]) return URGENCY_MAP[term]

  // 2. Tenta Match Parcial Inteligente
  // Ordenamos as chaves por tamanho (decrescente) para priorizar termos compostos
  // Ex: "IDOSO 80+" será verificado antes de "IDOSO"
  const sortedKeys = Object.keys(URGENCY_MAP).sort((a, b) => b.length - a.length)

  for (const key of sortedKeys) {
    if (term.includes(key)) {
      return URGENCY_MAP[key]
    }
  }

  // Debug: Se caiu aqui, é porque a string não bateu com nada.
  // console.log(`[UrgencyRules] Termo não classificado: "${term}". Definindo peso 1.`)
  return 1 
}