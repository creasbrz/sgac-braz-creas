// backend/src/schemas/instrumentalSchema.ts
import { z } from 'zod'

// --- PAF (PLANO DE ACOMPANHAMENTO) ---
export const upsertPafSchema = z.object({
  caseId: z.string().uuid(),
  diagnostico: z.string().min(10, "Diagnóstico muito curto"),
  objetivos: z.string().min(5, "Defina ao menos um objetivo"),
  estrategias: z.string().min(5, "Defina as estratégias"),
  deadline: z.string().datetime(), // ISO Date
  
  // [NOVO] Entregas/Intervenções realizadas durante o ciclo
  entregas: z.array(z.string()).optional().default([]), // Ex: ["Cesta Básica", "Auxílio Natalidade"]
})

// --- DOCUMENTOS TÉCNICOS (RELATÓRIOS/SOLICITAÇÕES) ---
export const createDocumentSchema = z.object({
  caseId: z.string().uuid(),
  tipo: z.enum(['RELATORIO_SOCIO', 'RELATORIO_INFORMATIVO', 'SOLICITACAO_ACOLHIMENTO']),
  
  // Conteúdo é um JSON flexível para suportar diferentes formatos de formulário
  conteudo: z.record(z.any()), 
})

export type UpsertPafInput = z.infer<typeof upsertPafSchema>
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>