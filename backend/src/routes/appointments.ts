// backend/src/routes/appointments.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { LogAction } from '@prisma/client'

export async function appointmentRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify() } catch (err) { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  // [GET] Listar (Unificado: Agendamentos Individuais + Grupos)
  app.get('/appointments', async (request, reply) => {
    const { caseId, month, pageSize } = z.object({ 
      caseId: z.string().uuid().optional(),
      month: z.string().regex(/^\d{4}-\d{2}$/).optional(), // YYYY-MM
      pageSize: z.coerce.number().optional().default(100)
    }).parse(request.query)
    
    const userId = (request.user as any).sub

    // Filtros de Data
    let dateFilter: any = {}
    if (month) {
      const start = new Date(`${month}-01T00:00:00`)
      const end = new Date(new Date(start).setMonth(start.getMonth() + 1))
      dateFilter = { gte: start, lt: end }
    }

    // 1. Buscar Agendamentos Individuais
    const appointmentsWhere: any = { ... (caseId ? { casoId } : {}) }
    if (month) appointmentsWhere.data = dateFilter

    // *Regra de Negócio*: Se não tem caseId (visão geral), filtra por responsabilidade ou permissão?
    // Por enquanto, trazemos tudo (visão de equipe), mas poderia ser filtrado por userId aqui.
    
    const appointments = await prisma.agendamento.findMany({
      where: appointmentsWhere,
      orderBy: { data: 'asc' },
      take: pageSize,
      include: { 
        responsavel: { select: { nome: true } },
        caso: { 
          select: { id: true, nomeCompleto: true, telefone: true } 
        }
      }
    })

    // 2. Buscar Atividades em Grupo (Apenas se não estiver filtrando por um caso específico)
    // Se estiver filtrando por caso, buscamos apenas os grupos onde ele participa.
    let groupsWhere: any = {}
    if (month) groupsWhere.dataRealizacao = dateFilter

    if (caseId) {
      groupsWhere.participantes = { some: { casoId } }
    }

    const groups = await prisma.groupActivity.findMany({
      where: groupsWhere,
      orderBy: { dataRealizacao: 'asc' },
      take: pageSize,
      include: {
        facilitador: { select: { nome: true } },
        // Não precisamos dos participantes aqui para o calendário leve
      }
    })

    // 3. Unificar e Padronizar Resposta
    const mappedAppointments = appointments.map(a => ({
      id: a.id,
      titulo: a.titulo,
      data: a.data,
      observacoes: a.observacoes,
      tipo: 'INDIVIDUAL',
      responsavel: a.responsavel,
      caso: a.caso,
      isGroup: false
    }))

    const mappedGroups = groups.map(g => ({
      id: g.id,
      titulo: `[GRUPO] ${g.tema}`, // Prefixo para identificar visualmente
      data: g.dataRealizacao,
      observacoes: `${g.tipo.replace('_', ' ')} - Local: ${g.local || 'N/A'}`,
      tipo: 'COLETIVO',
      responsavel: g.facilitador,
      caso: null, // Grupo não tem um caso único "pai"
      isGroup: true,
      originalId: g.id // ID original do grupo para links
    }))

    // Mesclar e ordenar por data
    const combined = [...mappedAppointments, ...mappedGroups].sort((a, b) => 
      new Date(a.data).getTime() - new Date(b.data).getTime()
    )

    return reply.send(combined)
  })

  // [POST] Criar (Mantido igual - cria apenas agendamento individual)
  // Agendamentos de grupo são criados na rota /groups
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
          acao: LogAction.AGENDAMENTO_CRIADO,
          descricao: `Agendou: ${titulo} para ${data.toLocaleDateString('pt-BR')}`
        }
      })

      return reply.status(201).send(agendamento)

    } catch (error) {
      return reply.status(500).send({ message: 'Erro ao criar agendamento.' })
    }
  })
}