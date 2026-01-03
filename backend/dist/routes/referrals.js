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
  // Habilite logs apenas se quiser debugar queries lentas ou erros
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/referrals.ts
var import_client2 = require("@prisma/client");
async function referralRoutes(app) {
  app.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app.get("/cases/:caseId/referrals", async (request, reply) => {
    const params = import_zod.z.object({ caseId: import_zod.z.string().uuid() });
    try {
      const { caseId } = params.parse(request.params);
      const referrals = await prisma.encaminhamento.findMany({
        where: { casoId: caseId },
        // Correção: Mapeamento explícito
        orderBy: { dataEnvio: "desc" },
        include: {
          autor: { select: { nome: true } }
        }
      });
      return reply.send(referrals);
    } catch (error) {
      console.error("Erro GET Referrals:", error);
      return reply.status(500).send({ message: "Erro ao listar encaminhamentos." });
    }
  });
  app.post("/cases/:caseId/referrals", async (request, reply) => {
    const params = import_zod.z.object({ caseId: import_zod.z.string().uuid() });
    const body = import_zod.z.object({
      tipo: import_zod.z.string().min(1, "Selecione o tipo"),
      instituicao: import_zod.z.string().min(3, "Informe o nome da institui\xE7\xE3o"),
      motivo: import_zod.z.string().min(3, "Descreva o motivo")
    });
    try {
      const { caseId } = params.parse(request.params);
      const { tipo, instituicao, motivo } = body.parse(request.body);
      const { sub: userId } = request.user;
      const caso = await prisma.case.findUnique({ where: { id: caseId } });
      if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
      const referral = await prisma.encaminhamento.create({
        data: {
          casoId: caseId,
          // Correção: Mapeamento explícito
          autorId: userId,
          tipo,
          instituicao,
          motivo,
          status: "PENDENTE",
          dataEnvio: /* @__PURE__ */ new Date()
        }
      });
      await prisma.caseLog.create({
        data: {
          casoId: caseId,
          // Correção aqui também
          autorId: userId,
          acao: import_client2.LogAction.OUTRO,
          descricao: `Encaminhou para ${instituicao} (${tipo})`
        }
      });
      return reply.status(201).send(referral);
    } catch (error) {
      console.error("Erro POST Referral:", error);
      if (error instanceof import_zod.z.ZodError) return reply.status(400).send({ message: "Dados inv\xE1lidos", errors: error.flatten().fieldErrors });
      return reply.status(500).send({ message: "Erro ao criar encaminhamento." });
    }
  });
  app.patch("/referrals/:id", async (request, reply) => {
    const params = import_zod.z.object({ id: import_zod.z.string().uuid() });
    const body = import_zod.z.object({
      status: import_zod.z.enum(["PENDENTE", "CONCLUIDO", "CANCELADO"]),
      retorno: import_zod.z.string().optional()
    });
    try {
      const { id } = params.parse(request.params);
      const { status, retorno } = body.parse(request.body);
      const { sub: userId } = request.user;
      const existing = await prisma.encaminhamento.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ message: "Encaminhamento n\xE3o encontrado." });
      const updated = await prisma.encaminhamento.update({
        where: { id },
        data: { status, retorno, updatedAt: /* @__PURE__ */ new Date() }
      });
      if (retorno && retorno !== existing.retorno) {
        await prisma.caseLog.create({
          data: {
            casoId: existing.casoId,
            autorId: userId,
            acao: import_client2.LogAction.OUTRO,
            descricao: `Registrou contrarrefer\xEAncia de ${existing.instituicao}`
          }
        });
      }
      return reply.send(updated);
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao atualizar encaminhamento." });
    }
  });
  app.delete("/referrals/:id", async (request, reply) => {
    const params = import_zod.z.object({ id: import_zod.z.string().uuid() });
    try {
      const { id } = params.parse(request.params);
      const { sub: userId, cargo } = request.user;
      const ref = await prisma.encaminhamento.findUnique({ where: { id } });
      if (!ref) return reply.status(404).send({ message: "Registro n\xE3o encontrado." });
      if (cargo !== import_client2.Cargo.Gerente && ref.autorId !== userId) {
        return reply.status(403).send({ message: "Sem permiss\xE3o para excluir." });
      }
      await prisma.encaminhamento.delete({ where: { id } });
      await prisma.caseLog.create({
        data: {
          casoId: ref.casoId,
          autorId: userId,
          acao: import_client2.LogAction.OUTRO,
          descricao: `Removeu encaminhamento para ${ref.instituicao}`
        }
      });
      return reply.status(204).send();
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao excluir." });
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  referralRoutes
});
