// backend/src/routes/alerts.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { subDays, differenceInDays, isValid } from 'date-fns'
import { Cargo, CaseStatus } from '@prisma/client'

// --- Schemas ---

const alertResponseSchema = z.object({
  id: z.string(),
  nomeCompleto: z.string(),
  type: z.enum([
    'PAF_NOT_STARTED', 
    'PAF_STALLED', 
    'PAF_REVIEW_OVERDUE', 
    'NOT_STARTED_YET', 
    'RECEPTION_DELAY'
  ]),
  days: z.number(),
  urgencia: z.string()
})

export async function alertRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send() }
  })

  server.get('/alerts', {
    schema: {
      tags: ['Alertas'],
      summary: 'Monitoramento de prazos e pendências (Sinais de Trânsito)',
      response: {
        200: z.array(alertResponseSchema)
      }
    }
  }, async (req, reply) => {
    const { sub: userId, cargo } = req.user as { sub: string, cargo: string }
    
    try {
      // 1. Define Escopo de Busca (Quem vê o quê)
      let whereCondition: any = { status: { not: CaseStatus.DESLIGADO } }

      if (cargo === Cargo.Especialista) {
        whereCondition.especialistaPAEFIId = userId
      } else if (cargo === Cargo.Agente_Social) {
        whereCondition.agenteAcolhidaId = userId
        whereCondition.status = { in: [CaseStatus.EM_ACOLHIDA, CaseStatus.AGUARDANDO_ACOLHIDA] }
      } else if (cargo === Cargo.Gerente || cargo === Cargo.Auditor) {
        // Gerente vê alertas de TODOS os casos que tenham técnico atribuído
        whereCondition.OR = [
            { especialistaPAEFIId: { not: null } },
            { agenteAcolhidaId: { not: null } }
        ]
      } else {
        // Outros cargos não veem alertas
        return reply.send([])
      }

      // 2. Busca Otimizada (Apenas campos necessários para o cálculo)
      const cases = await prisma.case.findMany({
        where: whereCondition,
        select: {
          id: true,
          nomeCompleto: true,
          status: true,
          dataEntrada: true,
          urgencia: true,
          // Traz apenas a data da última evolução para calcular o "silêncio"
          evolucoes: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { createdAt: true }
          }
        },
        take: 200 // Limite de segurança
      })

      // 3. Processamento de Regras de Negócio (In-Memory)
      const today = new Date()

      const alerts = cases.map(c => {
        try {
            const lastEvolucao = c.evolucoes[0]?.createdAt
            const lastDate = lastEvolucao ? new Date(lastEvolucao) : null
            const dataEntrada = c.dataEntrada ? new Date(c.dataEntrada) : new Date()
            
            // --- Regras para Especialista (PAEFI) ---
            // Foco: Elaboração e Revisão do PAF
            if (cargo === Cargo.Especialista || (cargo === Cargo.Gerente && c.status.includes('PAEFI'))) {
              // 1. PAF não iniciado (Sem evolução nenhuma)
              if (!lastDate) {
                 return { id: c.id, nomeCompleto: c.nomeCompleto, type: 'PAF_NOT_STARTED', days: 0, urgencia: c.urgencia }
              }
              
              if (isValid(lastDate)) {
                 const daysSince = differenceInDays(today, lastDate)
                 // 2. Revisão Vencida (> 90 dias)
                 if (daysSince >= 90) return { id: c.id, nomeCompleto: c.nomeCompleto, type: 'PAF_REVIEW_OVERDUE', days: daysSince, urgencia: c.urgencia }
                 // 3. Caso Estagnado (> 30 dias sem registro)
                 if (daysSince >= 30) return { id: c.id, nomeCompleto: c.nomeCompleto, type: 'PAF_STALLED', days: daysSince, urgencia: c.urgencia }
              }
            }

            // --- Regras para Agente Social (Acolhida) ---
            // Foco: Rapidez no primeiro atendimento
            if (cargo === Cargo.Agente_Social || (cargo === Cargo.Gerente && c.status.includes('ACOLHIDA'))) {
               const daysWaiting = differenceInDays(today, dataEntrada)
               
               // 1. Atribuído mas não iniciado (> 2 dias parado na caixa de entrada)
               if (c.status === CaseStatus.AGUARDANDO_ACOLHIDA && daysWaiting > 2) {
                  return { id: c.id, nomeCompleto: c.nomeCompleto, type: 'NOT_STARTED_YET', days: daysWaiting, urgencia: c.urgencia }
               }
               // 2. Acolhida Atrasada (> 5 dias em acolhida sem evolução)
               if (c.status === CaseStatus.EM_ACOLHIDA && !lastDate && daysWaiting > 5) {
                  return { id: c.id, nomeCompleto: c.nomeCompleto, type: 'RECEPTION_DELAY', days: daysWaiting, urgencia: c.urgencia }
               }
            }
        } catch (err) {
            return null // Ignora caso com data inválida
        }
        return null
      }).filter(Boolean) // Remove nulls

      // @ts-ignore - Zod infere corretamente, mas TS reclama do filter(Boolean)
      return reply.send(alerts)

    } catch (error) {
      console.error('[ALERTS_ERROR]', error)
      return reply.status(500).send({ message: 'Erro ao processar alertas.' })
    }
  })
}