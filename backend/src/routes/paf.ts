// backend/src/routes/paf.ts
// Arquivo otimizado e modernizado — versionamento completo do PAF + logs estruturados.

import { type FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma } from "../lib/prisma"
import { LogAction } from "@prisma/client" // Agora usamos o Enum real do Prisma

export async function pafRoutes(app: FastifyInstance) {
  // ------------------------------------------------------------
  // SCHEMAS DE VALIDAÇÃO
  // ------------------------------------------------------------
  const pafBodySchema = z.object({
    diagnostico: z.string().min(10, "O diagnóstico deve conter ao menos 10 caracteres."),
    objetivos: z.string().min(10, "Os objetivos devem conter ao menos 10 caracteres."),
    estrategias: z.string().min(10, "As estratégias devem conter ao menos 10 caracteres."),
    deadline: z.coerce.date({ required_error: "A data do prazo é obrigatória." }),
  })

  const paramsSchema = z.object({
    caseId: z.string().uuid(),
  })

  // ------------------------------------------------------------
  // 1. BUSCAR PAF ATUAL
  // ------------------------------------------------------------
  app.get(
    "/cases/:caseId/paf",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      try {
        const { caseId } = paramsSchema.parse(request.params)

        const paf = await prisma.paf.findUnique({
          where: { casoId: caseId },
          include: {
            autor: { select: { id: true, nome: true } },
          },
        })

        return reply.status(200).send(paf)
      } catch (error) {
        console.error("❌ Erro ao buscar PAF:", error)
        return reply.status(500).send({ message: "Erro interno ao buscar PAF." })
      }
    }
  )

  // ------------------------------------------------------------
  // 2. HISTÓRICO DE VERSÕES DO PAF
  // ------------------------------------------------------------
  app.get(
    "/cases/:caseId/paf/history",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      try {
        const { caseId } = paramsSchema.parse(request.params)

        const paf = await prisma.paf.findUnique({ where: { casoId } })
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
        console.error("❌ Erro ao buscar histórico do PAF:", error)
        return reply.status(500).send({ message: "Erro ao buscar histórico do PAF." })
      }
    }
  )

  // ------------------------------------------------------------
  // 3. CRIAR NOVO PAF
  // ------------------------------------------------------------
  app.post(
    "/cases/:caseId/paf",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      try {
        const { caseId } = paramsSchema.parse(request.params)
        const data = pafBodySchema.parse(request.body)
        const { sub: autorId, cargo } = request.user as { sub: string; cargo: string }

        if (cargo !== "Especialista" && cargo !== "Gerente") {
          return reply.status(403).send({ message: "Apenas especialistas podem criar um PAF." })
        }

        const created = await prisma.paf.create({
          data: {
            ...data,
            casoId: caseId,
            autorId,
            versaoAtual: 1,
          },
        })

        // --- Log estruturado ---
        await prisma.caseLog.create({
          data: {
            casoId,
            autorId,
            acao: LogAction.PAF_CRIADO,
            descricao: "Criou o PAF do caso.",
            valorNovo: JSON.stringify(data),
          },
        })

        return reply.status(201).send(created)
      } catch (error) {
        console.error("❌ Erro ao criar PAF:", error)
        return reply.status(500).send({ message: "Erro interno ao criar PAF." })
      }
    }
  )

  // ------------------------------------------------------------
  // 4. ATUALIZAR PAF + GERAR VERSÃO
  // ------------------------------------------------------------
  app.put(
    "/cases/:caseId/paf",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      try {
        const { caseId } = paramsSchema.parse(request.params)
        const bodyData = pafBodySchema.partial().parse(request.body)
        const { sub: userId, cargo } = request.user as { sub: string; cargo: string }

        const existing = await prisma.paf.findUnique({ where: { casoId } })
        if (!existing) {
          return reply.status(404).send({ message: "PAF não encontrado." })
        }

        // Somente quem criou OU o gerente pode editar
        if (existing.autorId !== userId && cargo !== "Gerente") {
          return reply.status(403).send({ message: "Sem permissão para editar este PAF." })
        }

        // =======================
        // SALVAR VERSÃO ANTIGA
        // =======================
        const nextVersionNumber = existing.versaoAtual + 1

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

        // =======================
        // ATUALIZAR PAF PRINCIPAL
        // =======================
        const updated = await prisma.paf.update({
          where: { casoId },
          data: {
            ...bodyData,
            autorId: userId,
            versaoAtual: nextVersionNumber,
            updatedAt: new Date(),
          },
        })

        // --- Log com comparação da versão ---
        await prisma.caseLog.create({
          data: {
            casoId,
            autorId: userId,
            acao: LogAction.PAF_ATUALIZADO,
            descricao: `Atualizou o PAF para a versão ${nextVersionNumber}.`,
            valorAnterior: JSON.stringify(existing),
            valorNovo: JSON.stringify(bodyData),
          },
        })

        return reply.status(200).send(updated)
      } catch (error) {
        console.error("❌ Erro ao atualizar PAF:", error)
        return reply.status(500).send({ message: "Erro interno ao atualizar PAF." })
      }
    }
  )
}
