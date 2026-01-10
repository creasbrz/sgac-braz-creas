// backend/src/routes/groups.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { LogAction, GroupType } from '@prisma/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// --- Schemas Reutilizáveis ---

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
  
  server.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Não autorizado' }) }
  })

  // 1. [GET] LISTAR GRUPOS
  server.get('/groups', {
    schema: {
      tags: ['Grupos/Oficinas'],
      summary: 'Listar atividades coletivas agendadas ou realizadas',
      response: {
        200: z.array(groupResponseSchema)
      }
    }
  }, async (req, reply) => {
    const groups = await prisma.groupActivity.findMany({
      orderBy: { dataRealizacao: 'desc' },
      take: 50,
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
      tags: ['Grupos/Oficinas'],
      summary: 'Obter detalhes e lista de participantes do grupo',
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

  // 3. [GET] LISTAR CANDIDATOS
  server.get('/groups/:id/candidates', {
    schema: {
      tags: ['Grupos/Oficinas'],
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

    const existingMembers = await prisma.groupAttendance.findMany({
      where: { grupoId: id },
      select: { casoId: true }
    })
    const excludedIds = existingMembers.map(m => m.casoId)

    const candidates = await prisma.case.findMany({
      where: {
        id: { notIn: excludedIds },
        status: { notIn: ['DESLIGADO', 'AGUARDANDO_ACOLHIDA'] } 
      },
      select: {
        id: true,
        nomeCompleto: true,
        status: true
      },
      orderBy: { nomeCompleto: 'asc' },
      take: 200
    })

    return reply.send(candidates)
  })

  // 4. [POST] CRIAR GRUPO
  server.post('/groups', {
    schema: {
      tags: ['Grupos/Oficinas'],
      summary: 'Agendar nova atividade coletiva',
      body: createGroupSchema,
      response: {
        201: z.object({ count: z.number(), message: z.string() })
      }
    }
  }, async (req, reply) => {
    const data = req.body
    const userId = (req.user as any).sub

    let datesToCreate: string[] = []
    if (data.datas && data.datas.length > 0) {
      datesToCreate = data.datas
    } else if (data.dataRealizacao) {
      datesToCreate = [data.dataRealizacao]
    } else {
      return reply.status(400).send({ message: 'Selecione pelo menos uma data.' })
    }

    try {
      const createdGroups = await Promise.all(
        datesToCreate.map(async (dateStr) => {
          return prisma.groupActivity.create({
            data: {
              tema: data.tema,
              tipo: data.tipo,
              dataRealizacao: new Date(dateStr),
              local: data.local,
              descricao: data.descricao,
              orgaosEnvolvidos: data.orgaosEnvolvidos,
              facilitadorId: userId
            }
          })
        })
      )

      return reply.status(201).send({ 
        count: createdGroups.length, 
        message: `Atividade agendada para ${createdGroups.length} datas.` 
      })

    } catch (error) {
      console.error(error)
      return reply.status(500).send({ message: 'Erro ao criar atividade.' })
    }
  })

  // 5. [POST] ADICIONAR PARTICIPANTES
  server.post('/groups/:id/participants', {
    schema: {
      tags: ['Grupos/Oficinas'],
      summary: 'Vincular múltiplos casos ao grupo',
      params: z.object({ id: z.string().uuid() }),
      body: z.object({ caseIds: z.array(z.string().uuid()) }),
      response: {
        200: z.object({ message: z.string() })
      }
    }
  }, async (req, reply) => {
    const { id } = req.params
    const { caseIds } = req.body
    const userId = (req.user as any).sub
    
    const group = await prisma.groupActivity.findUnique({ where: { id } })
    if (!group) return reply.status(404).send({ message: 'Grupo não encontrado.' })

    const dataFormatada = format(group.dataRealizacao, "dd/MM/yyyy", { locale: ptBR })

    try {
      const count = await prisma.$transaction(async (tx) => {
        let added = 0
        
        for (const caseId of caseIds) {
          const existing = await tx.groupAttendance.findUnique({
            where: {
              grupoId_casoId: { grupoId: id, casoId: caseId } // [CORREÇÃO] Explicitamente casoId: caseId
            }
          })

          if (!existing) {
            await tx.groupAttendance.create({
              data: { grupoId: id, casoId: caseId, presente: false } // [CORREÇÃO] Explicitamente casoId: caseId
            })

            await tx.evolucao.create({
              data: {
                casoId: caseId, // [CORREÇÃO] Explicitamente casoId: caseId
                autorId: userId,
                sigilo: false,
                conteudo: `[SISTEMA - GRUPO] Vinculado à atividade "${group.tema}" (${group.tipo}), prevista para ${dataFormatada}.`
              }
            })
            
            added++
          }
        }
        return added
      })

      return reply.send({ message: `${count} participantes adicionados com sucesso.` })

    } catch (error) {
      console.error('❌ Erro ao adicionar participantes:', error)
      return reply.status(500).send({ message: 'Erro interno ao adicionar participantes.' })
    }
  })

  // 6. [PATCH] ATUALIZAR PRESENÇA (INDIVIDUAL)
  server.patch('/groups/:groupId/attendance/:caseId', {
    schema: {
      tags: ['Grupos/Oficinas'],
      summary: 'Registrar presença e observações do participante',
      params: z.object({ 
        groupId: z.string().uuid(), 
        caseId: z.string().uuid() 
      }),
      body: z.object({ 
        presente: z.boolean(), 
        observacoes: z.string().optional() 
      }),
      response: {
        200: z.any()
      }
    }
  }, async (req, reply) => {
    const { groupId, caseId } = req.params
    const { presente, observacoes } = req.body
    const userId = (req.user as any).sub

    try {
      const result = await prisma.$transaction(async (tx) => {
        const group = await tx.groupActivity.findUnique({ where: { id: groupId } })
        
        const attendance = await tx.groupAttendance.findUnique({ 
          where: { grupoId_casoId: { grupoId: groupId, casoId: caseId } } // [CORREÇÃO] Explicitamente casoId: caseId
        })
        
        if (!attendance) throw new Error("Participação não encontrada")

        const updatedAttendance = await tx.groupAttendance.update({
          where: { id: attendance.id },
          data: { presente, observacoes }
        })

        if (group) {
          const statusTexto = presente ? "PRESENTE" : "AUSENTE"
          const obsTexto = observacoes ? ` Obs: ${observacoes}` : ""
          const dataFormatada = format(group.dataRealizacao, "dd/MM/yyyy", { locale: ptBR })

          await tx.evolucao.create({
            data: {
              casoId: caseId, // [CORREÇÃO] Explicitamente casoId: caseId
              autorId: userId,
              sigilo: false,
              conteudo: `[SISTEMA - FREQUÊNCIA] Atividade: ${group.tema} (${dataFormatada}). Status: ${statusTexto}.${obsTexto}`
            }
          })
        }

        await tx.caseLog.create({
          data: {
            casoId: caseId, // [CORREÇÃO] Explicitamente casoId: caseId
            autorId: userId,
            acao: LogAction.PRESENCA_REGISTRADA,
            descricao: `Presença em grupo (${presente ? 'Presente' : 'Ausente'})`
          }
        })

        return updatedAttendance
      })

      return reply.send(result)
    } catch (error) {
      console.error('❌ Erro ao atualizar presença:', error)
      if ((error as Error).message === "Participação não encontrada") {
        return reply.status(404).send({ message: 'Participante não vinculado a este grupo.' })
      }
      return reply.status(500).send({ message: 'Erro ao atualizar presença.' })
    }
  })

  // 7. [PATCH] FINALIZAR ATIVIDADE
  server.patch('/groups/:id/confirm', {
    schema: {
      tags: ['Grupos/Oficinas'],
      summary: 'Confirmar que a atividade foi realizada e a chamada finalizada',
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
      message: 'Atividade confirmada e finalizada com sucesso.',
      attendanceConfirmed: group.attendanceConfirmed
    })
  })
}