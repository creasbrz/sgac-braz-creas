// backend/src/routes/groups.ts
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
      console.error('Erro ao listar grupos:', error)
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

  // [POST] Criar Grupo
  app.post('/groups', async (req, reply) => {
    try {
      const bodySchema = z.object({
        tema: z.string().min(3),
        tipo: z.nativeEnum(GroupType),
        dataRealizacao: z.string(),
        local: z.string().optional(),
        descricao: z.string().optional(),
        orgaosEnvolvidos: z.array(z.string()).default([]) 
      })

      const data = bodySchema.parse(req.body)
      const userId = (req.user as any).sub

      const group = await prisma.groupActivity.create({
        data: {
          ...data,
          dataRealizacao: new Date(data.dataRealizacao),
          facilitadorId: userId
        }
      })

      return reply.status(201).send(group)
    } catch (error) {
      console.error('Erro ao criar grupo:', error)
      return reply.status(500).send({ message: 'Erro ao criar atividade.' })
    }
  })

  // [POST] Adicionar Participantes (+ Evolução Automática)
  app.post('/groups/:id/participants', async (req, reply) => {
    try {
      const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
      const { caseIds } = z.object({ caseIds: z.array(z.string().uuid()) }).parse(req.body)
      const userId = (req.user as any).sub
      
      // 1. Busca dados do grupo para a evolução (Fundamental para não dar erro)
      const group = await prisma.groupActivity.findUnique({ where: { id } })
      if (!group) return reply.status(404).send({ message: 'Grupo não encontrado.' })

      let count = 0
      
      for (const caseId of caseIds) {
        // Verifica existência (chave composta)
        const exists = await prisma.groupAttendance.findUnique({
          where: { 
            grupoId_casoId: { grupoId: id, casoId: caseId } // [CORRIGIDO: casoId explicito]
          }
        })

        if (!exists) {
          // 2. Cria vínculo
          await prisma.groupAttendance.create({
            data: { grupoId: id, casoId: caseId, presente: false } // [CORRIGIDO]
          })

          // 3. Cria Evolução Automática no Prontuário
          const dataFormatada = format(group.dataRealizacao, "dd/MM/yyyy", { locale: ptBR })
          
          await prisma.evolucao.create({
            data: {
              casoId: caseId, // [CORRIGIDO]
              autorId: userId,
              sigilo: false,
              conteudo: `[SISTEMA] Usuário vinculado à atividade "${group.tema}" (${group.tipo}), prevista para ${dataFormatada}.`
            }
          })
          
          count++
        }
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

      // Busca dados do grupo
      const group = await prisma.groupActivity.findUnique({ where: { id: groupId } })

      // Atualiza presença usando chave composta
      const attendance = await prisma.groupAttendance.update({
        where: { 
          grupoId_casoId: { grupoId: groupId, casoId: caseId } // [CORRIGIDO]
        },
        data: { presente, observacoes }
      })

      // Evolução automática de presença
      if (group) {
        const statusTexto = presente ? "PRESENTE" : "AUSENTE"
        const obsTexto = observacoes ? ` Observações: ${observacoes}` : ""
        const dataFormatada = format(group.dataRealizacao, "dd/MM/yyyy", { locale: ptBR })

        await prisma.evolucao.create({
          data: {
            casoId: caseId, // [CORRIGIDO]
            autorId: userId,
            sigilo: false,
            conteudo: `[SISTEMA] Registro de Frequência - ${group.tema} (${dataFormatada}). Status: ${statusTexto}.${obsTexto}`
          }
        })
      }

      // Log de auditoria
      await prisma.caseLog.create({
        data: {
          casoId: caseId, // [CORRIGIDO]
          autorId: userId,
          acao: LogAction.PRESENCA_REGISTRADA,
          descricao: `Presença em grupo (${presente ? 'Presente' : 'Ausente'})`
        }
      })

      return reply.send(attendance)
    } catch (error) {
      console.error('❌ Erro ao atualizar presença:', error)
      return reply.status(500).send({ message: 'Erro ao atualizar presença.' })
    }
  })
}