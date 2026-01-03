// backend/src/routes/groups.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { LogAction, GroupType, Cargo } from '@prisma/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface UserPayload {
  sub: string
  cargo: Cargo
}

export async function groupRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Não autorizado.' }) }
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
              caso: { select: { id: true, nomeCompleto: true, telefone: true } }
            },
            orderBy: { caso: { nomeCompleto: 'asc' } } // Lista de chamada em ordem alfabética
          }
        }
      })

      if (!group) return reply.status(404).send({ message: 'Grupo não encontrado' })
      return reply.send(group)
    } catch (error) {
      return reply.status(500).send({ message: 'Erro ao buscar detalhes.' })
    }
  })

  // [POST] Criar Grupo (Suporte a Recorrência)
  app.post('/groups', async (req, reply) => {
    try {
      const bodySchema = z.object({
        tema: z.string().min(3, "Tema é obrigatório"),
        tipo: z.nativeEnum(GroupType),
        // Aceita array de strings ou string única (para compatibilidade)
        datas: z.array(z.string()).optional(), 
        dataRealizacao: z.string().optional(),
        local: z.string().optional(),
        descricao: z.string().optional(),
        orgaosEnvolvidos: z.array(z.string()).default([]) 
      })

      const data = bodySchema.parse(req.body)
      const { sub: userId } = req.user as UserPayload

      // Normaliza as datas
      let datesToCreate: string[] = []
      if (data.datas && data.datas.length > 0) {
        datesToCreate = data.datas
      } else if (data.dataRealizacao) {
        datesToCreate = [data.dataRealizacao]
      } else {
        return reply.status(400).send({ message: 'Selecione pelo menos uma data.' })
      }

      // Usa Transaction para garantir que todas as datas sejam criadas ou nenhuma
      const createdGroups = await prisma.$transaction(
        datesToCreate.map((dateStr) => {
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

      // OBS: Não criamos CaseLog aqui pois o grupo não pertence a um "Caso" (Família) específico.
      // Logs de sistema gerais seriam em outra tabela, se necessário.

      return reply.status(201).send({ count: createdGroups.length, groups: createdGroups })

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
      const { sub: userId } = req.user as UserPayload
      
      const group = await prisma.groupActivity.findUnique({ where: { id } })
      if (!group) return reply.status(404).send({ message: 'Grupo não encontrado.' })

      // 1. Filtra quais já estão no grupo para não dar erro de duplicidade
      const existingParticipants = await prisma.groupAttendance.findMany({
        where: {
          grupoId: id,
          casoId: { in: caseIds }
        },
        select: { casoId: true }
      })
      
      const existingIds = new Set(existingParticipants.map(p => p.casoId))
      const newParticipantsIds = caseIds.filter(cid => !existingIds.has(cid))

      if (newParticipantsIds.length === 0) {
        return reply.send({ message: 'Todos os selecionados já estão no grupo.' })
      }

      const dataFormatada = format(group.dataRealizacao, "dd/MM/yyyy", { locale: ptBR })

      // 2. Executa em Transação: Cria Vínculo + Cria Evolução no Prontuário
      await prisma.$transaction(async (tx) => {
        for (const caseId of newParticipantsIds) {
          
          // A. Cria o vínculo
          await tx.groupAttendance.create({
            data: { grupoId: id, casoId, presente: false }
          })

          // B. Evolução Automática ("Fulano foi vinculado à oficina tal")
          await tx.evolucao.create({
            data: {
              casoId, 
              autorId: userId,
              sigilo: false,
              conteudo: `[SISTEMA] Usuário vinculado à atividade coletiva "${group.tema}" (${group.tipo}), prevista para ${dataFormatada}.`
            }
          })
        }
      })

      return reply.send({ message: `${newParticipantsIds.length} participantes adicionados.` })

    } catch (error) {
      console.error('❌ Erro ao adicionar participantes:', error)
      return reply.status(500).send({ message: 'Erro interno ao adicionar participantes.' })
    }
  })

  // [PATCH] Atualizar Presença (+ Evolução Automática de Presença)
  app.patch('/groups/:groupId/attendance/:caseId', async (req, reply) => {
    try {
      const paramsSchema = z.object({ groupId: z.string().uuid(), caseId: z.string().uuid() })
      const bodySchema = z.object({ presente: z.boolean(), observacoes: z.string().optional() })

      const { groupId, caseId } = paramsSchema.parse(req.params)
      const { presente, observacoes } = bodySchema.parse(req.body)
      const { sub: userId } = req.user as UserPayload

      const group = await prisma.groupActivity.findUnique({ where: { id: groupId } })
      if (!group) return reply.status(404).send({message: "Grupo não encontrado"})

      // Atualiza o registro de presença
      const attendance = await prisma.groupAttendance.update({
        where: { 
          grupoId_casoId: { grupoId: groupId, casoId: caseId } 
        },
        data: { presente, observacoes }
      })

      // Gera Evolução no Prontuário confirmando se foi ou faltou
      const statusTexto = presente ? "PRESENTE" : "AUSENTE"
      const obsTexto = observacoes ? ` Observações: ${observacoes}` : ""
      const dataFormatada = format(group.dataRealizacao, "dd/MM/yyyy", { locale: ptBR })

      // Transaction implícita (Promise.all) para log e evolução
      await Promise.all([
        prisma.evolucao.create({
          data: {
            casoId: caseId, 
            autorId: userId,
            sigilo: false,
            conteudo: `[SISTEMA] Registro de Frequência - ${group.tema} (${dataFormatada}). Status: ${statusTexto}.${obsTexto}`
          }
        }),
        prisma.caseLog.create({
          data: {
            casoId: caseId, 
            autorId: userId,
            acao: LogAction.PRESENCA_REGISTRADA,
            descricao: `Presença em grupo: ${statusTexto} (${group.tema})`
          }
        })
      ])

      return reply.send(attendance)
    } catch (error) {
      console.error('❌ Erro ao atualizar presença:', error)
      return reply.status(500).send({ message: 'Erro ao atualizar presença.' })
    }
  })
}