// backend/src/routes/appointments.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { LogAction } from '@prisma/client'

const emptyToNull = (val: unknown) => {
  if (typeof val === 'string' && val.trim() === '') return null;
  return val;
}

export async function appointmentRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify() } catch (err) { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  // 1. LISTAR (Correção do filtro casoId)
  app.get('/appointments', async (request, reply) => {
    const querySchema = z.object({ 
      caseId: z.string().uuid().optional(),
      month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      pageSize: z.coerce.number().optional().default(100)
    })

    const { caseId, month, pageSize } = querySchema.parse(request.query)
    
    // Filtro de Data
    let dateFilter: any = {}
    if (month) {
      const [year, m] = month.split('-').map(Number)
      const start = new Date(Date.UTC(year, m - 1, 1))
      const end = new Date(Date.UTC(year, m, 1))
      dateFilter = { gte: start, lt: end }
    }

    // A. Buscar Agendamentos Individuais
    const appointmentsWhere: any = {}
    
    // CORREÇÃO AQUI:
    if (caseId) appointmentsWhere.casoId = caseId; // Mapeamento explícito
    if (month) appointmentsWhere.data = dateFilter;

    const appointments = await prisma.agendamento.findMany({
      where: appointmentsWhere,
      orderBy: { data: 'asc' },
      take: pageSize,
      include: { 
        responsavel: { select: { id: true, nome: true } }, 
        caso: { 
          select: { id: true, nomeCompleto: true, telefone: true } 
        }
      }
    })

    // B. Buscar Grupos
    let groupsWhere: any = {}
    if (month) groupsWhere.dataRealizacao = dateFilter
    if (caseId) groupsWhere.participantes = { some: { casoId: caseId } } // Correção aqui também

    const groups = await prisma.groupActivity.findMany({
      where: groupsWhere,
      orderBy: { dataRealizacao: 'asc' },
      take: pageSize,
      include: {
        facilitador: { select: { id: true, nome: true } },
      }
    })

    // C. Mapeamento
    const mappedAppointments = appointments.map(a => ({
      ...a, 
      title: a.titulo,
      start: a.data,
      end: new Date(new Date(a.data).getTime() + 60 * 60 * 1000),
      tipo: 'INDIVIDUAL',
      isGroup: false,
      color: '#3b82f6',
      casoNome: a.caso?.nomeCompleto
    }))

    const mappedGroups = groups.map(g => ({
      id: g.id,
      titulo: `[GRUPO] ${g.tema}`,
      data: g.dataRealizacao, 
      observacoes: `${g.tipo.replace('_', ' ')} - Local: ${g.local || 'N/A'}`,
      responsavel: g.facilitador,
      caso: null, 
      title: `[GRUPO] ${g.tema}`,
      start: g.dataRealizacao,
      end: new Date(new Date(g.dataRealizacao).getTime() + 90 * 60 * 1000),
      tipo: 'COLETIVO',
      isGroup: true,
      color: '#10b981',
      originalId: g.id
    }))

    const combined = [...mappedAppointments, ...mappedGroups].sort((a, b) => 
      new Date(a.start).getTime() - new Date(b.start).getTime()
    )

    return reply.send(combined)
  })

  // 2. CRIAR
  app.post('/appointments', async (request, reply) => {
    const bodySchema = z.object({
      titulo: z.string().min(3, "Título é obrigatório"),
      data: z.coerce.date({ required_error: "Data é obrigatória" }),
      observacoes: z.preprocess(emptyToNull, z.string().optional().nullable()),
      casoId: z.string().uuid(),
    })

    try {
      const { titulo, data, observacoes, casoId } = bodySchema.parse(request.body)
      const { sub: userId } = request.user as { sub: string }

      const agendamento = await prisma.agendamento.create({
        data: {
          titulo,
          data,
          observacoes,
          casoId: casoId, // Mapeamento correto
          responsavelId: userId
        },
        include: {
            responsavel: { select: { id: true, nome: true } },
            caso: { select: { id: true, nomeCompleto: true } }
        }
      })

      await prisma.caseLog.create({
        data: {
          casoId: casoId,
          autorId: userId,
          acao: LogAction.AGENDAMENTO_CRIADO,
          descricao: `Agendou: ${titulo} para ${data.toLocaleDateString('pt-BR')}`
        }
      })

      return reply.status(201).send(agendamento)

    } catch (error) {
      console.error("Erro POST Appointment:", error)
      if (error instanceof z.ZodError) return reply.status(400).send({ message: 'Dados inválidos', errors: error.flatten().fieldErrors })
      return reply.status(500).send({ message: 'Erro ao criar agendamento.' })
    }
  })

  // 3. EXCLUIR
  app.delete('/appointments/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() })
    try {
        const { id } = paramsSchema.parse(request.params)
        const { sub: userId } = request.user as { sub: string }

        const ag = await prisma.agendamento.findUnique({ where: { id } })
        if (!ag) return reply.status(404).send({ message: "Agendamento não encontrado" })

        await prisma.agendamento.delete({ where: { id } })

        await prisma.caseLog.create({
            data: {
              casoId: ag.casoId,
              autorId: userId,
              acao: LogAction.OUTRO,
              descricao: `Cancelou agendamento: ${ag.titulo}`
            }
          })

        return reply.status(204).send()
    } catch (error) {
        return reply.status(500).send({ message: "Erro ao excluir." })
    }
  })
}