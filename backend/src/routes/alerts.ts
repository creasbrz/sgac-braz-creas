// backend/src/routes/alerts.ts
import { type FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { Cargo, CaseStatus } from '@prisma/client'
import { addDays, startOfDay, subDays } from 'date-fns'

// Definição de Tipos para o Sistema de Notificação
interface NotificationItem {
  id: string
  title: string
  description: string
  link: string
  type: 'info' | 'warning' | 'critical'
}

interface UserPayload {
  sub: string
  cargo: Cargo
}

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
    const { sub: userId, cargo } = request.user as UserPayload
    const notifications: NotificationItem[] = []

    const today = startOfDay(new Date())
    const tomorrowEnd = addDays(today, 2)
    const dataLimiteInatividade = subDays(new Date(), 30)
    const dataLimiteMonitoramento = subDays(new Date(), 60)
    const pafDeadline = addDays(new Date(), 15)

    // Usamos Promise.all para executar todas as verificações EM PARALELO
    // Isso reduz drasticamente o tempo de resposta do endpoint
    const [
      agenda,
      casosInativos,
      casosMonitoramento,
      distCount,
      acolhidaCount,
      casesWithoutPaf,
      pafsExpiring
    ] = await Promise.all([
      
      // 1. AGENDAMENTOS (Agenda Pessoal - Próximos 2 dias)
      prisma.agendamento.findMany({
        where: {
          responsavelId: userId,
          data: { gte: today, lt: tomorrowEnd }
        },
        include: { caso: { select: { nomeCompleto: true } } }
      }),

      // 2. CASOS PAEFI INATIVOS (+30 dias sem evolução)
      prisma.case.findMany({
        where: {
          status: CaseStatus.EM_ACOMPANHAMENTO_PAEFI,
          // Se for Especialista, filtra os dele. Se for Gerente, vê de todos.
          especialistaPAEFIId: cargo === Cargo.Especialista ? userId : undefined,
          evolucoes: {
            none: { createdAt: { gte: dataLimiteInatividade } }
          }
        },
        select: { id: true, nomeCompleto: true }
      }),

      // 3. MONITORAMENTO ESQUECIDO (+60 dias sem evolução)
      prisma.case.findMany({
        where: {
          status: CaseStatus.EM_MONITORAMENTO,
          especialistaPAEFIId: cargo === Cargo.Especialista ? userId : undefined,
          evolucoes: {
            none: { createdAt: { gte: dataLimiteMonitoramento } }
          }
        },
        select: { id: true, nomeCompleto: true }
      }),

      // 4. [GERENTE] Fila de Distribuição
      cargo === Cargo.Gerente 
        ? prisma.case.count({ where: { status: CaseStatus.AGUARDANDO_DISTRIBUICAO_PAEFI } })
        : Promise.resolve(0),

      // 5. [AGENTE] Fila de Acolhida
      cargo === Cargo.Agente_Social
        ? prisma.case.count({ where: { agenteAcolhidaId: userId, status: CaseStatus.AGUARDANDO_ACOLHIDA } })
        : Promise.resolve(0),

      // 6. [ESPECIALISTA] Casos sem PAF
      cargo === Cargo.Especialista
        ? prisma.case.count({ where: { especialistaPAEFIId: userId, status: CaseStatus.EM_ACOMPANHAMENTO_PAEFI, paf: { is: null } } })
        : Promise.resolve(0),
      
      // 7. [ESPECIALISTA] PAFs Vencendo
      cargo === Cargo.Especialista
        ? prisma.paf.findMany({
            where: {
              caso: {
                especialistaPAEFIId: userId,
                status: { not: CaseStatus.DESLIGADO }
              },
              deadline: { gte: today, lte: pafDeadline },
            },
            include: { caso: { select: { nomeCompleto: true, id: true } } }
          })
        : Promise.resolve([])
    ])

    // --- PROCESSAMENTO DOS RESULTADOS ---

    // Agenda
    agenda.forEach(ag => {
      notifications.push({
        id: `agenda-${ag.id}`,
        title: 'Compromisso Próximo',
        description: `${ag.titulo} - ${ag.caso?.nomeCompleto || 'Sem caso vinculado'}`,
        link: ag.casoId ? `/dashboard/cases/${ag.casoId}` : '/dashboard/agenda',
        type: 'info'
      })
    })

    // Inativos PAEFI
    casosInativos.forEach(caso => {
      notifications.push({
        id: `inativo-${caso.id}`,
        title: 'Caso sem Movimentação',
        description: `${caso.nomeCompleto} não tem evolução há +30 dias.`,
        link: `/dashboard/cases/${caso.id}`,
        type: 'critical'
      })
    })

    // Inativos Monitoramento
    casosMonitoramento.forEach(caso => {
      notifications.push({
        id: `monit-inativo-${caso.id}`,
        title: 'Revisão de Monitoramento',
        description: `Verificar situação de ${caso.nomeCompleto} (sem contato há 60 dias).`,
        link: `/dashboard/cases/${caso.id}`,
        type: 'warning'
      })
    })

    // Gerente - Distribuição
    if (distCount > 0) {
      notifications.push({
        id: 'dist-queue',
        title: 'Distribuição Pendente',
        description: `${distCount} casos aguardam atribuição.`,
        link: '/dashboard/cases?status=AGUARDANDO_DISTRIBUICAO_PAEFI',
        type: 'critical'
      })
    }

    // Agente - Acolhida
    if (acolhidaCount > 0) {
      notifications.push({
        id: 'acolhida-queue',
        title: 'Novos na Acolhida',
        description: `Você tem ${acolhidaCount} casos para triagem inicial.`,
        link: '/dashboard/cases?status=AGUARDANDO_ACOLHIDA',
        type: 'warning'
      })
    }

    // Especialista - Sem PAF
    if (casesWithoutPaf > 0) {
      notifications.push({
        id: 'missing-paf',
        title: 'Casos sem PAF',
        description: `${casesWithoutPaf} casos precisam do plano inicial.`,
        link: '/dashboard/cases', // Idealmente filtrar por "Sem PAF" no front
        type: 'critical'
      })
    }

    // Especialista - PAF Vencendo
    // @ts-ignore - TypeScript pode reclamar do array vazio no Promise.resolve
    pafsExpiring.forEach(p => {
      notifications.push({
        id: `paf-exp-${p.id}`,
        title: 'Reavaliação de PAF',
        description: `Prazo próximo: ${p.caso.nomeCompleto}`,
        link: `/dashboard/cases/${p.caso.id}`,
        type: 'warning'
      })
    })

    return reply.send(notifications)
  })
}