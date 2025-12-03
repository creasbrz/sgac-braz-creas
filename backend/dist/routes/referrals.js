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
var prisma = new import_client.PrismaClient();

// src/routes/referrals.ts
var import_client2 = require("@prisma/client");
async function referralRoutes(app) {
  app.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app.post("/cases/:caseId/referrals", async (req, reply) => {
    const paramsSchema = import_zod.z.object({
      caseId: import_zod.z.string().uuid()
    });
    const bodySchema = import_zod.z.object({
      tipo: import_zod.z.string().min(3, "O tipo \xE9 obrigat\xF3rio (ex: Sa\xFAde, Educa\xE7\xE3o)"),
      instituicao: import_zod.z.string().min(3, "Informe o nome da institui\xE7\xE3o"),
      motivo: import_zod.z.string().min(5, "Descreva o motivo do encaminhamento")
    });
    try {
      const { caseId } = paramsSchema.parse(req.params);
      const { tipo, instituicao, motivo } = bodySchema.parse(req.body);
      const userId = req.user.sub;
      const referral = await prisma.encaminhamento.create({
        data: {
          tipo,
          instituicao,
          motivo,
          // [CORREÇÃO]: Mapeamento explícito. O campo do banco é 'casoId', a variável é 'caseId'
          casoId: caseId,
          autorId: userId,
          status: "PENDENTE"
        }
      });
      await prisma.caseLog.create({
        data: {
          // [CORREÇÃO]: Mapeamento explícito também no log
          casoId: caseId,
          autorId: userId,
          acao: import_client2.LogAction.OUTRO,
          descricao: `Realizou encaminhamento para ${tipo} - ${instituicao}`
        }
      });
      return reply.status(201).send(referral);
    } catch (error) {
      console.error("Erro ao criar encaminhamento:", error);
      return reply.status(500).send({ message: "Erro ao criar encaminhamento." });
    }
  });
  app.get("/cases/:caseId/referrals", async (req, reply) => {
    const paramsSchema = import_zod.z.object({ caseId: import_zod.z.string().uuid() });
    try {
      const { caseId } = paramsSchema.parse(req.params);
      const referrals = await prisma.encaminhamento.findMany({
        // [CORREÇÃO]: Mapeamento explícito aqui também
        where: { casoId: caseId },
        orderBy: { createdAt: "desc" },
        include: {
          autor: { select: { nome: true } }
        }
      });
      return reply.send(referrals);
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao buscar encaminhamentos." });
    }
  });
  app.patch("/referrals/:id", async (req, reply) => {
    const paramsSchema = import_zod.z.object({ id: import_zod.z.string().uuid() });
    const bodySchema = import_zod.z.object({
      status: import_zod.z.enum(["PENDENTE", "CONCLUIDO", "NEGADO"]),
      retorno: import_zod.z.string().optional()
    });
    try {
      const { id } = paramsSchema.parse(req.params);
      const { status, retorno } = bodySchema.parse(req.body);
      const userId = req.user.sub;
      const oldRef = await prisma.encaminhamento.findUnique({ where: { id } });
      if (!oldRef) return reply.status(404).send({ message: "Encaminhamento n\xE3o encontrado." });
      const updated = await prisma.encaminhamento.update({
        where: { id },
        data: {
          status,
          retorno,
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
      await prisma.caseLog.create({
        data: {
          casoId: oldRef.casoId,
          // Aqui usamos o valor que já veio do banco, então está correto
          autorId: userId,
          acao: import_client2.LogAction.OUTRO,
          descricao: `Atualizou encaminhamento (${oldRef.instituicao}) para: ${status}`
        }
      });
      return reply.send(updated);
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao atualizar encaminhamento." });
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  referralRoutes
});
