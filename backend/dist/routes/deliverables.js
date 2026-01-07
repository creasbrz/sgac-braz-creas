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
var import_client2 = require("@prisma/client");
async function deliverablesRoutes(app) {
  app.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send();
    }
  });
  const paramsSchema = import_zod.z.object({ caseId: import_zod.z.string().uuid() });
  const updateParamsSchema = import_zod.z.object({ id: import_zod.z.string().uuid() });
  const createBodySchema = import_zod.z.object({
    tipo: import_zod.z.string().min(3),
    observacoes: import_zod.z.string().optional()
  });
  const updateStatusSchema = import_zod.z.object({
    status: import_zod.z.enum(["SOLICITADO", "CONCEDIDO", "ENTREGUE", "NEGADO"]),
    dataEntrega: import_zod.z.string().datetime().optional()
  });
  app.post("/cases/:caseId/deliverables", async (request, reply) => {
    const { caseId } = paramsSchema.parse(request.params);
    const { tipo, observacoes } = createBodySchema.parse(request.body);
    const userId = request.user.sub;
    const caso = await prisma.case.findUnique({ where: { id: caseId } });
    if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado" });
    const usuario = await prisma.user.findUnique({ where: { id: userId } });
    if (!usuario) return reply.status(401).send({ message: "Usu\xE1rio inv\xE1lido." });
    try {
      const result = await prisma.$transaction(async (tx) => {
        const deliverable = await tx.serviceDeliverable.create({
          data: {
            tipo,
            status: "SOLICITADO",
            observacoes,
            casoId: caseId,
            // [CORREÇÃO] Mapeamento explícito: coluna 'casoId' recebe variável 'caseId'
            responsavelId: userId
          }
        });
        await tx.evolucao.create({
          data: {
            casoId: caseId,
            // [CORREÇÃO] Mapeamento explícito
            autorId: userId,
            sigilo: false,
            conteudo: `[SISTEMA] Solicita\xE7\xE3o de Benef\xEDcio: ${tipo}. Obs: ${observacoes || "-"}`
          }
        });
        await tx.caseLog.create({
          data: {
            casoId: caseId,
            // [CORREÇÃO] Mapeamento explícito
            autorId: userId,
            acao: import_client2.LogAction.ENTREGA_BENEFICIO_CRIADA,
            descricao: `Solicitou benef\xEDcio: ${tipo}`
          }
        });
        return deliverable;
      });
      return reply.status(201).send(result);
    } catch (err) {
      console.error("\u274C Erro ao criar benef\xEDcio:", err);
      return reply.status(500).send({ message: "Erro ao processar solicita\xE7\xE3o." });
    }
  });
  app.get("/cases/:caseId/deliverables", async (request, reply) => {
    const { caseId } = paramsSchema.parse(request.params);
    try {
      const deliverables = await prisma.serviceDeliverable.findMany({
        where: {
          casoId: caseId
          // [CORREÇÃO] Mapeamento explícito
        },
        orderBy: { createdAt: "desc" },
        include: {
          responsavel: { select: { nome: true } }
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
    } catch (err) {
      console.error("\u274C Erro ao listar benef\xEDcios:", err);
      return reply.status(500).send({ message: "Erro ao buscar benef\xEDcios." });
    }
  });
  app.patch("/deliverables/:id", async (request, reply) => {
    const { id } = updateParamsSchema.parse(request.params);
    const { status, dataEntrega } = updateStatusSchema.parse(request.body);
    const userId = request.user.sub;
    try {
      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.serviceDeliverable.update({
          where: { id },
          data: {
            status,
            dataEntrega: dataEntrega ? new Date(dataEntrega) : void 0
          }
        });
        await tx.evolucao.create({
          data: {
            casoId: updated.casoId,
            // Aqui usamos o retorno do update, então 'casoId' existe no objeto
            autorId: userId,
            sigilo: false,
            conteudo: `[SISTEMA] Atualiza\xE7\xE3o de Benef\xEDcio (${updated.tipo}): Status alterado para ${status}.`
          }
        });
        await tx.caseLog.create({
          data: {
            casoId: updated.casoId,
            autorId: userId,
            acao: import_client2.LogAction.ENTREGA_BENEFICIO_ATUALIZADA,
            descricao: `Alterou status do benef\xEDcio ${updated.tipo} para ${status}`
          }
        });
        return updated;
      });
      return reply.send(result);
    } catch (err) {
      console.error("\u274C Erro ao atualizar benef\xEDcio:", err);
      return reply.status(500).send({ message: "Erro ao atualizar benef\xEDcio." });
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  deliverablesRoutes
});
