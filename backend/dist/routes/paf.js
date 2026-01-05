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
var globalForPrisma = global;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient({
  log: ["error"]
  // Reduzi logs para limpar o terminal, use ['query'] para debug
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/paf.ts
var import_client2 = require("@prisma/client");
var stripTime = (date) => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};
async function pafRoutes(app) {
  app.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  const pafBodySchema = import_zod.z.object({
    diagnostico: import_zod.z.string().min(10, "O diagn\xF3stico deve conter ao menos 10 caracteres."),
    objetivos: import_zod.z.string().min(10, "Os objetivos devem conter ao menos 10 caracteres."),
    estrategias: import_zod.z.string().min(10, "As estrat\xE9gias devem conter ao menos 10 caracteres."),
    deadline: import_zod.z.coerce.date({ required_error: "O prazo \xE9 obrigat\xF3rio." })
  });
  const paramsSchema = import_zod.z.object({
    caseId: import_zod.z.string().uuid()
  });
  app.get("/cases/:caseId/paf", async (request, reply) => {
    try {
      const { caseId } = paramsSchema.parse(request.params);
      const paf = await prisma.paf.findUnique({
        where: { casoId: caseId },
        // Mapeamento correto
        include: { autor: { select: { id: true, nome: true } } }
      });
      return reply.send(paf);
    } catch (error) {
      console.error("\u274C Erro GET /paf:", error);
      return reply.status(500).send({ message: "Erro ao buscar PAF." });
    }
  });
  app.get("/cases/:caseId/paf/history", async (request, reply) => {
    try {
      const { caseId } = paramsSchema.parse(request.params);
      const paf = await prisma.paf.findUnique({ where: { casoId: caseId } });
      if (!paf) return reply.send([]);
      const history = await prisma.pafVersion.findMany({
        where: { pafId: paf.id },
        orderBy: { savedAt: "desc" },
        include: { autor: { select: { nome: true } } }
      });
      return reply.send(history);
    } catch (error) {
      console.error("\u274C Erro GET /paf/history:", error);
      return reply.status(500).send({ message: "Erro ao buscar hist\xF3rico." });
    }
  });
  app.post("/cases/:caseId/paf", async (request, reply) => {
    try {
      const { caseId } = paramsSchema.parse(request.params);
      const data = pafBodySchema.parse(request.body);
      const { sub: autorId, cargo } = request.user;
      if (cargo !== "Especialista" && cargo !== "Gerente") {
        return reply.status(403).send({ message: "Apenas especialistas/gerentes criam PAF." });
      }
      const created = await prisma.paf.create({
        data: {
          ...data,
          deadline: stripTime(data.deadline),
          casoId: caseId,
          // Campo do banco: Variável
          autorId,
          versaoAtual: 1
        }
      });
      await prisma.caseLog.create({
        data: {
          casoId: caseId,
          autorId,
          acao: import_client2.LogAction.PAF_CRIADO,
          descricao: "Elaborou o Plano de Acompanhamento Familiar (PAF)."
        }
      });
      return reply.status(201).send(created);
    } catch (error) {
      console.error("\u274C Erro POST /paf:", error);
      if (error instanceof import_zod.z.ZodError) {
        return reply.status(400).send({ message: "Dados inv\xE1lidos.", errors: error.flatten().fieldErrors });
      }
      return reply.status(500).send({ message: "Erro interno ao criar PAF." });
    }
  });
  app.put("/cases/:caseId/paf", async (request, reply) => {
    try {
      const { caseId } = paramsSchema.parse(request.params);
      const bodyData = pafBodySchema.partial().parse(request.body);
      const { sub: userId, cargo } = request.user;
      const existing = await prisma.paf.findUnique({ where: { casoId: caseId } });
      if (!existing) return reply.status(404).send({ message: "PAF n\xE3o encontrado." });
      if (existing.autorId !== userId && cargo !== "Gerente") {
        return reply.status(403).send({ message: "Sem permiss\xE3o para editar este PAF." });
      }
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
      const nextVersion = existing.versaoAtual + 1;
      const updated = await prisma.paf.update({
        where: { casoId: caseId },
        // CORREÇÃO AQUI TAMBÉM
        data: {
          ...bodyData,
          deadline: bodyData.deadline ? stripTime(bodyData.deadline) : void 0,
          autorId: userId,
          versaoAtual: nextVersion,
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
      await prisma.caseLog.create({
        data: {
          casoId: caseId,
          // CORREÇÃO
          autorId: userId,
          acao: import_client2.LogAction.PAF_ATUALIZADO,
          descricao: `Atualizou PAF para vers\xE3o ${nextVersion}.`
        }
      });
      return reply.send(updated);
    } catch (error) {
      console.error("\u274C Erro PUT /paf:", error);
      if (error instanceof import_zod.z.ZodError) {
        return reply.status(400).send({ message: "Dados inv\xE1lidos.", errors: error.flatten().fieldErrors });
      }
      if (error.code === "P2021") {
        return reply.status(500).send({ message: "Erro de banco: Tabela PafVersion n\xE3o encontrada. Rode 'npx prisma migrate dev'." });
      }
      return reply.status(500).send({ message: "Erro interno ao atualizar PAF." });
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  pafRoutes
});
