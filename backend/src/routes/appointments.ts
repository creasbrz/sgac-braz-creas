// backend/src/routes/appointments.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma' //
import { startOfMonth, endOfMonth, parseISO } from 'date-fns' //

export async function appointmentRoutes(app: FastifyInstance) { //
  // Protege todas as rotas de agendamento
  app.addHook('onRequest', async (request, reply) => { //
    try {
      await request.jwtVerify() //
    } catch (err) { //
      await reply.status(401).send({ message: 'Não autorizado.' }) //
    }
  })

  /**
   * -----------------------------------------------------------------
   * [GET] /appointments - Buscar agendamentos (Para a Agenda)
   * -----------------------------------------------------------------
   * Busca agendamentos com base em filtros.
   * Usado pela página 'Agenda.tsx' para popular o calendário.
   *
   * Query Params:
   * - month (obrigatório): Mês no formato 'yyyy-MM'.
   * - userId (opcional): Filtra por um técnico específico (só para Gerente).
   */
  app.get('/appointments', async (request, reply) => {
    const { sub: userId, cargo } = request.user as {
      sub: string
      cargo: string
    }

    const querySchema = z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato de mês inválido. Use YYYY-MM.'),
      userId: z.string().uuid().optional(),
    })

    try {
      const { month, userId: queryUserId } = querySchema.parse(request.query)

      // Calcula o início e o fim do mês solicitado
      const firstDay = startOfMonth(parseISO(month))
      const lastDay = endOfMonth(parseISO(month))

      const whereClause: any = {
        data: {
          gte: firstDay,
          lte: lastDay,
        },
      }

      // Lógica de permissão
      if (cargo === 'Gerente') {
        // Gerente pode ver agendamentos de um usuário específico
        if (queryUserId) {
          whereClause.responsavelId = queryUserId
        }
        // Se queryUserId não for fornecido, o Gerente vê os de TODOS.
      } else {
        // Agente Social e Especialista só podem ver os seus próprios agendamentos.
        whereClause.responsavelId = userId
      }

      const appointments = await prisma.agendamento.findMany({ //
        where: whereClause,
        orderBy: {
          data: 'asc',
        },
        include: {
          caso: {
            select: {
              id: true,
              nomeCompleto: true,
            },
          },
          responsavel: {
            select: {
              nome: true,
            },
          },
        },
      })

      return reply.status(200).send(appointments)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: 'Dados inválidos.', errors: error.flatten() })
      }
      console.error('Erro ao buscar agendamentos:', error)
      return reply.status(500).send({ message: 'Erro interno no servidor.' })
    }
  })

  /**
   * -----------------------------------------------------------------
   * [GET] /cases/:caseId/appointments - Buscar agendamentos de UM CASO
   * -----------------------------------------------------------------
   * (Esta rota já existia no seu arquivo)
   */
  app.get('/cases/:caseId/appointments', async (request, reply) => { //
    const paramsSchema = z.object({ caseId: z.string().uuid() }) //

    try {
      const { caseId } = paramsSchema.parse(request.params) //

      const appointments = await prisma.agendamento.findMany({ //
        where: { casoId: caseId }, //
        orderBy: { data: 'desc' }, //
        include: {
          responsavel: { select: { id: true, nome: true } }, //
        },
      })
      return reply.status(200).send(appointments) //
    } catch (error) {
      request.log.error(error, 'Erro ao buscar agendamentos do caso') //
      return reply
        .status(500)
        .send({ message: 'Erro interno ao buscar agendamentos do caso.' }) //
    }
  })

  /**
   * -----------------------------------------------------------------
   * [POST] /appointments - Criar novo agendamento
   * -----------------------------------------------------------------
   * (Esta rota já existia e foi corrigida para o novo schema)
   */
  app.post('/appointments', async (request, reply) => { //
    const { sub: userId } = request.user as { sub: string }

    const createAppointmentSchema = z.object({ //
      titulo: z.string().min(3, 'O título é muito curto.'), //
      data: z.string().min(1, 'A data é obrigatória.'), //
      time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora inválida.'), //
      casoId: z.string().uuid('Selecione um caso.'), //
      observacoes: z.string().optional(),
    })

    try {
      const { titulo, data, time, casoId, observacoes } =
        createAppointmentSchema.parse(request.body)

      // Combina a data (yyyy-MM-dd) e a hora (HH:mm) em um objeto Date completo
      const dataHoraISO = `${data}T${time}:00.000`

      const newAppointment = await prisma.agendamento.create({ //
        data: {
          titulo,
          data: new Date(dataHoraISO), // Salva o DateTime completo
          observacoes,
          casoId, // Campo agora existe no schema
          responsavelId: userId, // Campo agora existe no schema
        },
      })

      return reply.status(201).send(newAppointment)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: 'Dados inválidos.', errors: error.flatten() })
      }
      console.error('Erro ao criar agendamento:', error)
      return reply.status(500).send({ message: 'Erro interno no servidor.' })
    }
  })
}