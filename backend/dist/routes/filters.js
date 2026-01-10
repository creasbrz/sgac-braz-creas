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

// src/routes/filters.ts
var filters_exports = {};
__export(filters_exports, {
  filterRoutes: () => filterRoutes
});
module.exports = __toCommonJS(filters_exports);
var import_zod = require("zod");

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var globalForPrisma = global;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient({
  log: ["error"]
  // Reduzi logs para limpar o terminal, use ['query'] para debug
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/filters.ts
var filterResponseSchema = import_zod.z.object({
  id: import_zod.z.string().uuid(),
  nome: import_zod.z.string(),
  config: import_zod.z.any(),
  // JSON do banco
  createdAt: import_zod.z.date()
});
var createFilterSchema = import_zod.z.object({
  nome: import_zod.z.string().min(1, "O nome do filtro \xE9 obrigat\xF3rio"),
  // Aceita um objeto JSON livre (estado do formulário de filtros do front)
  config: import_zod.z.record(import_zod.z.string(), import_zod.z.any()).or(import_zod.z.any())
});
async function filterRoutes(app) {
  const server = app.withTypeProvider();
  server.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ message: "Sess\xE3o expirada ou inv\xE1lida." });
    }
  });
  server.get("/filters", {
    schema: {
      tags: ["Filtros"],
      summary: "Listar filtros personalizados salvos pelo usu\xE1rio",
      response: {
        200: import_zod.z.array(filterResponseSchema)
      }
    }
  }, async (request, reply) => {
    const { sub: userId } = request.user;
    try {
      const filters = await prisma.savedFilter.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" }
      });
      return reply.send(filters);
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao buscar filtros." });
    }
  });
  server.post("/filters", {
    schema: {
      tags: ["Filtros"],
      summary: "Salvar configura\xE7\xE3o atual de filtros",
      body: createFilterSchema,
      response: {
        201: filterResponseSchema
      }
    }
  }, async (request, reply) => {
    const { sub: userId } = request.user;
    const { nome, config } = request.body;
    try {
      const count = await prisma.savedFilter.count({ where: { userId } });
      if (count >= 15) {
        return reply.status(400).send({ message: "Limite de 15 filtros atingido. Exclua alguns antigos para salvar novos." });
      }
      const filter = await prisma.savedFilter.create({
        data: {
          nome,
          config: config ?? {},
          // Garante objeto vazio se null
          userId
        }
      });
      return reply.status(201).send(filter);
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao salvar filtro." });
    }
  });
  server.patch("/filters/:id", {
    schema: {
      tags: ["Filtros"],
      summary: "Atualizar nome ou regras de um filtro existente",
      params: import_zod.z.object({ id: import_zod.z.string().uuid() }),
      body: createFilterSchema.partial(),
      // Campos opcionais no update
      response: {
        200: filterResponseSchema
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { nome, config } = request.body;
    const { sub: userId } = request.user;
    try {
      const existing = await prisma.savedFilter.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ message: "Filtro n\xE3o encontrado." });
      if (existing.userId !== userId) return reply.status(403).send({ message: "Voc\xEA s\xF3 pode editar seus pr\xF3prios filtros." });
      const updated = await prisma.savedFilter.update({
        where: { id },
        data: {
          nome,
          config: config ?? void 0
        }
      });
      return reply.send(updated);
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao atualizar filtro." });
    }
  });
  server.delete("/filters/:id", {
    schema: {
      tags: ["Filtros"],
      summary: "Remover um filtro salvo",
      params: import_zod.z.object({ id: import_zod.z.string().uuid() }),
      response: {
        204: import_zod.z.null()
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { sub: userId } = request.user;
    try {
      const filter = await prisma.savedFilter.findUnique({ where: { id } });
      if (!filter) return reply.status(404).send({ message: "Filtro n\xE3o encontrado." });
      if (filter.userId !== userId) {
        return reply.status(403).send({ message: "Sem permiss\xE3o para excluir este filtro." });
      }
      await prisma.savedFilter.delete({ where: { id } });
      return reply.status(204).send();
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao remover filtro." });
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  filterRoutes
});
