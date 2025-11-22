// backend/src/routes/alerts.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma' //
import { addDays, startOfDay, endOfDay } from 'date-fns' //

// Define quantos dias antes consideramos "próximo do vencimento"
const UPCOMING_DEADLINE_DAYS = 7

export async function alertRoutes(app: FastifyInstance) {
  // Hook de autenticação para todas as rotas de alerta
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify() //
    } catch (err) {
      return reply.status(401).send({ message: 'Não autorizado.' })
    }
  })

  /**
   * -----------------------------------------------------------------
   * [GET] /alerts/paf-deadlines - Obter PAFs com prazos próximos
   * -----------------------------------------------------------------
   * Retorna uma lista de PAFs associados a casos ativos
   * ('EM_ACOMPANHAMENTO_PAEFI') cujo prazo ('deadline') está
   * entre hoje e os próximos 'UPCOMING_DEADLINE_DAYS'.
   *
   * - Especialistas veem apenas os alertas dos seus casos.
   * - Gerentes veem todos os alertas.
   * - Agentes Sociais não veem alertas de PAF.
   */
  app.get('/alerts/paf-deadlines', async (request, reply) => {
    const { sub: userId, cargo } = request.user as { sub: string; cargo: string } //

    // Agentes não têm acesso a esta informação
    if (cargo === 'Agente Social') {
      return reply.status(200).send([])
    }

    try {
      const today = startOfDay(new Date())
      const cutoffDate = endOfDay(addDays(today, UPCOMING_DEADLINE_DAYS))

      // Monta a cláusula 'where' baseada no cargo
      const whereClause: any = {
        // Filtra pelo campo 'deadline' (DateTime)
        deadline: {
          gte: today,
          lte: cutoffDate,
        },
        // Usa a relação 'caso' (minúsculo)
        caso: {
          status: 'EM_ACOMPANHAMENTO_PAEFI', //
        },
      }

      // Se for um Especialista, filtra apenas pelos seus casos
      if (cargo === 'Especialista') {
        whereClause.caso.especialistaPAEFIId = userId //
      }

      // Busca os PAFs que atendem aos critérios
      const upcomingPAFs = await prisma.paf.findMany({
        where: whereClause,
        orderBy: {
          deadline: 'asc', // Ordena pelo campo 'deadline'
        },
        select: {
          id: true,
          deadline: true,
          objetivos: true,
          caso: { // Usa a relação 'caso'
            select: {
              id: true,
              nomeCompleto: true, //
              especialistaPAEFI: { //
                select: {
                  nome: true, //
                },
              },
            },
          },
        },
      })

      // Formata a resposta
      const formattedAlerts = upcomingPAFs.map((paf) => ({
        pafId: paf.id,
        deadline: paf.deadline,
        caseId: paf.caso.id,
        caseName: paf.caso.nomeCompleto,
        specialistName: paf.caso.especialistaPAEFI?.nome ?? 'Não atribuído',
        objetivosResumo:
          paf.objetivos?.length > 100
            ? paf.objetivos.substring(0, 100) + '...'
            : paf.objetivos ?? '',
      }))

      return reply.status(200).send(formattedAlerts)
    } catch (error) {
      console.error('Erro ao buscar alertas de prazo do PAF:', error)
      return reply.status(500).send({ message: 'Erro interno ao buscar alertas.' })
    }
  })

  // Outras rotas de alerta (ex: /alerts/stale-cases) podem ser adicionadas aqui
}