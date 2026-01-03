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
  // Habilite logs apenas se quiser debugar queries lentas ou erros
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/filters.ts
async function filterRoutes(app) {
  app.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app.get("/filters", async (request, reply) => {
    const { sub: userId } = request.user;
    try {
      const filters = await prisma.savedFilter.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" }
      });
      return reply.send(filters);
    } catch (error) {
      console.error("\u274C ERRO AO BUSCAR FILTROS:", error);
      return reply.status(500).send({ message: "Erro ao buscar filtros." });
    }
  });
  app.post("/filters", async (request, reply) => {
    const { sub: userId } = request.user;
    const bodySchema = import_zod.z.object({
      nome: import_zod.z.string().min(1, "D\xEA um nome ao filtro"),
      // Melhoria: Aceita qualquer objeto JSON válido, mas força ser um objeto, não string/número solto
      config: import_zod.z.record(import_zod.z.string(), import_zod.z.any()).default({})
    });
    try {
      const { nome, config } = bodySchema.parse(request.body);
      const count = await prisma.savedFilter.count({ where: { userId } });
      if (count >= 10) {
        return reply.status(400).send({ message: "Voc\xEA atingiu o limite de 10 filtros salvos." });
      }
      const filter = await prisma.savedFilter.create({
        data: {
          nome,
          config,
          // Agora garantido que é um objeto JSON
          userId
        }
      });
      return reply.status(201).send(filter);
    } catch (error) {
      console.error("\u274C ERRO NO POST /filters:", error);
      if (error instanceof import_zod.z.ZodError) {
        return reply.status(400).send({ message: "Dados inv\xE1lidos.", errors: error.flatten().fieldErrors });
      }
      return reply.status(500).send({ message: "Erro ao salvar filtro." });
    }
  });
  app.delete("/filters/:id", async (request, reply) => {
    const paramsSchema = import_zod.z.object({ id: import_zod.z.string().uuid() });
    const { sub: userId } = request.user;
    try {
      const { id } = paramsSchema.parse(request.params);
      const filter = await prisma.savedFilter.findUnique({ where: { id } });
      if (!filter) return reply.status(404).send({ message: "Filtro n\xE3o encontrado." });
      if (filter.userId !== userId) {
        return reply.status(403).send({ message: "Voc\xEA n\xE3o tem permiss\xE3o para apagar este filtro." });
      }
      await prisma.savedFilter.delete({ where: { id } });
      return reply.status(204).send();
    } catch (error) {
      console.error("\u274C ERRO NO DELETE /filters:", error);
      return reply.status(500).send({ message: "Erro ao remover filtro." });
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  filterRoutes
});
