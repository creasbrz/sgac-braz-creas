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

// src/routes/deliverables.ts
var deliverables_exports = {};
__export(deliverables_exports, {
  deliverableRoutes: () => deliverableRoutes
});
module.exports = __toCommonJS(deliverables_exports);
var import_zod = require("zod");

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var globalForPrisma = global;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient({
  // Habilite logs apenas se quiser debugar queries lentas ou erros
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/deliverables.ts
var import_client2 = require("@prisma/client");
var emptyToNull = (val) => {
  if (typeof val === "string" && val.trim() === "") return null;
  return val;
};
async function deliverableRoutes(app) {
  app.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app.get("/cases/:caseId/deliverables", async (req, reply) => {
    try {
      const { caseId } = import_zod.z.object({ caseId: import_zod.z.string().uuid() }).parse(req.params);
      const items = await prisma.serviceDeliverable.findMany({
        where: { casoId: caseId },
        // Aqui funciona pois caseId é o valor
        orderBy: { dataSolicitacao: "desc" },
        include: { responsavel: { select: { nome: true } } }
      });
      return reply.send(items);
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao listar benef\xEDcios." });
    }
  });
  app.post("/cases/:caseId/deliverables", async (req, reply) => {
    const paramsSchema = import_zod.z.object({ caseId: import_zod.z.string().uuid() });
    const bodySchema = import_zod.z.object({
      tipo: import_zod.z.string().min(2, "Informe o tipo do benef\xEDcio"),
      status: import_zod.z.enum(["SOLICITADO", "CONCEDIDO", "NEGADO", "ENTREGUE"]).default("SOLICITADO"),
      observacoes: import_zod.z.preprocess(emptyToNull, import_zod.z.string().optional().nullable())
    });
    try {
      const { caseId } = paramsSchema.parse(req.params);
      const { tipo, status, observacoes } = bodySchema.parse(req.body);
      const { sub: userId } = req.user;
      const caso = await prisma.case.findUnique({ where: { id: caseId } });
      if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
      const dataEntrega = status === "ENTREGUE" ? /* @__PURE__ */ new Date() : null;
      const item = await prisma.serviceDeliverable.create({
        data: {
          tipo,
          status,
          observacoes,
          casoId: caseId,
          // CORREÇÃO: Mapeamento explícito (Banco: Variável)
          responsavelId: userId,
          dataSolicitacao: /* @__PURE__ */ new Date(),
          dataEntrega
        }
      });
      await prisma.caseLog.create({
        data: {
          casoId: caseId,
          // CORREÇÃO AQUI TAMBÉM
          autorId: userId,
          acao: import_client2.LogAction.ENTREGA_BENEFICIO_CRIADA,
          descricao: `Registrou entrega/benef\xEDcio: ${tipo} (${status})`
        }
      });
      return reply.status(201).send(item);
    } catch (error) {
      console.error("Erro POST Deliverables:", error);
      if (error instanceof import_zod.z.ZodError) return reply.status(400).send({ message: "Dados inv\xE1lidos", errors: error.flatten().fieldErrors });
      return reply.status(500).send({ message: "Erro ao registrar benef\xEDcio." });
    }
  });
  app.patch("/deliverables/:id", async (req, reply) => {
    const paramsSchema = import_zod.z.object({ id: import_zod.z.string().uuid() });
    const bodySchema = import_zod.z.object({
      status: import_zod.z.enum(["SOLICITADO", "CONCEDIDO", "NEGADO", "ENTREGUE"]),
      dataEntrega: import_zod.z.preprocess(emptyToNull, import_zod.z.string().optional().nullable()),
      observacoes: import_zod.z.preprocess(emptyToNull, import_zod.z.string().optional().nullable())
    });
    try {
      const { id } = paramsSchema.parse(req.params);
      const { status, dataEntrega, observacoes } = bodySchema.parse(req.body);
      const { sub: userId } = req.user;
      const oldItem = await prisma.serviceDeliverable.findUnique({ where: { id } });
      if (!oldItem) return reply.status(404).send({ message: "Item n\xE3o encontrado." });
      let finalDate = oldItem.dataEntrega;
      if (dataEntrega) {
        finalDate = new Date(dataEntrega);
      } else if (status === "ENTREGUE" && oldItem.status !== "ENTREGUE") {
        finalDate = /* @__PURE__ */ new Date();
      } else if (status !== "ENTREGUE") {
        finalDate = null;
      }
      const updated = await prisma.serviceDeliverable.update({
        where: { id },
        data: {
          status,
          observacoes,
          dataEntrega: finalDate,
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
      if (oldItem.status !== status || oldItem.observacoes !== observacoes) {
        await prisma.caseLog.create({
          data: {
            casoId: oldItem.casoId,
            autorId: userId,
            acao: import_client2.LogAction.ENTREGA_BENEFICIO_ATUALIZADA,
            descricao: `Atualizou benef\xEDcio ${oldItem.tipo}: ${oldItem.status} -> ${status}`
          }
        });
      }
      return reply.send(updated);
    } catch (error) {
      console.error("Erro PATCH Deliverables:", error);
      return reply.status(500).send({ message: "Erro ao atualizar benef\xEDcio." });
    }
  });
  app.delete("/deliverables/:id", async (req, reply) => {
    const paramsSchema = import_zod.z.object({ id: import_zod.z.string().uuid() });
    try {
      const { id } = paramsSchema.parse(req.params);
      const { sub: userId, cargo } = req.user;
      const item = await prisma.serviceDeliverable.findUnique({ where: { id } });
      if (!item) return reply.status(404).send({ message: "Item n\xE3o encontrado." });
      if (item.responsavelId !== userId && cargo !== import_client2.Cargo.Gerente) {
        return reply.status(403).send({ message: "Sem permiss\xE3o para excluir." });
      }
      await prisma.serviceDeliverable.delete({ where: { id } });
      await prisma.caseLog.create({
        data: {
          casoId: item.casoId,
          autorId: userId,
          acao: import_client2.LogAction.OUTRO,
          descricao: `Removeu registro de benef\xEDcio: ${item.tipo}`
        }
      });
      return reply.status(204).send();
    } catch (error) {
      console.error("Erro DELETE Deliverables:", error);
      return reply.status(500).send({ message: "Erro ao excluir item." });
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  deliverableRoutes
});
