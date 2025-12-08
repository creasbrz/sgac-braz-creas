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
var prisma = new import_client.PrismaClient();

// src/routes/deliverables.ts
var import_client2 = require("@prisma/client");
async function deliverableRoutes(app) {
  app.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app.get("/cases/:caseId/deliverables", async (req, reply) => {
    const { caseId } = import_zod.z.object({ caseId: import_zod.z.string().uuid() }).parse(req.params);
    const items = await prisma.serviceDeliverable.findMany({
      where: { casoId: caseId },
      orderBy: { createdAt: "desc" },
      include: { responsavel: { select: { nome: true } } }
    });
    return reply.send(items);
  });
  app.post("/cases/:caseId/deliverables", async (req, reply) => {
    const { caseId } = import_zod.z.object({ caseId: import_zod.z.string().uuid() }).parse(req.params);
    const bodySchema = import_zod.z.object({
      tipo: import_zod.z.string().min(2),
      status: import_zod.z.enum(["SOLICITADO", "CONCEDIDO", "NEGADO", "ENTREGUE"]).default("SOLICITADO"),
      observacoes: import_zod.z.string().optional()
    });
    const { tipo, status, observacoes } = bodySchema.parse(req.body);
    const userId = req.user.sub;
    const item = await prisma.serviceDeliverable.create({
      data: {
        tipo,
        status,
        observacoes,
        casoId,
        responsavelId: userId,
        dataSolicitacao: /* @__PURE__ */ new Date()
      }
    });
    await prisma.caseLog.create({
      data: {
        casoId,
        autorId: userId,
        acao: import_client2.LogAction.ENTREGA_BENEFICIO_CRIADA,
        descricao: `Registrou entrega/benef\xEDcio: ${tipo} (${status})`
      }
    });
    return reply.status(201).send(item);
  });
  app.patch("/deliverables/:id", async (req, reply) => {
    const { id } = import_zod.z.object({ id: import_zod.z.string().uuid() }).parse(req.params);
    const bodySchema = import_zod.z.object({
      status: import_zod.z.enum(["SOLICITADO", "CONCEDIDO", "NEGADO", "ENTREGUE"]),
      dataEntrega: import_zod.z.string().optional(),
      // ISO String
      observacoes: import_zod.z.string().optional()
    });
    const { status, dataEntrega, observacoes } = bodySchema.parse(req.body);
    const userId = req.user.sub;
    const oldItem = await prisma.serviceDeliverable.findUnique({ where: { id } });
    if (!oldItem) return reply.status(404).send();
    const updated = await prisma.serviceDeliverable.update({
      where: { id },
      data: {
        status,
        observacoes,
        dataEntrega: dataEntrega ? new Date(dataEntrega) : void 0,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    await prisma.caseLog.create({
      data: {
        casoId: oldItem.casoId,
        autorId: userId,
        acao: import_client2.LogAction.ENTREGA_BENEFICIO_ATUALIZADA,
        descricao: `Atualizou benef\xEDcio ${oldItem.tipo} para ${status}`
      }
    });
    return reply.send(updated);
  });
  app.delete("/deliverables/:id", async (req, reply) => {
    const { id } = import_zod.z.object({ id: import_zod.z.string().uuid() }).parse(req.params);
    await prisma.serviceDeliverable.delete({ where: { id } });
    return reply.status(204).send();
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  deliverableRoutes
});
