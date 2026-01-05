// backend/src/routes/alerts.ts
import { type FastifyInstance, FastifyRequest } from 'fastify'
import { prisma } from '../lib/prisma'
import { Cargo, CaseStatus } from '@prisma/client'
import { addDays, startOfDay, subDays } from 'date-fns'

// Definição de Tipos para clareza e manutenção
interface Notification {
  id: string
  title: string
  description: string
  link: string
  type: 'critical' | 'warning' | 'info'
}

export async function alertRoutes(app: FastifyInstance) {
  
  // Hook de Autenticação
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ message: 'Não autorizado.' })
    }
  })

  // [GET] /alerts - Central de Notificações Inteligente
  app.get('/alerts', async (request: FastifyRequest, reply) => {
    const { sub: userId, cargo } = request.user as { sub: string, cargo: Cargo }
    const notifications: Notification[] = []

    const today = startOfDay(new Date())
    const tomorrowEnd = addDays(today, 2) // Hoje e amanhã
    const thirtyDaysAgo = subDays(today, 30)

    // Array de Promises para execução paralela (Performance)
    const tasks = []

    // 1. TAREFA: Buscar Agendamentos (Comum a todos)
    tasks.push(
      prisma.agendamento.findMany({
        where: {
          responsavelId: userId,
          data: { gte: today, lt: tomorrowEnd }
        },
        include: { caso: { select: { nomeCompleto: true } } }
      }).then(agenda => {
        agenda.forEach(ag => {
          notifications.push({
            id: `agenda-${ag.id}`,
            title: 'Compromisso Próximo',
            description: `${ag.tipo} - ${ag.caso?.nomeCompleto || 'Sem caso vinculado'} às ${new Date(ag.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
            link: '/dashboard/agenda',
            type: 'info'
          })
        })
      })
    )

    // 2. TAREFA: Coordenador - Triagem
    if (cargo === Cargo.Coordenador) {
      tasks.push(
        prisma.case.count({
          where: { status: CaseStatus.AGUARDANDO_ACOLHIDA }
        }).then(waitingCount => {
          if (waitingCount > 0) {
            notifications.push({
              id: 'waiting-cases',
              title: 'Triagem Pendente',
              description: `Existem ${waitingCount} famílias aguardando acolhida para triagem inicial.`,
              link: '/dashboard/cases?status=AGUARDANDO_ACOLHIDA',
              type: 'critical'
            })
          }
        })
      )
    }

    // 3. TAREFA: Especialista - Gestão de Casos (PAEFI)
    if (cargo === Cargo.Especialista) {
      // 3.1 Casos sem PAF
      tasks.push(
        prisma.case.count({
          where: {
            especialistaPAEFIId: userId,
            status: CaseStatus.EM_ACOMPANHAMENTO_PAEFI,
            paf: { is: null }
          }
        }).then(casesWithoutPaf => {
          if (casesWithoutPaf > 0) {
            notifications.push({
              id: 'missing-paf',
              title: 'Casos sem PAF',
              description: `${casesWithoutPaf} casos precisam do plano inicial.`,
              link: '/dashboard/cases',
              type: 'critical'
            })
          }
        })
      )

      // 3.2 PAFs vencendo em breve (Próximos 15 dias)
      const pafDeadline = addDays(new Date(), 15)
      tasks.push(
        prisma.paf.findMany({
          where: {
            caso: {
              especialistaPAEFIId: userId,
              status: { not: CaseStatus.DESLIGADO }
            },
            deadline: { gte: today, lte: pafDeadline },
          },
          include: { caso: { select: { nomeCompleto: true, id: true } } }
        }).then(pafsExpiring => {
          pafsExpiring.forEach(p => {
            notifications.push({
              id: `paf-exp-${p.id}`,
              title: 'Revisão de PAF',
              description: `O plano de ${p.caso.nomeCompleto} vence em ${new Date(p.deadline).toLocaleDateString('pt-BR')}.`,
              link: `/dashboard/cases/${p.caso.id}/paf`,
              type: 'warning'
            })
          })
        })
      )

      // 3.3 Estagnação (Casos sem evolução há +30 dias)
      // OTIMIZAÇÃO: Usando filtro reverso do Prisma ao invés de loop no Node.js
      tasks.push(
        prisma.case.findMany({
          select: { id: true, nomeCompleto: true },
          where: {
            especialistaPAEFIId: userId,
            status: CaseStatus.EM_ACOMPANHAMENTO_PAEFI,
            // Logica: Não tem NENHUMA evolução com data >= 30 dias atrás
            // Ou seja, a última foi antes disso ou nunca houve.
            evolucao: {
              none: {
                data: { gte: thirtyDaysAgo }
              }
            }
          }
        }).then(stagnantCases => {
          stagnantCases.forEach(c => {
            notifications.push({
              id: `stagnant-${c.id}`,
              title: 'Caso Sem Evolução',
              description: `${c.nomeCompleto} não possui registros nos últimos 30 dias.`,
              link: `/dashboard/cases/${c.id}`,
              type: 'warning'
            })
          })
        })
      )
    }

    // Executa todas as queries em paralelo e espera terminarem
    await Promise.all(tasks)

    return notifications
  })
}