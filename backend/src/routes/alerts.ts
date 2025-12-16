// backend/src/routes/alerts.ts
import { type FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { Cargo, CaseStatus } from '@prisma/client'
import { addDays, startOfDay, subDays } from 'date-fns'

export async function alertRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ message: 'Não autorizado.' })
    }
  })

  // [GET] /alerts - Central de Notificações Inteligente
  app.get('/alerts', async (request, reply) => {
    const { sub: userId, cargo } = request.user as { sub: string, cargo: Cargo }
    const notifications = []

    const today = startOfDay(new Date())
    const tomorrowEnd = addDays(today, 2)

    // 1. AGENDAMENTOS (Agenda Pessoal)
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
        title: 'Compromisso Próximo',
        description: `${ag.titulo} - ${ag.caso.nomeCompleto}`,
        link: `/dashboard/cases/${ag.casoId}`,
        type: 'info'
      })
    }

    // 2. REGRAS GERAIS
    
    // Alerta de Inatividade (Casos "Esquecidos")
    const dataLimiteInatividade = subDays(new Date(), 30)
    
    const casosInativos = await prisma.case.findMany({
      where: {
        status: CaseStatus.EM_ACOMPANHAMENTO_PAEFI,
        especialistaPAEFIId: cargo === Cargo.Especialista ? userId : undefined,
        evolucoes: {
          none: {
            createdAt: { gte: dataLimiteInatividade }
          }
        }
      },
      select: { id: true, nomeCompleto: true }
    })

    for (const caso of casosInativos) {
      notifications.push({
        id: `inativo-${caso.id}`,
        title: 'Caso sem Movimentação',
        description: `${caso.nomeCompleto} não tem evolução há +30 dias.`,
        link: `/dashboard/cases/${caso.id}`,
        type: 'critical'
      })
    }

    // [NOVO] Alerta de Monitoramento (Busca Ativa)
    // Regra: Casos em monitoramento devem ter alguma anotação a cada 60 dias (prazo mais longo)
    const dataLimiteMonitoramento = subDays(new Date(), 60)
    const casosMonitoramentoEsquecidos = await prisma.case.findMany({
      where: {
        status: CaseStatus.EM_MONITORAMENTO,
        especialistaPAEFIId: cargo === Cargo.Especialista ? userId : undefined,
        evolucoes: {
          none: {
            createdAt: { gte: dataLimiteMonitoramento }
          }
        }
      },
      select: { id: true, nomeCompleto: true }
    })

    for (const caso of casosMonitoramentoEsquecidos) {
      notifications.push({
        id: `monit-inativo-${caso.id}`,
        title: 'Revisão de Monitoramento',
        description: `Verificar situação de ${caso.nomeCompleto} (sem contato há 60 dias).`,
        link: `/dashboard/cases/${caso.id}`,
        type: 'info' // Amarelo/Info pois é menos crítico que PAEFI
      })
    }

    // 3. REGRAS POR CARGO ESPECÍFICAS

    // --- GERENTE ---
    if (cargo === Cargo.Gerente) {
      const distCount = await prisma.case.count({
        where: { status: CaseStatus.AGUARDANDO_DISTRIBUICAO_PAEFI }
      })

      if (distCount > 0) {
        notifications.push({
          id: 'dist-queue',
          title: 'Distribuição Pendente',
          description: `${distCount} casos aguardam atribuição.`,
          link: '/dashboard/cases?status=AGUARDANDO_DISTRIBUICAO_PAEFI',
          type: 'critical'
        })
      }
    }

    // --- AGENTE SOCIAL ---
    if (cargo === Cargo.Agente_Social) {
      const acolhidaCount = await prisma.case.count({
        where: {
          agenteAcolhidaId: userId,
          status: CaseStatus.AGUARDANDO_ACOLHIDA
        }
      })

      if (acolhidaCount > 0) {
        notifications.push({
          id: 'acolhida-queue',
          title: 'Novos na Acolhida',
          description: `Você tem ${acolhidaCount} casos para triagem inicial.`,
          link: '/dashboard/cases?status=AGUARDANDO_ACOLHIDA',
          type: 'critical'
        })
      }
    }

    // --- ESPECIALISTA ---
    if (cargo === Cargo.Especialista) {
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
          description: `${casesWithoutPaf} casos precisam do plano inicial.`,
          link: '/dashboard/cases',
          type: 'critical'
        })
      }

      const pafDeadline = addDays(new Date(), 15)
      const pafsExpiring = await prisma.paf.findMany({
        where: {
          caso: {
            especialistaPAEFIId: userId,
            status: { not: CaseStatus.DESLIGADO }
          },
          deadline: { gte: today, lte: pafDeadline },
        },
        include: { caso: { select: { nomeCompleto: true, id: true } } }
      })

      for (const p of pafsExpiring) {
        notifications.push({
          id: `paf-exp-${p.id}`,
          title: 'Reavaliação de PAF',
          description: `Prazo próximo: ${p.caso.nomeCompleto}`,
          link: `/dashboard/cases/${p.caso.id}`,
          type: 'critical'
        })
      }
    }

    return reply.send(notifications)
  })
}