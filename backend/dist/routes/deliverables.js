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
  deliverablesRoutes: () => deliverablesRoutes
});
module.exports = __toCommonJS(deliverables_exports);
var import_zod = require("zod");

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var globalForPrisma = global;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient({
  log: ["error"]
  // Reduzi logs para limpar o terminal, use ['query'] para debug
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/deliverables.ts
async function deliverablesRoutes(app) {
  app.addHook("onRequest", async (request) => {
    try {
      await request.jwtVerify();
    } catch (err) {
    }
  });
  const paramsSchema = import_zod.z.object({
    caseId: import_zod.z.string().uuid()
  });
  const createDeliverableBodySchema = import_zod.z.object({
    tipo: import_zod.z.string().min(3, "Selecione um tipo de benef\xEDcio"),
    observacoes: import_zod.z.string().optional()
  });
  const updateStatusSchema = import_zod.z.object({
    status: import_zod.z.enum(["SOLICITADO", "CONCEDIDO", "ENTREGUE", "NEGADO"]),
    dataEntrega: import_zod.z.string().datetime().optional()
  });
  const updateParamsSchema = import_zod.z.object({
    id: import_zod.z.string().uuid()
  });
  app.post("/cases/:caseId/deliverables", async (request, reply) => {
    var _a;
    const { caseId } = paramsSchema.parse(request.params);
    const { tipo, observacoes } = createDeliverableBodySchema.parse(request.body);
    const caso = await prisma.case.findUnique({ where: { id: caseId } });
    if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado" });
    let responsavelId = (_a = request.user) == null ? void 0 : _a.sub;
    if (!responsavelId) {
      const fallbackUser = await prisma.user.findFirst();
      responsavelId = (fallbackUser == null ? void 0 : fallbackUser.id) || "id-nao-encontrado";
    }
    const deliverable = await prisma.serviceDeliverable.create({
      data: {
        tipo,
        status: "SOLICITADO",
        observacoes,
        casoId: caseId,
        // <--- CORREÇÃO AQUI: O campo no banco é 'casoId'
        responsavelId
      }
    });
    return reply.status(201).send(deliverable);
  });
  app.get("/cases/:caseId/deliverables", async (request, reply) => {
    const { caseId } = paramsSchema.parse(request.params);
    const deliverables = await prisma.serviceDeliverable.findMany({
      where: {
        casoId: caseId
        // <--- CORREÇÃO AQUI: O campo no banco é 'casoId'
      },
      orderBy: { createdAt: "desc" },
      include: {
        responsavel: {
          select: { nome: true }
        }
      }
    });
    const response = deliverables.map((d) => ({
      id: d.id,
      tipo: d.tipo,
      status: d.status,
      dataSolicitacao: d.dataSolicitacao,
      dataEntrega: d.dataEntrega,
      responsavel: { nome: d.responsavel.nome }
    }));
    return reply.send(response);
  });
  app.patch("/deliverables/:id", async (request, reply) => {
    const { id } = updateParamsSchema.parse(request.params);
    const { status, dataEntrega } = updateStatusSchema.parse(request.body);
    const updated = await prisma.serviceDeliverable.update({
      where: { id },
      data: {
        status,
        dataEntrega: dataEntrega ? new Date(dataEntrega) : void 0
      }
    });
    return reply.send(updated);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  deliverablesRoutes
});
