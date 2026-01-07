import { type FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { subDays, differenceInDays, isValid } from 'date-fns'

interface AuthUser {
  sub: string
  cargo: 'Agente_Social' | 'Especialista' | 'Gerente' | 'Auditor'
}

export async function alertRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send() }
  })

  app.get('/alerts', async (req, reply) => {
    const { sub: userId, cargo } = req.user as AuthUser
    
    try {
      // 1. Define filtro
      let whereCondition: any = { status: { not: 'DESLIGADO' } }

      if (cargo === 'Especialista') {
        whereCondition.especialistaPAEFIId = userId
      } else if (cargo === 'Agente_Social') {
        whereCondition.agenteAcolhidaId = userId
        whereCondition.status = { in: ['EM_ACOLHIDA', 'AGUARDANDO_ACOLHIDA'] }
      } else if (cargo === 'Gerente' || cargo === 'Auditor') {
        // Limita para evitar travamento em bancos grandes
        whereCondition.OR = [
            { especialistaPAEFIId: { not: null } },
            { agenteAcolhidaId: { not: null } }
        ]
      }

      // 2. Busca dados mínimos
      const cases = await prisma.case.findMany({
        where: whereCondition,
        select: {
          id: true,
          nomeCompleto: true,
          status: true,
          dataEntrada: true,
          urgencia: true,
          evolucoes: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { createdAt: true }
          }
        },
        take: 100 // Limite de segurança
      })

      // 3. Processamento Seguro
      const alerts = cases.map(c => {
        try {
            const lastEvolucao = c.evolucoes[0]?.createdAt
            const lastDate = lastEvolucao ? new Date(lastEvolucao) : null
            const dataEntrada = c.dataEntrada ? new Date(c.dataEntrada) : new Date()
            const today = new Date()
            
            // Regras PAEFI (Especialista)
            if (cargo === 'Especialista' || (cargo === 'Gerente' && c.status.includes('PAEFI'))) {
              if (!lastDate) {
                 return { id: c.id, nomeCompleto: c.nomeCompleto, type: 'PAF_NOT_STARTED', days: 0, urgencia: c.urgencia }
              }
              if (isValid(lastDate)) {
                 const daysSince = differenceInDays(today, lastDate)
                 if (daysSince >= 90) return { id: c.id, nomeCompleto: c.nomeCompleto, type: 'PAF_REVIEW_OVERDUE', days: daysSince, urgencia: c.urgencia }
                 if (daysSince >= 30) return { id: c.id, nomeCompleto: c.nomeCompleto, type: 'PAF_STALLED', days: daysSince, urgencia: c.urgencia }
              }
            }

            // Regras Acolhida (Agente)
            if (cargo === 'Agente_Social' || (cargo === 'Gerente' && c.status.includes('ACOLHIDA'))) {
               const daysWaiting = differenceInDays(today, dataEntrada)
               
               if (c.status === 'AGUARDANDO_ACOLHIDA' && daysWaiting > 2) {
                  return { id: c.id, nomeCompleto: c.nomeCompleto, type: 'NOT_STARTED_YET', days: daysWaiting, urgencia: c.urgencia }
               }
               if (c.status === 'EM_ACOLHIDA' && !lastDate && daysWaiting > 5) {
                  return { id: c.id, nomeCompleto: c.nomeCompleto, type: 'RECEPTION_DELAY', days: daysWaiting, urgencia: c.urgencia }
               }
            }
        } catch (err) {
            return null // Ignora caso com erro de data
        }
        return null
      }).filter(Boolean)

      return reply.send(alerts)

    } catch (error) {
      console.error('[ALERTS_ERROR]', error)
      return reply.status(500).send({ message: 'Erro ao processar alertas.' })
    }
  })
}