var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/routes/referrals.ts
var referrals_exports = {};
__export(referrals_exports, {
  referralRoutes: () => referralRoutes
});
module.exports = __toCommonJS(referrals_exports);
var import_zod = require("zod");

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var globalForPrisma = global;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient({
  log: ["error"]
  // Reduzi logs para limpar o terminal, use ['query'] para debug
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/referrals.ts
var import_client2 = require("@prisma/client");
var referralResponseSchema = import_zod.z.object({
  id: import_zod.z.string().uuid(),
  instituicao: import_zod.z.string(),
  tipo: import_zod.z.string(),
  motivo: import_zod.z.string(),
  status: import_zod.z.string(),
  retorno: import_zod.z.string().nullable().optional(),
  dataEnvio: import_zod.z.date(),
  autor: import_zod.z.object({
    nome: import_zod.z.string()
  }).optional()
});
async function referralRoutes(app) {
  const server = app.withTypeProvider();
  server.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado" });
    }
  });
  server.get("/cases/:caseId/referrals", {
    schema: {
      tags: ["Encaminhamentos"],
      summary: "Listar hist\xF3rico de encaminhamentos externos",
      params: import_zod.z.object({ caseId: import_zod.z.string().uuid() }),
      response: {
        200: import_zod.z.array(referralResponseSchema)
      }
    }
  }, async (req, reply) => {
    const { caseId } = req.params;
    const referrals = await prisma.encaminhamento.findMany({
      // CORREÇÃO: Mapeamento explícito (banco: variável)
      where: { casoId: caseId },
      orderBy: { dataEnvio: "desc" },
      include: {
        autor: { select: { nome: true } }
      }
    });
    return reply.send(referrals);
  });
  server.post("/cases/:caseId/referrals", {
    schema: {
      tags: ["Encaminhamentos"],
      summary: "Registrar novo encaminhamento para a rede",
      params: import_zod.z.object({ caseId: import_zod.z.string().uuid() }),
      body: import_zod.z.object({
        instituicao: import_zod.z.string().min(2, "Informe a institui\xE7\xE3o de destino"),
        tipo: import_zod.z.string().min(2, "Informe o tipo (Ex: Sa\xFAde, Educa\xE7\xE3o)"),
        motivo: import_zod.z.string().min(5, "Descreva o motivo do encaminhamento")
      }),
      response: {
        201: referralResponseSchema
      }
    }
  }, async (req, reply) => {
    const { caseId } = req.params;
    const { instituicao, tipo, motivo } = req.body;
    const { sub: userId } = req.user;
    const caso = await prisma.case.findUnique({ where: { id: caseId } });
    if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado" });
    try {
      const result = await prisma.$transaction(async (tx) => {
        const referral = await tx.encaminhamento.create({
          data: {
            instituicao,
            tipo,
            motivo,
            status: "PENDENTE",
            // CORREÇÃO: Mapeamento explícito
            casoId: caseId,
            autorId: userId,
            dataEnvio: /* @__PURE__ */ new Date()
          },
          include: { autor: { select: { nome: true } } }
        });
        await tx.evolucao.create({
          data: {
            // CORREÇÃO: Mapeamento explícito
            casoId: caseId,
            autorId: userId,
            sigilo: false,
            conteudo: `[SISTEMA - ENCAMINHAMENTO] Realizado para: ${instituicao} (${tipo}).
Motivo: ${motivo}.`
          }
        });
        await tx.caseLog.create({
          data: {
            // CORREÇÃO: Mapeamento explícito
            casoId: caseId,
            autorId: userId,
            acao: import_client2.LogAction.OUTRO,
            descricao: `Encaminhou para: ${instituicao} (${tipo})`
          }
        });
        return referral;
      });
      return reply.status(201).send(result);
    } catch (error) {
      console.error("\u274C Erro ao criar encaminhamento:", error);
      return reply.status(500).send({ message: "Erro ao processar encaminhamento." });
    }
  });
  server.patch("/referrals/:id", {
    schema: {
      tags: ["Encaminhamentos"],
      summary: "Atualizar status ou registrar contrarrefer\xEAncia",
      params: import_zod.z.object({ id: import_zod.z.string().uuid() }),
      body: import_zod.z.object({
        status: import_zod.z.enum(["PENDENTE", "CONCLUIDO", "CANCELADO"]),
        retorno: import_zod.z.string().optional()
      }),
      response: {
        200: referralResponseSchema
      }
    }
  }, async (req, reply) => {
    const { id } = req.params;
    const { status, retorno } = req.body;
    try {
      const updated = await prisma.encaminhamento.update({
        where: { id },
        data: {
          status,
          retorno,
          updatedAt: /* @__PURE__ */ new Date()
        },
        include: { autor: { select: { nome: true } } }
      });
      return reply.send(updated);
    } catch (error) {
      return reply.status(404).send({ message: "Encaminhamento n\xE3o encontrado." });
    }
  });
  server.delete("/referrals/:id", {
    schema: {
      tags: ["Encaminhamentos"],
      summary: "Remover um encaminhamento (Apenas Autor)",
      params: import_zod.z.object({ id: import_zod.z.string().uuid() }),
      response: {
        204: import_zod.z.null()
      }
    }
  }, async (req, reply) => {
    const { id } = req.params;
    const { sub: userId } = req.user;
    const existing = await prisma.encaminhamento.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ message: "Encaminhamento n\xE3o encontrado." });
    if (existing.autorId !== userId) {
      return reply.status(403).send({ message: "Apenas o autor pode excluir este registro." });
    }
    await prisma.encaminhamento.delete({ where: { id } });
    return reply.status(204).send();
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  referralRoutes
});
