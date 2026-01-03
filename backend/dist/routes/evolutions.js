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
  // Habilite logs apenas se quiser debugar queries lentas ou erros
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/evolutions.ts
var import_client2 = require("@prisma/client");
async function evolutionRoutes(app) {
  app.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      await reply.status(401).send(err);
    }
  });
  app.post("/cases/:caseId/evolutions", async (request, reply) => {
    const paramsSchema = import_zod.z.object({ caseId: import_zod.z.string().uuid() });
    const bodySchema = import_zod.z.object({
      conteudo: import_zod.z.string().min(3, "Escreva algo relevante."),
      sigilo: import_zod.z.boolean().default(false)
    });
    try {
      const { caseId } = paramsSchema.parse(request.params);
      const { conteudo, sigilo } = bodySchema.parse(request.body);
      const user = request.user;
      const caso = await prisma.case.findUnique({ where: { id: caseId } });
      if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
      const evolucao = await prisma.evolucao.create({
        data: {
          conteudo,
          sigilo,
          casoId: caseId,
          // Vínculo garantido
          autorId: user.sub
        },
        include: {
          autor: { select: { id: true, nome: true, cargo: true } }
        }
      });
      await prisma.caseLog.create({
        data: {
          casoId: caseId,
          autorId: user.sub,
          acao: import_client2.LogAction.EVOLUCAO_CRIADA,
          descricao: sigilo ? "Evolu\xE7\xE3o Sigilosa." : "Evolu\xE7\xE3o T\xE9cnica."
        }
      });
      await prisma.case.update({
        where: { id: caseId },
        data: { updatedAt: /* @__PURE__ */ new Date() }
      });
      return reply.status(201).send(evolucao);
    } catch (error) {
      console.error("Erro POST Evolu\xE7\xE3o:", error);
      return reply.status(500).send({ message: "Erro ao criar evolu\xE7\xE3o." });
    }
  });
  app.get("/cases/:caseId/evolutions", async (request, reply) => {
    const paramsSchema = import_zod.z.object({ caseId: import_zod.z.string().uuid() });
    const querySchema = import_zod.z.object({
      page: import_zod.z.coerce.number().min(1).default(1),
      pageSize: import_zod.z.coerce.number().default(10)
    });
    try {
      const { caseId } = paramsSchema.parse(request.params);
      const { page, pageSize } = querySchema.parse(request.query);
      const user = request.user;
      const whereCondition = {
        casoId: caseId
        // Garante que só busca desse caso
      };
      if (user.cargo !== import_client2.Cargo.Gerente) {
        whereCondition.OR = [
          { sigilo: false },
          // Vejo todas as públicas
          { autorId: user.sub }
          // Vejo as minhas (mesmo sigilosas)
        ];
      }
      const [evolucoes, total] = await Promise.all([
        prisma.evolucao.findMany({
          where: whereCondition,
          orderBy: { createdAt: "desc" },
          // Mais recentes primeiro
          take: pageSize,
          skip: (page - 1) * pageSize,
          include: {
            autor: {
              select: { id: true, nome: true, cargo: true }
            }
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
    } catch (error) {
      console.error("Erro GET Evolu\xE7\xF5es:", error);
      return reply.status(500).send({ message: "Erro ao listar evolu\xE7\xF5es." });
    }
  });
  app.put("/evolutions/:id", async (request, reply) => {
    const paramsSchema = import_zod.z.object({ id: import_zod.z.string().uuid() });
    const bodySchema = import_zod.z.object({ conteudo: import_zod.z.string().min(3), sigilo: import_zod.z.boolean() });
    try {
      const { id } = paramsSchema.parse(request.params);
      const { conteudo, sigilo } = bodySchema.parse(request.body);
      const user = request.user;
      const evolucao = await prisma.evolucao.findUnique({ where: { id } });
      if (!evolucao) return reply.status(404).send({ message: "N\xE3o encontrado." });
      if (evolucao.autorId !== user.sub) return reply.status(403).send({ message: "Sem permiss\xE3o." });
      const updated = await prisma.evolucao.update({
        where: { id },
        data: { conteudo, sigilo }
      });
      return reply.send(updated);
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao editar." });
    }
  });
  app.delete("/evolutions/:id", async (request, reply) => {
    const paramsSchema = import_zod.z.object({ id: import_zod.z.string().uuid() });
    try {
      const { id } = paramsSchema.parse(request.params);
      const user = request.user;
      const evolucao = await prisma.evolucao.findUnique({ where: { id } });
      if (!evolucao) return reply.status(404).send({ message: "N\xE3o encontrado." });
      if (evolucao.autorId !== user.sub && user.cargo !== import_client2.Cargo.Gerente) {
        return reply.status(403).send({ message: "Sem permiss\xE3o." });
      }
      await prisma.evolucao.delete({ where: { id } });
      await prisma.caseLog.create({
        data: {
          casoId: evolucao.casoId,
          autorId: user.sub,
          acao: import_client2.LogAction.OUTRO,
          descricao: "Excluiu uma evolu\xE7\xE3o."
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
  evolutionRoutes
});
