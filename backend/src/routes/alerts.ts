// backend/src/routes/alerts.ts
import { type FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { Cargo, CaseStatus } from '@prisma/client'
import { addDays, startOfDay } from 'date-fns'

export async function alertRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ message: 'Não autorizado.' })
    }
  })

  // [GET] /alerts - Retorna notificações unificadas por perfil
  app.get('/alerts', async (request, reply) => {
    const { sub: userId, cargo } = request.user as { sub: string, cargo: Cargo }
    const notifications = []

    // 1. AGENDAMENTOS (Comum a todos)
    // Busca agendamentos de hoje e amanhã para alertar
    const today = startOfDay(new Date())
    const tomorrowEnd = addDays(today, 2) // Próximos 2 dias

    const agenda = await prisma.agendamento.findMany({
      where: {
        responsavelId: userId,
        data: { gte: today, lt: tomorrowEnd }
      },
      include: { caso: { select: { nomeCompleto: true } } }
    })

    for (const ag of agenda) {
      notifications.push({
        id: `agenda-${ag.id}`,
        title: 'Agendamento Próximo',
        description: `${ag.titulo} - ${ag.caso.nomeCompleto}`,
        link: '/dashboard/agenda',
        type: 'info'
      })
    }

    // 2. REGRAS POR CARGO

    // --- GERENTE ---
    if (cargo === Cargo.Gerente) {
      // Alerta de Casos para Distribuição
      const distCount = await prisma.case.count({
        where: { status: CaseStatus.AGUARDANDO_DISTRIBUICAO_PAEFI }
      })

      if (distCount > 0) {
        notifications.push({
          id: 'dist-queue',
          title: 'Distribuição Pendente',
          description: `${distCount} casos aguardam atribuição de técnico.`,
          link: '/dashboard/cases', // Link para lista geral
          type: 'critical'
        })
      }
    }

    // --- AGENTE SOCIAL ---
    if (cargo === Cargo.Agente_Social) {
      // Alerta de Casos na Caixa de Entrada (Aguardando Acolhida)
      const acolhidaCount = await prisma.case.count({
        where: {
          agenteAcolhidaId: userId,
          status: CaseStatus.AGUARDANDO_ACOLHIDA
        }
      })

      if (acolhidaCount > 0) {
        notifications.push({
          id: 'acolhida-queue',
          title: 'Novos Casos para Acolhida',
          description: `Você tem ${acolhidaCount} casos aguardando atendimento inicial.`,
          link: '/dashboard/cases',
          type: 'critical'
        })
      }
    }

    // --- ESPECIALISTA ---
    if (cargo === Cargo.Especialista) {
      // Alerta de Casos em Acompanhamento (Inbox de trabalho)
      // Podemos filtrar por "recente" se quisermos apenas novidades, mas mostrar o total ativo é útil.
      // Vamos mostrar apenas se houver casos onde o PAF ainda não foi criado? Seria mais inteligente.
      
      // Casos em acompanhamento SEM PAF (Prioridade máxima)
      const casesWithoutPaf = await prisma.case.count({
        where: {
          especialistaPAEFIId: userId,
          status: CaseStatus.EM_ACOMPANHAMENTO_PAEFI,
          paf: { is: null }
        }
      })

      if (casesWithoutPaf > 0) {
        notifications.push({
          id: 'missing-paf',
          title: 'Casos sem PAF',
          description: `${casesWithoutPaf} casos precisam de Plano de Acompanhamento.`,
          link: '/dashboard/cases',
          type: 'critical'
        })
      }

      // Alerta de PAFs Vencendo (Próximos 15 dias)
      const pafDeadline = addDays(new Date(), 15)
      const pafsExpiring = await prisma.paf.findMany({
        where: {
          autorId: userId, // Ou filtrar pelo caso especialistaPAEFIId
          deadline: { gte: today, lte: pafDeadline },
          caso: { status: { not: CaseStatus.DESLIGADO } } // Ignora casos já fechados
        },
        include: { caso: { select: { nomeCompleto: true } } }
      })

      for (const p of pafsExpiring) {
        notifications.push({
          id: `paf-exp-${p.id}`,
          title: 'PAF Vencendo',
          description: `Revisão necessária: ${p.caso.nomeCompleto}`,
          link: `/dashboard/cases/${p.casoId}`,
          type: 'critical'
        })
      }
    }

    return reply.send(notifications)
  })
  
  // Rota legada de paf-deadlines pode ser removida se não usada em outro lugar, 
  // mas mantivemos a lógica acima integrada na rota principal.
}