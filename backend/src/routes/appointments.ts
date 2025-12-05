// backend/src/routes/appointments.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { LogAction } from '@prisma/client'

export async function appointmentRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify() } catch (err) { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  // [GET] Listar (Atualizado para incluir telefone)
  app.get('/appointments', async (request, reply) => {
    const { caseId, month } = z.object({ 
      caseId: z.string().uuid().optional(),
      month: z.string().regex(/^\d{4}-\d{2}$/).optional() // YYYY-MM
    }).parse(request.query)
    
    const where: any = {}
    if (caseId) where.casoId = caseId

    // Filtro por mês (se fornecido)
    if (month) {
      const start = new Date(`${month}-01T00:00:00`)
      const end = new Date(new Date(start).setMonth(start.getMonth() + 1))
      where.data = { gte: start, lt: end }
    }
    
    const appointments = await prisma.agendamento.findMany({
      where,
      orderBy: { data: 'asc' },
      include: { 
        responsavel: { select: { nome: true } },
        // [CORREÇÃO] Incluindo telefone para o botão de WhatsApp
        caso: { 
          select: { 
            id: true, 
            nomeCompleto: true,
            telefone: true 
          } 
        }
      }
    })
    return reply.send(appointments)
  })

  // [POST] Criar (Mantido igual)
  app.post('/appointments', async (request, reply) => {
    const bodySchema = z.object({
      titulo: z.string().min(3),
      data: z.coerce.date(),
      observacoes: z.any().optional(),
      casoId: z.string().uuid(),
    })

    try {
      const { titulo, data, observacoes, casoId } = bodySchema.parse(request.body)
      const { sub: userId } = request.user as { sub: string }

      const agendamento = await prisma.agendamento.create({
        data: {
          titulo,
          data,
          observacoes: typeof observacoes === 'string' ? observacoes : null,
          casoId,
          responsavelId: userId
        }
      })

      await prisma.caseLog.create({
        data: {
          casoId,
          autorId: userId,
          acao: LogAction.AGENDAMENTO_CRIADO || LogAction.OUTRO,
          descricao: `Agendou: ${titulo} para ${data.toLocaleDateString('pt-BR')}`
        }
      })

      return reply.status(201).send(agendamento)

    } catch (error) {
      return reply.status(500).send({ message: 'Erro ao criar agendamento.' })
    }
  })
}