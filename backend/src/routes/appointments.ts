// backend/src/routes/appointments.ts
import { type FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { LogAction, Cargo } from '@prisma/client'

// --- Schemas ---

const calendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  start: z.date(),
  end: z.date().nullable().optional(),
  type: z.enum(['INDIVIDUAL', 'GRUPO']),
  resourceId: z.string().optional(),
  description: z.string().optional(),
  status: z.string()
})

const upcomingSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  data: z.date(),
  caso: z.object({ nomeCompleto: z.string() }).nullable().optional()
})

const createAppointmentSchema = z.object({
  titulo: z.string().min(3, "Título muito curto"),
  data: z.coerce.date(),
  observacoes: z.string().nullable().optional(), 
  casoId: z.string().uuid(),
  tipo: z.string().optional()
})

export async function appointmentRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()
  
  server.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  // [GET] Widget Dashboard
  server.get('/stats/my-agenda', {
    schema: {
      tags: ['Agenda'],
      summary: 'Próximos compromissos do usuário (Widget)',
      response: { 200: z.array(upcomingSchema) }
    }
  }, async (req, reply) => {
    const { sub: userId } = req.user as { sub: string }
    const upcoming = await prisma.agendamento.findMany({
      where: { responsavelId: userId, data: { gte: new Date() } },
      include: { caso: { select: { nomeCompleto: true } } },
      orderBy: { data: 'asc' },
      take: 5
    })
    return reply.send(upcoming)
  })

  // [GET] Calendário Principal (Correção do Erro casoId)
  server.get('/appointments', {
    schema: {
      tags: ['Agenda'],
      summary: 'Listar compromissos (Agendamentos + Grupos)',
      querystring: z.object({ 
        caseId: z.string().uuid().optional(), 
        start: z.coerce.date().optional(), 
        end: z.coerce.date().optional(),   
      }),
      response: { 200: z.array(calendarEventSchema) }
    }
  }, async (req, reply) => {
    const { caseId, start, end } = req.query
    const { sub: userId, cargo } = req.user as { sub: string, cargo: string }

    // Smart Defaults
    const now = new Date()
    const queryStart = start || new Date(now.getFullYear(), now.getMonth(), 1)
    const queryEnd = end || new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const whereClause: any = { data: { gte: queryStart, lte: queryEnd } }

    if (caseId) {
      whereClause.casoId = caseId
    } else if (cargo !== Cargo.Gerente) {
      whereClause.OR = [
        { responsavelId: userId },
        { caso: { OR: [{ agenteAcolhidaId: userId }, { especialistaPAEFIId: userId }] } }
      ]
    }

    const [appointments, groups] = await Promise.all([
      // 1. Agendamentos Individuais
      prisma.agendamento.findMany({
        where: whereClause,
        include: { caso: { select: { nomeCompleto: true } } }
      }),
      
      // 2. Atividades de Grupo
      caseId 
        ? prisma.groupActivity.findMany({
            where: { 
              dataRealizacao: { gte: queryStart, lte: queryEnd }, 
              // [CORREÇÃO AQUI] Usando 'casoId: caseId' explicitamente
              participantes: { some: { casoId: caseId } } 
            },
            include: { facilitador: { select: { nome: true } } }
          })
        : prisma.groupActivity.findMany({
            where: { dataRealizacao: { gte: queryStart, lte: queryEnd } },
            include: { facilitador: { select: { nome: true } } }
          })
    ])

    const normalized = [
      ...appointments.map(a => ({
        id: a.id,
        title: a.caso ? `${a.titulo} - ${a.caso.nomeCompleto}` : a.titulo,
        start: a.data,
        type: 'INDIVIDUAL' as const,
        resourceId: a.casoId,
        description: a.observacoes || '',
        status: 'SCHEDULED'
      })),
      ...groups.map(g => ({
        id: g.id,
        title: `[GRUPO] ${g.tema} (${g.tipo.replace('_', ' ')})`,
        start: g.dataRealizacao,
        type: 'GRUPO' as const,
        resourceId: g.id,
        description: g.descricao || '',
        status: 'SCHEDULED'
      }))
    ]

    return reply.send(normalized.sort((a, b) => a.start.getTime() - b.start.getTime()))
  })

  // [POST] Criar
  server.post('/appointments', {
    schema: {
      tags: ['Agenda'],
      body: createAppointmentSchema
    }
  }, async (req, reply) => {
    const data = req.body
    const userId = (req.user as any).sub

    const agendamento = await prisma.agendamento.create({
      data: { ...data, responsavelId: userId }
    })

    // Log (Fire and forget)
    prisma.caseLog.create({
      data: {
        casoId: data.casoId,
        autorId: userId,
        acao: LogAction.AGENDAMENTO_CRIADO,
        descricao: `Agendamento: ${data.titulo}`
      }
    }).catch(console.error)

    return reply.status(201).send(agendamento)
  })

  // [PUT] Editar
  server.put('/appointments/:id', {
    schema: {
      tags: ['Agenda'],
      params: z.object({ id: z.string().uuid() }),
      body: createAppointmentSchema.partial()
    }
  }, async (req, reply) => {
    const { id } = req.params
    const data = req.body
    const { sub: userId, cargo } = req.user as { sub: string, cargo: string }

    const existing = await prisma.agendamento.findUnique({ where: { id } })
    
    if (!existing || (existing.responsavelId !== userId && cargo !== Cargo.Gerente)) {
      return reply.status(403).send({ message: 'Sem permissão.' })
    }

    const updated = await prisma.agendamento.update({
      where: { id },
      data
    })

    return reply.send(updated)
  })

  // [DELETE] Remover
  server.delete('/appointments/:id', {
    schema: {
      tags: ['Agenda'],
      params: z.object({ id: z.string().uuid() })
    }
  }, async (req, reply) => {
    const { id } = req.params
    const { sub: userId, cargo } = req.user as { sub: string, cargo: string }

    const existing = await prisma.agendamento.findUnique({ where: { id } })
    
    if (!existing || (existing.responsavelId !== userId && cargo !== Cargo.Gerente)) {
      return reply.status(403).send({ message: 'Sem permissão.' })
    }

    await prisma.agendamento.delete({ where: { id } })
    return reply.status(204).send()
  })
}