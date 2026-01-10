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

// src/routes/evolutions.ts
var evolutions_exports = {};
__export(evolutions_exports, {
  evolutionRoutes: () => evolutionRoutes
});
module.exports = __toCommonJS(evolutions_exports);
var import_zod = require("zod");

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var globalForPrisma = global;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient({
  log: ["error"]
  // Reduzi logs para limpar o terminal, use ['query'] para debug
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/evolutions.ts
var import_client2 = require("@prisma/client");
var authorSchema = import_zod.z.object({
  id: import_zod.z.string().uuid(),
  nome: import_zod.z.string(),
  cargo: import_zod.z.nativeEnum(import_client2.Cargo)
});
var evolutionResponseSchema = import_zod.z.object({
  id: import_zod.z.string().uuid(),
  conteudo: import_zod.z.string(),
  sigilo: import_zod.z.boolean(),
  createdAt: import_zod.z.date(),
  updatedAt: import_zod.z.date(),
  autorId: import_zod.z.string(),
  autor: authorSchema
});
async function evolutionRoutes(app) {
  const server = app.withTypeProvider();
  server.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  server.get("/cases/:caseId/evolutions", {
    schema: {
      tags: ["Evolu\xE7\xF5es"],
      summary: "Listar hist\xF3rico de evolu\xE7\xF5es de um caso",
      params: import_zod.z.object({ caseId: import_zod.z.string().uuid() }),
      querystring: import_zod.z.object({
        page: import_zod.z.coerce.number().min(1).default(1),
        pageSize: import_zod.z.coerce.number().min(1).max(50).default(10)
      }),
      response: {
        200: import_zod.z.object({
          items: import_zod.z.array(evolutionResponseSchema),
          total: import_zod.z.number(),
          page: import_zod.z.number(),
          totalPages: import_zod.z.number()
        })
      }
    }
  }, async (request, reply) => {
    const { caseId } = request.params;
    const { page, pageSize } = request.query;
    const { sub: userId, cargo } = request.user;
    const caso = await prisma.case.findUnique({
      where: { id: caseId },
      select: {
        agenteAcolhidaId: true,
        especialistaPAEFIId: true
      }
    });
    if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
    const isGerente = cargo === import_client2.Cargo.Gerente;
    const isResponsavel = caso.agenteAcolhidaId === userId || caso.especialistaPAEFIId === userId;
    const canViewSigilo = isGerente || isResponsavel;
    const whereCondition = { casoId: caseId };
    if (!canViewSigilo) {
      whereCondition.OR = [
        { sigilo: false },
        { autorId: userId }
      ];
    }
    const [evolucoes, total] = await Promise.all([
      prisma.evolucao.findMany({
        where: whereCondition,
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip: (page - 1) * pageSize,
        include: {
          autor: { select: { id: true, nome: true, cargo: true } }
        }
      }),
      prisma.evolucao.count({ where: whereCondition })
    ]);
    return reply.send({
      items: evolucoes,
      total,
      page,
      totalPages: Math.ceil(total / pageSize)
    });
  });
  server.post("/cases/:caseId/evolutions", {
    schema: {
      tags: ["Evolu\xE7\xF5es"],
      summary: "Adicionar nova evolu\xE7\xE3o ao prontu\xE1rio",
      params: import_zod.z.object({ caseId: import_zod.z.string().uuid() }),
      body: import_zod.z.object({
        conteudo: import_zod.z.string().min(5, "A evolu\xE7\xE3o deve ter conte\xFAdo relevante."),
        sigilo: import_zod.z.boolean().default(false)
      }),
      response: {
        201: evolutionResponseSchema
      }
    }
  }, async (request, reply) => {
    const { caseId } = request.params;
    const { conteudo, sigilo } = request.body;
    const { sub: userId } = request.user;
    const evolucao = await prisma.evolucao.create({
      data: {
        conteudo,
        sigilo,
        // [CORREÇÃO] Mapeamento explícito
        casoId: caseId,
        autorId: userId
      },
      include: { autor: { select: { id: true, nome: true, cargo: true } } }
    });
    prisma.caseLog.create({
      data: {
        // [CORREÇÃO] Mapeamento explícito
        casoId: caseId,
        autorId: userId,
        acao: import_client2.LogAction.EVOLUCAO_CRIADA,
        descricao: sigilo ? "Registrou uma evolu\xE7\xE3o t\xE9cnica (SIGILOSA)." : "Registrou uma evolu\xE7\xE3o t\xE9cnica p\xFAblica."
      }
    }).catch((err) => console.error("Erro ao criar log de evolu\xE7\xE3o:", err));
    return reply.status(201).send(evolucao);
  });
  server.patch("/evolutions/:id", {
    schema: {
      tags: ["Evolu\xE7\xF5es"],
      summary: "Editar conte\xFAdo de uma evolu\xE7\xE3o (Apenas Autor)",
      params: import_zod.z.object({ id: import_zod.z.string().uuid() }),
      body: import_zod.z.object({
        conteudo: import_zod.z.string().min(5).optional(),
        sigilo: import_zod.z.boolean().optional()
      }),
      response: {
        200: evolutionResponseSchema
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { conteudo, sigilo } = request.body;
    const { sub: userId } = request.user;
    const existingEvolucao = await prisma.evolucao.findUnique({ where: { id } });
    if (!existingEvolucao) return reply.status(404).send({ message: "Evolu\xE7\xE3o n\xE3o encontrada." });
    if (existingEvolucao.autorId !== userId) {
      return reply.status(403).send({ message: "Voc\xEA s\xF3 pode editar evolu\xE7\xF5es criadas por voc\xEA." });
    }
    const updated = await prisma.evolucao.update({
      where: { id },
      data: { conteudo, sigilo },
      include: { autor: { select: { id: true, nome: true, cargo: true } } }
    });
    return reply.send(updated);
  });
  server.delete("/evolutions/:id", {
    schema: {
      tags: ["Evolu\xE7\xF5es"],
      summary: "Remover uma evolu\xE7\xE3o (Apenas Autor)",
      params: import_zod.z.object({ id: import_zod.z.string().uuid() }),
      response: {
        204: import_zod.z.null()
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { sub: userId } = request.user;
    const existingEvolucao = await prisma.evolucao.findUnique({ where: { id } });
    if (!existingEvolucao) return reply.status(404).send({ message: "Evolu\xE7\xE3o n\xE3o encontrada." });
    if (existingEvolucao.autorId !== userId) {
      return reply.status(403).send({ message: "Voc\xEA s\xF3 pode excluir evolu\xE7\xF5es criadas por voc\xEA." });
    }
    await prisma.evolucao.delete({ where: { id } });
    return reply.status(204).send();
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  evolutionRoutes
});
