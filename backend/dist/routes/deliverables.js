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
var deliverableResponseSchema = import_zod.z.object({
  id: import_zod.z.string(),
  tipo: import_zod.z.string(),
  status: import_zod.z.string(),
  dataSolicitacao: import_zod.z.date(),
  dataEntrega: import_zod.z.date().nullable(),
  responsavel: import_zod.z.object({ nome: import_zod.z.string() })
});
async function deliverablesRoutes(app) {
  const server = app.withTypeProvider();
  server.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send();
    }
  });
  server.get("/cases/:caseId/deliverables", {
    schema: {
      tags: ["Benef\xEDcios"],
      params: import_zod.z.object({ caseId: import_zod.z.string().uuid() }),
      response: { 200: import_zod.z.array(deliverableResponseSchema) }
    }
  }, async (req, reply) => {
    const { caseId } = req.params;
    const items = await prisma.serviceDeliverable.findMany({
      // CORREÇÃO: Mapeando explicitamente 'casoId' do banco para 'caseId' da rota
      where: { casoId: caseId },
      orderBy: { createdAt: "desc" },
      include: {
        responsavel: { select: { nome: true } }
      }
    });
    return reply.send(items);
  });
  server.post("/cases/:caseId/deliverables", {
    schema: {
      tags: ["Benef\xEDcios"],
      params: import_zod.z.object({ caseId: import_zod.z.string().uuid() }),
      body: import_zod.z.object({
        tipo: import_zod.z.string().min(3),
        observacoes: import_zod.z.string().optional()
      })
    }
  }, async (req, reply) => {
    const { caseId } = req.params;
    const { tipo, observacoes } = req.body;
    const userId = req.user.sub;
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.serviceDeliverable.create({
        data: {
          tipo,
          status: "SOLICITADO",
          observacoes,
          // CORREÇÃO: Mapeando explicitamente
          casoId: caseId,
          responsavelId: userId
        }
      });
      await tx.caseLog.create({
        data: {
          casoId: caseId,
          // CORREÇÃO
          autorId: userId,
          acao: import_client2.LogAction.ENTREGA_BENEFICIO_CRIADA,
          descricao: `Solicitou benef\xEDcio: ${tipo}`
        }
      });
      return item;
    });
    return reply.status(201).send(result);
  });
  server.patch("/deliverables/:id", {
    schema: {
      tags: ["Benef\xEDcios"],
      params: import_zod.z.object({ id: import_zod.z.string().uuid() }),
      body: import_zod.z.object({
        status: import_zod.z.enum(["SOLICITADO", "CONCEDIDO", "ENTREGUE", "NEGADO"]),
        dataEntrega: import_zod.z.string().datetime().optional()
      })
    }
  }, async (req, reply) => {
    const { id } = req.params;
    const { status, dataEntrega } = req.body;
    const userId = req.user.sub;
    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.serviceDeliverable.update({
        where: { id },
        data: {
          status,
          dataEntrega: dataEntrega ? new Date(dataEntrega) : void 0
        },
        include: { responsavel: { select: { nome: true } } }
      });
      await tx.caseLog.create({
        data: {
          casoId: item.casoId,
          autorId: userId,
          acao: import_client2.LogAction.ENTREGA_BENEFICIO_ATUALIZADA,
          descricao: `Atualizou benef\xEDcio ${item.tipo} para ${status}`
        }
      });
      return item;
    });
    return reply.send(updated);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  deliverablesRoutes
});
