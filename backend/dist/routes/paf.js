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
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
};
var pafBodySchema = import_zod.z.object({
  diagnostico: import_zod.z.string().min(10, "O diagn\xF3stico deve conter ao menos 10 caracteres."),
  objetivos: import_zod.z.string().min(10, "Os objetivos devem conter ao menos 10 caracteres."),
  estrategias: import_zod.z.string().min(10, "As estrat\xE9gias devem conter ao menos 10 caracteres."),
  deadline: import_zod.z.coerce.date({ required_error: "O prazo \xE9 obrigat\xF3rio." })
});
var pafResponseSchema = import_zod.z.object({
  id: import_zod.z.string().uuid(),
  diagnostico: import_zod.z.string(),
  objetivos: import_zod.z.string(),
  estrategias: import_zod.z.string(),
  deadline: import_zod.z.date(),
  versaoAtual: import_zod.z.number(),
  updatedAt: import_zod.z.date(),
  autor: import_zod.z.object({
    id: import_zod.z.string(),
    nome: import_zod.z.string()
  }).optional()
});
var versionResponseSchema = import_zod.z.object({
  id: import_zod.z.string().uuid(),
  savedAt: import_zod.z.date(),
  versaoNumero: import_zod.z.number(),
  autor: import_zod.z.object({ nome: import_zod.z.string() }).optional()
  // Adicione outros campos se quiser exibir o conteúdo histórico na lista
});
async function pafRoutes(app) {
  const server = app.withTypeProvider();
  server.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  server.get("/cases/:caseId/paf", {
    schema: {
      tags: ["PAF"],
      summary: "Obter o Plano de Acompanhamento Familiar atual",
      params: import_zod.z.object({ caseId: import_zod.z.string().uuid() }),
      response: {
        200: pafResponseSchema.nullable()
      }
    }
  }, async (request, reply) => {
    const { caseId } = request.params;
    const paf = await prisma.paf.findUnique({
      where: { casoId: caseId },
      include: { autor: { select: { id: true, nome: true } } }
    });
    return reply.send(paf);
  });
  server.get("/cases/:caseId/paf/history", {
    schema: {
      tags: ["PAF"],
      summary: "Listar vers\xF5es anteriores do PAF",
      params: import_zod.z.object({ caseId: import_zod.z.string().uuid() }),
      response: {
        200: import_zod.z.array(versionResponseSchema)
      }
    }
  }, async (request, reply) => {
    const { caseId } = request.params;
    const paf = await prisma.paf.findUnique({ where: { casoId: caseId } });
    if (!paf) return reply.send([]);
    const history = await prisma.pafVersion.findMany({
      where: { pafId: paf.id },
      orderBy: { savedAt: "desc" },
      include: { autor: { select: { nome: true } } }
    });
    return reply.send(history);
  });
  server.post("/cases/:caseId/paf", {
    schema: {
      tags: ["PAF"],
      summary: "Criar o primeiro PAF do caso",
      params: import_zod.z.object({ caseId: import_zod.z.string().uuid() }),
      body: pafBodySchema,
      response: {
        201: pafResponseSchema
      }
    }
  }, async (request, reply) => {
    const { caseId } = request.params;
    const data = request.body;
    const { sub: autorId, cargo } = request.user;
    if (cargo !== import_client2.Cargo.Especialista && cargo !== import_client2.Cargo.Gerente) {
      return reply.status(403).send({ message: "Apenas especialistas ou gerentes podem criar PAF." });
    }
    const existing = await prisma.paf.findUnique({ where: { casoId } });
    if (existing) {
      return reply.status(409).send({ message: "J\xE1 existe um PAF para este caso. Use a rota de atualiza\xE7\xE3o (PUT)." });
    }
    const created = await prisma.paf.create({
      data: {
        ...data,
        deadline: stripTime(data.deadline),
        casoId,
        autorId,
        versaoAtual: 1
      },
      include: { autor: { select: { id: true, nome: true } } }
    });
    prisma.caseLog.create({
      data: {
        casoId,
        autorId,
        acao: import_client2.LogAction.PAF_CRIADO,
        descricao: "Elaborou o Plano de Acompanhamento Familiar (PAF)."
      }
    }).catch(console.error);
    return reply.status(201).send(created);
  });
  server.put("/cases/:caseId/paf", {
    schema: {
      tags: ["PAF"],
      summary: "Atualizar PAF (Gera nova vers\xE3o automaticamente)",
      params: import_zod.z.object({ caseId: import_zod.z.string().uuid() }),
      body: pafBodySchema.partial(),
      // Permite update parcial
      response: {
        200: pafResponseSchema
      }
    }
  }, async (request, reply) => {
    const { caseId } = request.params;
    const bodyData = request.body;
    const { sub: userId, cargo } = request.user;
    const existing = await prisma.paf.findUnique({ where: { casoId: caseId } });
    if (!existing) return reply.status(404).send({ message: "PAF n\xE3o encontrado." });
    if (cargo !== import_client2.Cargo.Gerente && cargo !== import_client2.Cargo.Especialista) {
      return reply.status(403).send({ message: "Sem permiss\xE3o para editar este PAF." });
    }
    const result = await prisma.$transaction(async (tx) => {
      await tx.pafVersion.create({
        data: {
          pafId: existing.id,
          diagnostico: existing.diagnostico,
          objetivos: existing.objetivos,
          estrategias: existing.estrategias,
          deadline: existing.deadline,
          autorId: existing.autorId,
          // Autor da versão antiga
          versaoNumero: existing.versaoAtual,
          savedAt: /* @__PURE__ */ new Date()
        }
      });
      const nextVersion = existing.versaoAtual + 1;
      const updated = await tx.paf.update({
        where: { casoId: caseId },
        data: {
          ...bodyData,
          deadline: bodyData.deadline ? stripTime(bodyData.deadline) : void 0,
          autorId: userId,
          // Novo autor da versão atual
          versaoAtual: nextVersion
        },
        include: { autor: { select: { id: true, nome: true } } }
      });
      return updated;
    });
    prisma.caseLog.create({
      data: {
        casoId,
        autorId: userId,
        acao: import_client2.LogAction.PAF_ATUALIZADO,
        descricao: `Atualizou PAF para vers\xE3o ${result.versaoAtual}.`
      }
    }).catch(console.error);
    return reply.send(result);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  pafRoutes
});
