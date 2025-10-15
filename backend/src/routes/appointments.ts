// backend/src/routes/appointments.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

export async function appointmentRoutes(app: FastifyInstance) {
  // Rota para buscar agendamentos de um mês específico para o utilizador logado
  app.get(
    '/appointments',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const getAppointmentsQuerySchema = z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/), // Formato YYYY-MM
      })

      try {
        const { month } = getAppointmentsQuerySchema.parse(request.query)
        const { sub: userId } = request.user

        const year = parseInt(month.split('-')[0])
        const monthIndex = parseInt(month.split('-')[1]) - 1

        const startDate = new Date(year, monthIndex, 1)
        const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59)

        // Nota: O modelo 'Agendamento' no schema.prisma é acedido como 'agendamento' no cliente.
        const appointments = await prisma.agendamento.findMany({
          where: {
            responsavelId: userId,
            data: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            caso: {
              select: {
                id: true,
                nomeCompleto: true,
              },
            },
          },
          orderBy: {
            data: 'asc',
          },
        })

        return await reply.status(200).send(appointments)
      } catch (error) {
        request.log.error(error, 'Erro ao buscar agendamentos.')
        return await reply
          .status(500)
          .send({ message: 'Erro interno ao buscar agendamentos.' })
      }
    },
  )

  // Rota para criar um novo agendamento
  app.post(
    '/appointments',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const createAppointmentBodySchema = z.object({
        titulo: z.string().min(3),
        data: z.string().datetime(),
        casoId: z.string().uuid(),
      })

      try {
        const data = createAppointmentBodySchema.parse(request.body)
        const { sub: responsavelId } = request.user

        const newAppointment = await prisma.agendamento.create({
          data: {
            ...data,
            responsavelId,
          },
        })

        return await reply.status(201).send(newAppointment)
      } catch (error) {
        request.log.error(error, 'Erro ao criar agendamento.')
        return await reply
          .status(500)
          .send({ message: 'Erro interno ao criar agendamento.' })
      }
    },
  )
}

