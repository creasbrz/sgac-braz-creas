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
async function referralRoutes(app) {
  app.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send();
    }
  });
  app.get("/cases/:caseId/referrals", async (req, reply) => {
    const { caseId } = import_zod.z.object({ caseId: import_zod.z.string().uuid() }).parse(req.params);
    const referrals = await prisma.encaminhamento.findMany({
      where: { casoId: caseId },
      orderBy: { dataEnvio: "desc" },
      include: {
        autor: { select: { nome: true } }
      }
    });
    return reply.send(referrals);
  });
  app.post("/cases/:caseId/referrals", async (req, reply) => {
    const paramsSchema = import_zod.z.object({ caseId: import_zod.z.string().uuid() });
    const bodySchema = import_zod.z.object({
      instituicao: import_zod.z.string().min(2, "Informe a institui\xE7\xE3o de destino"),
      tipo: import_zod.z.string().min(2, "Informe o tipo (Ex: Sa\xFAde, Educa\xE7\xE3o)"),
      motivo: import_zod.z.string().min(5, "Descreva o motivo do encaminhamento")
    });
    const { caseId } = paramsSchema.parse(req.params);
    const { instituicao, tipo, motivo } = bodySchema.parse(req.body);
    const userId = req.user.sub;
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
            casoId: caseId,
            // [CORREÇÃO] Mapeamento explícito
            autorId: userId,
            dataEnvio: /* @__PURE__ */ new Date()
          }
        });
        await tx.evolucao.create({
          data: {
            casoId: caseId,
            // [CORREÇÃO] Mapeamento explícito
            autorId: userId,
            sigilo: false,
            conteudo: `[SISTEMA] Encaminhamento realizado para: ${instituicao} (${tipo}). Motivo: ${motivo}.`
          }
        });
        await tx.caseLog.create({
          data: {
            casoId: caseId,
            // [CORREÇÃO] Mapeamento explícito
            autorId: userId,
            acao: "OUTRO",
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
  app.patch("/referrals/:id", async (req, reply) => {
    const paramsSchema = import_zod.z.object({ id: import_zod.z.string().uuid() });
    const bodySchema = import_zod.z.object({
      status: import_zod.z.enum(["PENDENTE", "CONCLUIDO", "CANCELADO"]),
      retorno: import_zod.z.string().optional()
    });
    const { id } = paramsSchema.parse(req.params);
    const { status, retorno } = bodySchema.parse(req.body);
    const updated = await prisma.encaminhamento.update({
      where: { id },
      data: {
        status,
        retorno,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    return reply.send(updated);
  });
  app.delete("/referrals/:id", async (req, reply) => {
    const { id } = import_zod.z.object({ id: import_zod.z.string().uuid() }).parse(req.params);
    const userId = req.user.sub;
    const existing = await prisma.encaminhamento.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send();
    if (existing.autorId !== userId) {
      return reply.status(403).send({ message: "Apenas o autor pode excluir." });
    }
    await prisma.encaminhamento.delete({ where: { id } });
    return reply.status(204).send();
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  referralRoutes
});
