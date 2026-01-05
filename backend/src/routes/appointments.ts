import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { LogAction, Cargo } from '@prisma/client'

// Interface unificada
interface CalendarEvent {
  id: string
  title: string
  start: Date
  end?: Date | null
  type: 'INDIVIDUAL' | 'GRUPO'
  resourceId?: string
  description?: string
  status: string
}

export async function appointmentRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify() } catch (err) { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  // [GET] Listar Agendamentos
  app.get('/appointments', async (request, reply) => {
    // 1. Schema
    const querySchema = z.object({ 
      caseId: z.string().uuid().optional(), 
      start: z.coerce.date().optional(), 
      end: z.coerce.date().optional(),   
    })

    const { caseId, start: reqStart, end: reqEnd } = querySchema.parse(request.query)
    // [CORREÇÃO] Extraindo cargo para permissões
    const { sub: userId, cargo } = request.user as { sub: string, cargo: string }

    // 2. Lógica de "Smart Defaults"
    let start = reqStart
    let end = reqEnd

    if (!start || !end) {
      const now = new Date()
      if (caseId) {
        if (!start) start = new Date(now.getFullYear() - 5, 0, 1)
        if (!end) end = new Date(now.getFullYear() + 2, 11, 31)
      } else {
        if (!start) start = new Date(now.getFullYear(), now.getMonth(), 1)
        if (!end) end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      }
    }

    const queryStart = start as Date
    const queryEnd = end as Date

    // 3. Busca Agendamentos Individuais (CORRIGIDO)
    const whereClause: any = {
      data: { gte: queryStart, lte: queryEnd }
    }

    if (caseId) {
      // Se filtrando por caso, traz tudo daquele caso
      whereClause.casoId = caseId
    } else {
      // Se é Agenda Geral:
      // Gerentes veem tudo. Outros veem apenas o que são responsáveis OU onde são o técnico do caso.
      if (cargo !== 'Gerente' && cargo !== Cargo.Gerente) {
        whereClause.OR = [
          { responsavelId: userId }, // Criado por mim
          // OU sou o técnico do caso vinculado ao agendamento
          { caso: { OR: [{ agenteAcolhidaId: userId }, { especialistaPAEFIId: userId }] } }
        ]
      }
    }

    const individualPromise = prisma.agendamento.findMany({
      where: whereClause,
      include: { caso: { select: { nomeCompleto: true } } }
    })

    // 4. Busca Grupos
    const groupPromise = caseId 
      ? prisma.groupActivity.findMany({
          where: {
            dataRealizacao: { gte: queryStart, lte: queryEnd },
            participantes: { some: { casoId: caseId } }
          },
          include: { facilitador: { select: { nome: true } } }
        })
      : prisma.groupActivity.findMany({
          where: {
            dataRealizacao: { gte: queryStart, lte: queryEnd },
          },
          include: { facilitador: { select: { nome: true } } }
        })

    try {
      const [appointments, groups] = await Promise.all([individualPromise, groupPromise])

      const normalizedEvents: CalendarEvent[] = [
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
          description: g.descricao || `Facilitador: ${g.facilitador.nome}`,
          status: 'SCHEDULED'
        }))
      ]

      return reply.send(normalizedEvents.sort((a, b) => a.start.getTime() - b.start.getTime()))
    
    } catch (error) {
      console.error("ERRO GET /appointments:", error)
      return reply.status(500).send({ message: "Erro ao buscar agenda." })
    }
  })

  // [POST] Criar Agendamento
  app.post('/appointments', async (request, reply) => {
    const bodySchema = z.object({
      titulo: z.string().min(3),
      data: z.coerce.date(),
      observacoes: z.string().nullable().optional(), 
      casoId: z.string().uuid(),
      tipo: z.string().optional() // Adicionado tipo
    })

    const { titulo, data, observacoes, casoId, tipo } = bodySchema.parse(request.body)
    const userId = (request.user as any).sub

    try {
      const agendamento = await prisma.agendamento.create({
        data: {
          titulo,
          data,
          observacoes: observacoes || null,
          casoId,
          responsavelId: userId,
          // Se tiver campo 'tipo' no banco, adicione aqui. Se não, remova.
          // tipo: tipo 
        }
      })

      try {
        await prisma.caseLog.create({
          data: {
            casoId,
            autorId: userId,
            acao: LogAction.AGENDAMENTO_CRIADO, 
            descricao: `Agendamento criado: ${titulo} para ${data.toLocaleString()}`
          }
        })
      } catch (logError) {
        console.warn("⚠️ Log falhou, mas agendamento ok.", logError)
      }

      return reply.status(201).send(agendamento)

    } catch (mainError) {
      console.error("❌ ERRO POST /appointments:", mainError)
      return reply.status(500).send({ message: "Erro ao criar agendamento." })
    }
  })

  // [PUT] Atualizar
  app.put('/appointments/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() })
    const bodySchema = z.object({
      titulo: z.string().min(3).optional(),
      data: z.coerce.date().optional(),
      observacoes: z.string().nullable().optional(),
    })

    const { id } = paramsSchema.parse(request.params)
    const data = bodySchema.parse(request.body)
    const userId = (request.user as any).sub
    const { cargo } = request.user as { cargo: string }

    const existing = await prisma.agendamento.findUnique({ where: { id } })
    
    // Gerente pode editar qualquer um. Outros só o próprio.
    if (!existing || (existing.responsavelId !== userId && cargo !== 'Gerente')) {
      return reply.status(403).send({ message: 'Sem permissão.' })
    }

    const updated = await prisma.agendamento.update({
      where: { id },
      data: {
        ...data,
        ...(data.observacoes !== undefined ? { observacoes: data.observacoes } : {})
      }
    })

    return reply.send(updated)
  })

  // [DELETE] Remover
  app.delete('/appointments/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() })
    const { id } = paramsSchema.parse(request.params)
    const userId = (request.user as any).sub
    const { cargo } = request.user as { cargo: string }

    const existing = await prisma.agendamento.findUnique({ where: { id } })
    
    // Gerente pode deletar qualquer um. Outros só o próprio.
    if (!existing || (existing.responsavelId !== userId && cargo !== 'Gerente')) {
      return reply.status(403).send({ message: 'Sem permissão.' })
    }

    await prisma.agendamento.delete({ where: { id } })

    if (existing.casoId) {
      try {
        await prisma.caseLog.create({
          data: {
            casoId: existing.casoId,
            autorId: userId,
            acao: LogAction.OUTRO,
            descricao: `Agendamento excluído: ${existing.titulo}`
          }
        })
      } catch (e) {}
    }

    return reply.status(204).send()
  })
}