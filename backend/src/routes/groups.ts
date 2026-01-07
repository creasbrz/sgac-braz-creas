import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { LogAction, GroupType } from '@prisma/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export async function groupRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send() }
  })

  // [GET] Listar Grupos
  app.get('/groups', async (req, reply) => {
    try {
      const groups = await prisma.groupActivity.findMany({
        orderBy: { dataRealizacao: 'desc' },
        include: {
          facilitador: { select: { nome: true } },
          _count: { select: { participantes: true } }
        }
      })
      return reply.send(groups)
    } catch (error) {
      return reply.status(500).send({ message: 'Erro ao buscar grupos.' })
    }
  })

  // [GET] Detalhes do Grupo
  app.get('/groups/:id', async (req, reply) => {
    try {
      const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
      
      const group = await prisma.groupActivity.findUnique({
        where: { id },
        include: {
          facilitador: { select: { id: true, nome: true } },
          participantes: {
            include: {
              caso: { select: { id: true, nomeCompleto: true } }
            }
          }
        }
      })

      if (!group) return reply.status(404).send({ message: 'Grupo não encontrado' })
      return reply.send(group)
    } catch (error) {
      return reply.status(500).send({ message: 'Erro ao buscar detalhes.' })
    }
  })

  // [GET] Listar Candidatos (Casos Ativos que NÃO estão no grupo)
  app.get('/groups/:id/candidates', async (req, reply) => {
    try {
      const { id } = z.object({ id: z.string().uuid() }).parse(req.params)

      // 1. Busca IDs de quem JÁ está no grupo para excluir
      const existingMembers = await prisma.groupAttendance.findMany({
        where: { grupoId: id },
        select: { casoId: true }
      })

      const excludedIds = existingMembers.map(m => m.casoId)

      // 2. Busca casos ATIVOS que NÃO estão na lista de excluídos
      const candidates = await prisma.case.findMany({
        where: {
          id: { notIn: excludedIds },
          status: { 
            notIn: ['DESLIGADO', 'AGUARDANDO_ACOLHIDA'] 
          } 
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
    } catch (error) {
      console.error('Erro ao buscar candidatos:', error)
      return reply.status(500).send({ message: 'Erro ao carregar lista de casos.' })
    }
  })

  // [POST] Criar Grupo
  app.post('/groups', async (req, reply) => {
    try {
      const bodySchema = z.object({
        tema: z.string().min(3),
        tipo: z.nativeEnum(GroupType),
        datas: z.array(z.string()).optional(), 
        dataRealizacao: z.string().optional(),
        local: z.string().optional(),
        descricao: z.string().optional(),
        orgaosEnvolvidos: z.array(z.string()).default([]) 
      })

      const data = bodySchema.parse(req.body)
      const userId = (req.user as any).sub

      let datesToCreate: string[] = []
      
      if (data.datas && data.datas.length > 0) {
        datesToCreate = data.datas
      } else if (data.dataRealizacao) {
        datesToCreate = [data.dataRealizacao]
      } else {
        return reply.status(400).send({ message: 'Selecione pelo menos uma data.' })
      }

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

      await prisma.caseLog.create({
        data: {
          casoId: 'SISTEMA',
          autorId: userId,
          acao: LogAction.ATIVIDADE_GRUPO_CRIADA,
          descricao: `Criou atividade "${data.tema}" para ${datesToCreate.length} data(s).`
        }
      })

      return reply.status(201).send({ count: createdGroups.length, groups: createdGroups })

    } catch (error) {
      return reply.status(500).send({ message: 'Erro ao criar atividade.' })
    }
  })

  // [POST] Adicionar Participantes (+ Evolução Automática)
  app.post('/groups/:id/participants', async (req, reply) => {
    try {
      const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
      const { caseIds } = z.object({ caseIds: z.array(z.string().uuid()) }).parse(req.body)
      const userId = (req.user as any).sub
      
      const group = await prisma.groupActivity.findUnique({ where: { id } })
      if (!group) return reply.status(404).send({ message: 'Grupo não encontrado.' })

      let count = 0
      
      for (const caseId of caseIds) {
        await prisma.$transaction(async (tx) => {
          // [CORREÇÃO CRÍTICA] Usamos findFirst em vez de findUnique
          // Isso evita erros se o nome do índice composto no banco for diferente do padrão do Prisma
          const existing = await tx.groupAttendance.findFirst({
            where: { 
              grupoId: id, 
              casoId: caseId 
            }
          })

          if (!existing) {
            await tx.groupAttendance.create({
              data: { 
                grupoId: id, 
                casoId: caseId, 
                presente: false 
              }
            })

            const dataFormatada = format(group.dataRealizacao, "dd/MM/yyyy", { locale: ptBR })
            
            await tx.evolucao.create({
              data: {
                casoId: caseId, 
                autorId: userId,
                sigilo: false,
                conteudo: `[SISTEMA] Usuário vinculado à atividade "${group.tema}" (${group.tipo}), prevista para ${dataFormatada}.`
              }
            })
            
            count++
          }
        })
      }

      return reply.send({ message: `${count} participantes adicionados.` })
    } catch (error) {
      console.error('❌ Erro ao adicionar participantes:', error)
      return reply.status(500).send({ message: 'Erro interno ao adicionar participantes.' })
    }
  })

  // [PATCH] Atualizar Presença (+ Evolução Automática)
  app.patch('/groups/:groupId/attendance/:caseId', async (req, reply) => {
    try {
      const paramsSchema = z.object({ groupId: z.string().uuid(), caseId: z.string().uuid() })
      const bodySchema = z.object({ presente: z.boolean(), observacoes: z.string().optional() })

      const { groupId, caseId } = paramsSchema.parse(req.params)
      const { presente, observacoes } = bodySchema.parse(req.body)
      const userId = (req.user as any).sub

      const result = await prisma.$transaction(async (tx) => {
        const group = await tx.groupActivity.findUnique({ where: { id: groupId } })
        
        // Busca a participação de forma segura
        const attendance = await tx.groupAttendance.findFirst({ 
          where: { 
            grupoId: groupId, 
            casoId: caseId 
          }
        })
        
        if (!attendance) throw new Error("Participação não encontrada")

        const updatedAttendance = await tx.groupAttendance.update({
          where: { id: attendance.id },
          data: { presente, observacoes }
        })

        if (group) {
          const statusTexto = presente ? "PRESENTE" : "AUSENTE"
          const obsTexto = observacoes ? ` Observações: ${observacoes}` : ""
          const dataFormatada = format(group.dataRealizacao, "dd/MM/yyyy", { locale: ptBR })

          // Cria Evolução
          await tx.evolucao.create({
            data: {
              casoId: caseId,
              autorId: userId,
              sigilo: false,
              conteudo: `[SISTEMA] Registro de Frequência - ${group.tema} (${dataFormatada}). Status: ${statusTexto}.${obsTexto}`
            }
          })
        }

        // Log Auditoria
        await tx.caseLog.create({
          data: {
            casoId: caseId,
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
      return reply.status(500).send({ message: 'Erro ao atualizar presença.' })
    }
  })
}