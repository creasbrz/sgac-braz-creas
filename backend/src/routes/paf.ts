import { type FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma } from "../lib/prisma"
import { LogAction } from "@prisma/client"

// Helper para garantir que a data seja salva como UTC (evita volta de 1 dia)
const stripTime = (date: Date | string): Date => {
  const d = new Date(date)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export async function pafRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  // Schemas de Validação
  const pafBodySchema = z.object({
    diagnostico: z.string().min(10, "O diagnóstico deve conter ao menos 10 caracteres."),
    objetivos: z.string().min(10, "Os objetivos devem conter ao menos 10 caracteres."),
    estrategias: z.string().min(10, "As estratégias devem conter ao menos 10 caracteres."),
    deadline: z.coerce.date({ required_error: "O prazo é obrigatório." }),
  })

  const paramsSchema = z.object({
    caseId: z.string().uuid(),
  })

  // 1. Buscar PAF Atual
  app.get("/cases/:caseId/paf", async (request, reply) => {
    try {
      const { caseId } = paramsSchema.parse(request.params)
      
      const paf = await prisma.paf.findUnique({
        where: { casoId: caseId }, // Mapeamento correto
        include: { autor: { select: { id: true, nome: true } } },
      })
      return reply.send(paf)
    } catch (error) {
      console.error("❌ Erro GET /paf:", error)
      return reply.status(500).send({ message: "Erro ao buscar PAF." })
    }
  })

  // 2. Histórico de Versões
  app.get("/cases/:caseId/paf/history", async (request, reply) => {
    try {
      const { caseId } = paramsSchema.parse(request.params)
      
      const paf = await prisma.paf.findUnique({ where: { casoId: caseId } })
      if (!paf) return reply.send([])

      const history = await prisma.pafVersion.findMany({
        where: { pafId: paf.id },
        orderBy: { savedAt: "desc" },
        include: { autor: { select: { nome: true } } },
      })
      return reply.send(history)
    } catch (error) {
      console.error("❌ Erro GET /paf/history:", error)
      return reply.status(500).send({ message: "Erro ao buscar histórico." })
    }
  })

  // 3. Criar PAF
  app.post("/cases/:caseId/paf", async (request, reply) => {
    try {
      const { caseId } = paramsSchema.parse(request.params)
      const data = pafBodySchema.parse(request.body)
      const { sub: autorId, cargo } = request.user as { sub: string; cargo: string }

      // Validação de Permissão
      if (cargo !== "Especialista" && cargo !== "Gerente") {
        return reply.status(403).send({ message: "Apenas especialistas/gerentes criam PAF." })
      }

      const created = await prisma.paf.create({
        data: {
          ...data,
          deadline: stripTime(data.deadline),
          casoId: caseId, // Campo do banco: Variável
          autorId,
          versaoAtual: 1,
        },
      })

      await prisma.caseLog.create({
        data: {
          casoId: caseId, 
          autorId,
          acao: LogAction.PAF_CRIADO,
          descricao: "Elaborou o Plano de Acompanhamento Familiar (PAF).",
        },
      })

      return reply.status(201).send(created)

    } catch (error) {
      console.error("❌ Erro POST /paf:", error)
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: "Dados inválidos.", errors: error.flatten().fieldErrors })
      }
      return reply.status(500).send({ message: "Erro interno ao criar PAF." })
    }
  })

  // 4. Atualizar PAF (Gera Versão)
  app.put("/cases/:caseId/paf", async (request, reply) => {
    try {
      // Extração da variável 'caseId'
      const { caseId } = paramsSchema.parse(request.params)
      
      const bodyData = pafBodySchema.partial().parse(request.body)
      const { sub: userId, cargo } = request.user as { sub: string, cargo: string }

      // CORREÇÃO AQUI: Uso explícito de 'casoId: caseId'
      const existing = await prisma.paf.findUnique({ where: { casoId: caseId } })
      
      if (!existing) return reply.status(404).send({ message: "PAF não encontrado." })

      // Trava de segurança
      if (existing.autorId !== userId && cargo !== "Gerente") {
        return reply.status(403).send({ message: "Sem permissão para editar este PAF." })
      }

      // 1. Salvar versão antiga
      await prisma.pafVersion.create({
        data: {
          pafId: existing.id,
          diagnostico: existing.diagnostico,
          objetivos: existing.objetivos,
          estrategias: existing.estrategias,
          deadline: existing.deadline,
          autorId: existing.autorId,
          versaoNumero: existing.versaoAtual,
        },
      })

      // 2. Atualizar registro atual
      const nextVersion = existing.versaoAtual + 1
      const updated = await prisma.paf.update({
        where: { casoId: caseId }, // CORREÇÃO AQUI TAMBÉM
        data: {
          ...bodyData,
          deadline: bodyData.deadline ? stripTime(bodyData.deadline) : undefined,
          autorId: userId,
          versaoAtual: nextVersion,
          updatedAt: new Date(),
        },
      })

      // 3. Auditoria
      await prisma.caseLog.create({
        data: {
          casoId: caseId, // CORREÇÃO
          autorId: userId,
          acao: LogAction.PAF_ATUALIZADO,
          descricao: `Atualizou PAF para versão ${nextVersion}.`,
        },
      })

      return reply.send(updated)

    } catch (error) {
      console.error("❌ Erro PUT /paf:", error)
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: "Dados inválidos.", errors: error.flatten().fieldErrors })
      }
      
      // Erro de tabela inexistente
      if ((error as any).code === 'P2021') {
        return reply.status(500).send({ message: "Erro de banco: Tabela PafVersion não encontrada. Rode 'npx prisma migrate dev'." })
      }

      return reply.status(500).send({ message: "Erro interno ao atualizar PAF." })
    }
  })
}