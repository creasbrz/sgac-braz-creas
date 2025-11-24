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

// src/routes/paf.ts
var paf_exports = {};
__export(paf_exports, {
  pafRoutes: () => pafRoutes
});
module.exports = __toCommonJS(paf_exports);
var import_zod = require("zod");

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var prisma = new import_client.PrismaClient();

// src/routes/paf.ts
var import_client2 = require("@prisma/client");
async function pafRoutes(app) {
  const pafBodySchema = import_zod.z.object({
    diagnostico: import_zod.z.string().min(10, "O diagn\xF3stico deve conter ao menos 10 caracteres."),
    objetivos: import_zod.z.string().min(10, "Os objetivos devem conter ao menos 10 caracteres."),
    estrategias: import_zod.z.string().min(10, "As estrat\xE9gias devem conter ao menos 10 caracteres."),
    deadline: import_zod.z.coerce.date({ required_error: "A data do prazo \xE9 obrigat\xF3ria." })
  });
  const paramsSchema = import_zod.z.object({
    caseId: import_zod.z.string().uuid()
  });
  app.get(
    "/cases/:caseId/paf",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      try {
        const { caseId } = paramsSchema.parse(request.params);
        const paf = await prisma.paf.findUnique({
          where: { casoId: caseId },
          include: {
            autor: { select: { id: true, nome: true } }
          }
        });
        return reply.status(200).send(paf);
      } catch (error) {
        console.error("\u274C Erro ao buscar PAF:", error);
        return reply.status(500).send({ message: "Erro interno ao buscar PAF." });
      }
    }
  );
  app.get(
    "/cases/:caseId/paf/history",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      try {
        const { caseId } = paramsSchema.parse(request.params);
        const paf = await prisma.paf.findUnique({ where: { casoId } });
        if (!paf) return reply.status(200).send([]);
        const history = await prisma.pafVersion.findMany({
          where: { pafId: paf.id },
          orderBy: { savedAt: "desc" },
          include: {
            autor: { select: { nome: true } }
          }
        });
        return reply.status(200).send(history);
      } catch (error) {
        console.error("\u274C Erro ao buscar hist\xF3rico do PAF:", error);
        return reply.status(500).send({ message: "Erro ao buscar hist\xF3rico do PAF." });
      }
    }
  );
  app.post(
    "/cases/:caseId/paf",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      try {
        const { caseId } = paramsSchema.parse(request.params);
        const data = pafBodySchema.parse(request.body);
        const { sub: autorId, cargo } = request.user;
        if (cargo !== "Especialista" && cargo !== "Gerente") {
          return reply.status(403).send({ message: "Apenas especialistas podem criar um PAF." });
        }
        const created = await prisma.paf.create({
          data: {
            ...data,
            casoId: caseId,
            autorId,
            versaoAtual: 1
          }
        });
        await prisma.caseLog.create({
          data: {
            casoId,
            autorId,
            acao: import_client2.LogAction.PAF_CRIADO,
            descricao: "Criou o PAF do caso.",
            valorNovo: JSON.stringify(data)
          }
        });
        return reply.status(201).send(created);
      } catch (error) {
        console.error("\u274C Erro ao criar PAF:", error);
        return reply.status(500).send({ message: "Erro interno ao criar PAF." });
      }
    }
  );
  app.put(
    "/cases/:caseId/paf",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      try {
        const { caseId } = paramsSchema.parse(request.params);
        const bodyData = pafBodySchema.partial().parse(request.body);
        const { sub: userId, cargo } = request.user;
        const existing = await prisma.paf.findUnique({ where: { casoId } });
        if (!existing) {
          return reply.status(404).send({ message: "PAF n\xE3o encontrado." });
        }
        if (existing.autorId !== userId && cargo !== "Gerente") {
          return reply.status(403).send({ message: "Sem permiss\xE3o para editar este PAF." });
        }
        const nextVersionNumber = existing.versaoAtual + 1;
        await prisma.pafVersion.create({
          data: {
            pafId: existing.id,
            diagnostico: existing.diagnostico,
            objetivos: existing.objetivos,
            estrategias: existing.estrategias,
            deadline: existing.deadline,
            autorId: existing.autorId,
            versaoNumero: existing.versaoAtual
          }
        });
        const updated = await prisma.paf.update({
          where: { casoId },
          data: {
            ...bodyData,
            autorId: userId,
            versaoAtual: nextVersionNumber,
            updatedAt: /* @__PURE__ */ new Date()
          }
        });
        await prisma.caseLog.create({
          data: {
            casoId,
            autorId: userId,
            acao: import_client2.LogAction.PAF_ATUALIZADO,
            descricao: `Atualizou o PAF para a vers\xE3o ${nextVersionNumber}.`,
            valorAnterior: JSON.stringify(existing),
            valorNovo: JSON.stringify(bodyData)
          }
        });
        return reply.status(200).send(updated);
      } catch (error) {
        console.error("\u274C Erro ao atualizar PAF:", error);
        return reply.status(500).send({ message: "Erro interno ao atualizar PAF." });
      }
    }
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  pafRoutes
});
