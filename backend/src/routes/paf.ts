// backend/src/routes/paf.ts
import { type FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma } from "../lib/prisma"
import { LogAction, Cargo } from "@prisma/client"

interface UserPayload {
  sub: string
  cargo: Cargo
}

export async function pafRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  // SCHEMAS
  const pafBodySchema = z.object({
    diagnostico: z.string().min(10, "O diagnóstico deve conter ao menos 10 caracteres."),
    objetivos: z.string().min(10, "Os objetivos devem conter ao menos 10 caracteres."),
    estrategias: z.string().min(10, "As estratégias devem conter ao menos 10 caracteres."),
    deadline: z.coerce.date({ required_error: "A data do prazo é obrigatória." }),
  })

  const paramsSchema = z.object({
    caseId: z.string().uuid(),
  })

  // 1. BUSCAR PAF ATUAL
  app.get("/cases/:caseId/paf", async (request, reply) => {
    try {
      const { caseId } = paramsSchema.parse(request.params)

      const paf = await prisma.paf.findUnique({
        where: { casoId: caseId },
        include: {
          autor: { select: { id: true, nome: true } },
        },
      })

      // Retorna null (200 OK) se não tiver PAF ainda, o front lida com isso mostrando botão "Criar"
      return reply.status(200).send(paf)
    } catch (error) {
      console.error("❌ Erro ao buscar PAF:", error)
      return reply.status(500).send({ message: "Erro interno ao buscar PAF." })
    }
  })

  // 2. HISTÓRICO DE VERSÕES
  app.get("/cases/:caseId/paf/history", async (request, reply) => {
    try {
      const { caseId } = paramsSchema.parse(request.params)

      const paf = await prisma.paf.findUnique({ where: { casoId: caseId } })
      if (!paf) return reply.status(200).send([])

      const history = await prisma.pafVersion.findMany({
        where: { pafId: paf.id },
        orderBy: { savedAt: "desc" },
        include: {
          autor: { select: { nome: true } },
        },
      })

      return reply.status(200).send(history)
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao buscar histórico do PAF." })
    }
  })

  // 3. CRIAR NOVO PAF
  app.post("/cases/:caseId/paf", async (request, reply) => {
    try {
      const { caseId } = paramsSchema.parse(request.params)
      const data = pafBodySchema.parse(request.body)
      const { sub: autorId, cargo } = request.user as UserPayload

      // Permissão: Apenas Especialista ou Gerente
      if (cargo !== Cargo.Especialista && cargo !== Cargo.Gerente) {
        return reply.status(403).send({ message: "Apenas especialistas podem criar um PAF." })
      }

      // Verifica duplicidade
      const existing = await prisma.paf.findUnique({ where: { casoId: caseId } })
      if (existing) {
        return reply.status(409).send({ message: "Já existe um PAF para este caso. Use a edição." })
      }

      const created = await prisma.paf.create({
        data: {
          ...data,
          casoId: caseId,
          autorId,
          versaoAtual: 1,
        },
      })

      await prisma.caseLog.create({
        data: {
          casoId: caseId,
          autorId,
          acao: LogAction.PAF_CRIADO,
          descricao: "Criou o PAF inicial do caso.",
          valorNovo: JSON.stringify(data),
        },
      })

      return reply.status(201).send(created)

    } catch (error) {
      if (error instanceof z.ZodError) return reply.status(400).send({ message: 'Dados inválidos', errors: error.flatten().fieldErrors })
      console.error("❌ Erro ao criar PAF:", error)
      return reply.status(500).send({ message: "Erro interno ao criar PAF." })
    }
  })

  // 4. ATUALIZAR PAF + VERSIONAMENTO (Transação Atômica)
  app.put("/cases/:caseId/paf", async (request, reply) => {
    try {
      const { caseId } = paramsSchema.parse(request.params)
      const bodyData = pafBodySchema.parse(request.body) // Partial não, PUT exige objeto completo para consistência
      const { sub: userId, cargo } = request.user as UserPayload

      const existing = await prisma.paf.findUnique({ where: { casoId: caseId } })
      if (!existing) {
        return reply.status(404).send({ message: "PAF não encontrado." })
      }

      // Permissão de Edição
      if (existing.autorId !== userId && cargo !== Cargo.Gerente) {
        return reply.status(403).send({ message: "Apenas o autor ou gerente podem editar este PAF." })
      }

      const nextVersionNumber = existing.versaoAtual + 1

      // TRANSACTION: Garante que a versão é salva E o atual é atualizado. Se um falhar, tudo falha.
      const updated = await prisma.$transaction(async (tx) => {
        // A. Salva Versão Antiga
        await tx.pafVersion.create({
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

        // B. Atualiza o Atual
        const newPaf = await tx.paf.update({
          where: { casoId: caseId },
          data: {
            ...bodyData,
            autorId: userId, // Novo autor da versão atual
            versaoAtual: nextVersionNumber,
            updatedAt: new Date(),
          },
        })

        // C. Log
        await tx.caseLog.create({
          data: {
            casoId: caseId,
            autorId: userId,
            acao: LogAction.PAF_ATUALIZADO,
            descricao: `Atualizou o PAF para a versão ${nextVersionNumber}.`,
          },
        })

        return newPaf
      })

      return reply.status(200).send(updated)

    } catch (error) {
      if (error instanceof z.ZodError) return reply.status(400).send({ message: 'Dados inválidos', errors: error.flatten().fieldErrors })
      console.error("❌ Erro ao atualizar PAF:", error)
      return reply.status(500).send({ message: "Erro interno ao atualizar PAF." })
    }
  })
}