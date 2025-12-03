// backend/src/routes/appointments.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { LogAction } from '@prisma/client'

export async function appointmentRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify() } catch (err) { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  // [GET] Listar
  app.get('/appointments', async (request, reply) => {
    const { caseId } = z.object({ caseId: z.string().uuid().optional() }).parse(request.query)
    const where = caseId ? { casoId } : {}
    
    const appointments = await prisma.agendamento.findMany({
      where,
      orderBy: { data: 'asc' },
      include: { responsavel: { select: { nome: true } } }
    })
    return reply.send(appointments)
  })

  // [POST] Criar
  app.post('/appointments', async (request, reply) => {
    // 🔍 LOG PARA DEPURAÇÃO: Ver o que chega do Frontend
    console.log("📥 Recebido no Backend:", request.body)

    const bodySchema = z.object({
      titulo: z.string().min(3, "O título deve ter pelo menos 3 letras"),
      data: z.coerce.date(), // Converte string ISO para Date
      observacoes: z.any().optional(), // Aceita string ou null
      casoId: z.string().uuid("ID do caso inválido"),
    })

    try {
      const { titulo, data, observacoes, casoId } = bodySchema.parse(request.body)
      const { sub: userId } = request.user as { sub: string }

      // Verifica se o Enum existe para evitar crash do Prisma
      const action = LogAction.AGENDAMENTO_CRIADO ? LogAction.AGENDAMENTO_CRIADO : LogAction.OUTRO

      const agendamento = await prisma.agendamento.create({
        data: {
          titulo,
          data,
          observacoes: typeof observacoes === 'string' ? observacoes : null,
          casoId,
          responsavelId: userId
        }
      })

      // Log de Auditoria
      await prisma.caseLog.create({
        data: {
          casoId,
          autorId: userId,
          acao: action,
          descricao: `Agendou: ${titulo} para ${data.toLocaleDateString('pt-BR')}`
        }
      })

      return reply.status(201).send(agendamento)

    } catch (error) {
      // 🔍 LOG DE ERRO DETALHADO
      if (error instanceof z.ZodError) {
        console.error("❌ Erro de Validação Zod:", JSON.stringify(error.format(), null, 2))
        return reply.status(400).send({ message: 'Dados inválidos', errors: error.format() })
      }
      
      console.error("❌ Erro Interno:", error)
      return reply.status(500).send({ message: 'Erro interno ao criar agendamento.' })
    }
  })
}