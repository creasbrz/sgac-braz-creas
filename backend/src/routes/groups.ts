// backend/src/routes/groups.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
// [CORREÇÃO 1] Adicionado CaseStatus aos imports
import { LogAction, GroupType, CaseStatus } from '@prisma/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// --- Interfaces & Types ---
interface UserPayload {
  sub: string
  name: string
  roles: string[]
}

// --- Schemas ---

const groupResponseSchema = z.object({
  id: z.string().uuid(),
  tema: z.string(),
  tipo: z.nativeEnum(GroupType),
  dataRealizacao: z.date(),
  local: z.string().nullable().optional(),
  descricao: z.string().nullable().optional(),
  facilitador: z.object({ nome: z.string() }).optional(),
  _count: z.object({ participantes: z.number() }).optional(),
  attendanceConfirmed: z.boolean().default(false),
  participantes: z.array(z.object({
    id: z.string(),
    presente: z.boolean(),
    observacoes: z.string().nullable().optional(),
    casoId: z.string().uuid(),
    caso: z.object({
      id: z.string(),
      nomeCompleto: z.string()
    })
  })).optional()
})

const createGroupSchema = z.object({
  tema: z.string().min(3, "Tema deve ter no mínimo 3 caracteres"),
  tipo: z.nativeEnum(GroupType),
  datas: z.array(z.string()).optional(),
  dataRealizacao: z.string().optional(),
  local: z.string().optional(),
  descricao: z.string().optional(),
  orgaosEnvolvidos: z.array(z.string()).default([])
})

export async function groupRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()
  
  // Middleware de Autenticação Global para o escopo
  server.addHook('onRequest', async (req, reply) => {
    try { 
      await req.jwtVerify() 
    } catch { 
      return reply.status(401).send({ message: 'Sessão expirada ou inválida.' }) 
    }
  })

  // 1. [GET] LISTAR GRUPOS
  server.get('/groups', {
    schema: {
      tags: ['Grupos'],
      summary: 'Listar atividades coletivas',
      response: {
        200: z.array(groupResponseSchema)
      }
    }
  }, async (req, reply) => {
    const groups = await prisma.groupActivity.findMany({
      orderBy: { dataRealizacao: 'desc' },
      take: 100, // Aumentado para ver mais histórico
      include: {
        facilitador: { select: { nome: true } },
        _count: { select: { participantes: true } }
      }
    })
    return reply.send(groups)
  })

  // 2. [GET] DETALHES DO GRUPO
  server.get('/groups/:id', {
    schema: {
      tags: ['Grupos'],
      summary: 'Obter detalhes completos do grupo',
      params: z.object({ id: z.string().uuid() }),
      response: {
        200: groupResponseSchema
      }
    }
  }, async (req, reply) => {
    const { id } = req.params
    
    const group = await prisma.groupActivity.findUnique({
      where: { id },
      include: {
        facilitador: { select: { id: true, nome: true } },
        participantes: {
          include: {
            caso: { select: { id: true, nomeCompleto: true } }
          },
          orderBy: { caso: { nomeCompleto: 'asc' } }
        }
      }
    })

    if (!group) return reply.status(404).send({ message: 'Grupo não encontrado' })
    return reply.send(group)
  })

  // 3. [GET] LISTAR CANDIDATOS (CORRIGIDO)
  server.get('/groups/:id/candidates', {
    schema: {
      tags: ['Grupos'],
      summary: 'Listar casos ativos elegíveis para entrar no grupo',
      params: z.object({ id: z.string().uuid() }),
      response: {
        200: z.array(z.object({
          id: z.string(),
          nomeCompleto: z.string(),
          status: z.string()
        }))
      }
    }
  }, async (req, reply) => {
    const { id } = req.params

    try {
      // 1. Valida se grupo existe
      const groupExists = await prisma.groupActivity.findUnique({ where: { id } })
      if (!groupExists) {
        return reply.status(404).send({ message: 'Grupo não encontrado' })
      }

      // 2. Busca IDs de quem JÁ está no grupo para excluir da lista
      const existingMembers = await prisma.groupAttendance.findMany({
        where: { grupoId: id },
        select: { casoId: true }
      })
      
      const excludedIds = existingMembers.map(m => m.casoId)

      // 3. Busca candidatos
      const candidates = await prisma.case.findMany({
        where: {
          id: { notIn: excludedIds },
          
          // [CORREÇÃO 2] Uso do Enum CaseStatus.DESLIGADO
          // Isso garante que estamos passando o tipo correto para o Prisma.
          status: { 
            notIn: [CaseStatus.DESLIGADO] 
          } 
        },
        select: {
          id: true,
          nomeCompleto: true,
          status: true
        },
        orderBy: { nomeCompleto: 'asc' },
        take: 300
      })

      return reply.send(candidates)

    } catch (error) {
      req.log.error(error)
      return reply.status(500).send({ message: 'Erro interno ao buscar candidatos.' })
    }
  })

  // 4. [POST] CRIAR GRUPO
  server.post('/groups', {
    schema: {
      tags: ['Grupos'],
      summary: 'Agendar nova atividade',
      body: createGroupSchema,
      response: {
        201: z.object({ count: z.number(), message: z.string() })
      }
    }
  }, async (req, reply) => {
    const data = req.body
    const user = req.user as UserPayload

    // Normaliza datas: usa array 'datas' ou string única 'dataRealizacao'
    let datesToCreate: string[] = []
    if (data.datas && data.datas.length > 0) {
      datesToCreate = data.datas
    } else if (data.dataRealizacao) {
      datesToCreate = [data.dataRealizacao]
    } else {
      return reply.status(400).send({ message: 'É necessário informar a data da atividade.' })
    }

    try {
      // Criação paralela
      const createdGroups = await prisma.$transaction(
        datesToCreate.map((dateStr) => 
          prisma.groupActivity.create({
            data: {
              tema: data.tema,
              tipo: data.tipo,
              dataRealizacao: new Date(dateStr),
              local: data.local,
              descricao: data.descricao,
              orgaosEnvolvidos: data.orgaosEnvolvidos,
              facilitadorId: user.sub
            }
          })
        )
      )

      return reply.status(201).send({ 
        count: createdGroups.length, 
        message: createdGroups.length > 1 
          ? `Cronograma criado com ${createdGroups.length} atividades.`
          : 'Atividade agendada com sucesso.'
      })

    } catch (error) {
      req.log.error(error)
      return reply.status(500).send({ message: 'Erro ao criar atividade no banco de dados.' })
    }
  })

  // 5. [POST] ADICIONAR PARTICIPANTES (OTIMIZADO)
  server.post('/groups/:id/participants', {
    schema: {
      tags: ['Grupos'],
      summary: 'Adicionar lista de participantes ao grupo',
      params: z.object({ id: z.string().uuid() }),
      body: z.object({ caseIds: z.array(z.string().uuid()) }),
      response: {
        200: z.object({ message: z.string() })
      }
    }
  }, async (req, reply) => {
    const { id: groupId } = req.params
    const { caseIds } = req.body
    const user = req.user as UserPayload
    
    const group = await prisma.groupActivity.findUnique({ where: { id: groupId } })
    if (!group) return reply.status(404).send({ message: 'Grupo não encontrado.' })

    const dataFormatada = format(group.dataRealizacao, "dd/MM/yyyy", { locale: ptBR })

    try {
      // OTIMIZAÇÃO: Busca quem JÁ está no grupo dentre os IDs enviados
      // Evita loop de consultas N+1
      const alreadyInGroup = await prisma.groupAttendance.findMany({
        where: {
          grupoId: groupId,
          casoId: { in: caseIds }
        },
        select: { casoId: true }
      })

      const existingIds = new Set(alreadyInGroup.map(item => item.casoId))
      
      // Filtra apenas os IDs que realmente são novos
      const newParticipantsIds = caseIds.filter(caseId => !existingIds.has(caseId))

      if (newParticipantsIds.length === 0) {
        return reply.send({ message: 'Todos os selecionados já estão no grupo.' })
      }

      // Executa inserção em transação
      await prisma.$transaction(async (tx) => {
        // 1. Cria as participações (Bulk insert seria ideal, mas createMany não dispara middlewares se houver)
        // Usando Promise.all para paralelizar inserts é melhor que loop serial
        await Promise.all(newParticipantsIds.map(caseId => 
          tx.groupAttendance.create({
            data: { grupoId: groupId, casoId: caseId, presente: false }
          })
        ))

        // 2. Cria as evoluções nos prontuários
        await Promise.all(newParticipantsIds.map(caseId => 
          tx.evolucao.create({
            data: {
              casoId: caseId,
              autorId: user.sub,
              sigilo: false,
              conteudo: `[SISTEMA - GRUPO] Vinculado à atividade "${group.tema}" (${group.tipo}), prevista para ${dataFormatada}.`
            }
          })
        ))
      })

      return reply.send({ message: `${newParticipantsIds.length} participantes adicionados com sucesso.` })

    } catch (error) {
      req.log.error(error)
      return reply.status(500).send({ message: 'Erro interno ao processar inclusão.' })
    }
  })

  // 6. [PATCH] ATUALIZAR PRESENÇA
  server.patch('/groups/:groupId/attendance/:caseId', {
    schema: {
      tags: ['Grupos'],
      summary: 'Atualizar presença e observação',
      params: z.object({ 
        groupId: z.string().uuid(), 
        caseId: z.string().uuid() 
      }),
      body: z.object({ 
        presente: z.boolean(), 
        observacoes: z.string().optional() 
      })
    }
  }, async (req, reply) => {
    const { groupId, caseId } = req.params
    const { presente, observacoes } = req.body
    const user = req.user as UserPayload

    try {
      const result = await prisma.$transaction(async (tx) => {
        // Verifica existência usando a chave composta (se existir no schema) ou findFirst
        const attendance = await tx.groupAttendance.findFirst({ 
          where: { grupoId: groupId, casoId: caseId }
        })
        
        if (!attendance) throw new Error("Participação não encontrada")

        // Atualiza status
        const updated = await tx.groupAttendance.update({
          where: { id: attendance.id },
          data: { presente, observacoes }
        })

        // Gera Logs e Evolução
        const group = await tx.groupActivity.findUnique({ where: { id: groupId } })
        if (group) {
            const statusTexto = presente ? "PRESENTE" : "AUSENTE"
            const dataFmt = format(group.dataRealizacao, "dd/MM", { locale: ptBR })
            
            await tx.evolucao.create({
              data: {
                casoId: caseId,
                autorId: user.sub,
                sigilo: false,
                conteudo: `[SISTEMA - FREQUÊNCIA] ${group.tema} (${dataFmt}): ${statusTexto}.${observacoes ? ` Obs: ${observacoes}` : ''}`
              }
            })
        }
        
        // Log de Auditoria
        await tx.caseLog.create({
          data: {
            casoId: caseId,
            autorId: user.sub,
            acao: LogAction.PRESENCA_REGISTRADA,
            descricao: `Grupo: ${presente ? 'Presente' : 'Ausente'}`
          }
        })

        return updated
      })

      return reply.send(result)

    } catch (error: any) {
      if (error.message === "Participação não encontrada") {
        return reply.status(404).send({ message: 'Participante não está neste grupo.' })
      }
      req.log.error(error)
      return reply.status(500).send({ message: 'Erro ao registrar presença.' })
    }
  })

  // 7. [PATCH] FINALIZAR ATIVIDADE
  server.patch('/groups/:id/confirm', {
    schema: {
      tags: ['Grupos'],
      params: z.object({ id: z.string().uuid() }),
      response: {
        200: z.object({ message: z.string(), attendanceConfirmed: z.boolean() })
      }
    }
  }, async (req, reply) => {
    const { id } = req.params
    
    const group = await prisma.groupActivity.update({
      where: { id },
      data: { attendanceConfirmed: true }
    })

    return reply.send({ 
      message: 'Lista de presença fechada com sucesso.',
      attendanceConfirmed: group.attendanceConfirmed
    })
  })
}