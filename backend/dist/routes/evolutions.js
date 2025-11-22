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
var prisma = new import_client.PrismaClient();

// src/routes/evolutions.ts
var createEvolutionBodySchema = import_zod.z.object({
  //
  conteudo: import_zod.z.string().min(10, "A evolu\xE7\xE3o deve ter no m\xEDnimo 10 caracteres.")
  //
});
async function evolutionRoutes(app) {
  app.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app.get("/cases/:caseId/evolutions", async (request, reply) => {
    const paramsSchema = import_zod.z.object({ caseId: import_zod.z.string().uuid() });
    try {
      const { caseId } = paramsSchema.parse(request.params);
      const evolutions = await prisma.evolucao.findMany({
        where: { casoId: caseId },
        //
        orderBy: { createdAt: "desc" },
        include: {
          autor: { select: { id: true, nome: true } }
          //
        }
      });
      return await reply.status(200).send(evolutions);
    } catch (error) {
      console.error("Erro ao buscar evolu\xE7\xF5es:", error);
      return await reply.status(500).send({ message: "Erro interno ao buscar evolu\xE7\xF5es." });
    }
  });
  app.post("/cases/:caseId/evolutions", async (request, reply) => {
    const paramsSchema = import_zod.z.object({ caseId: import_zod.z.string().uuid() });
    try {
      const { caseId } = paramsSchema.parse(request.params);
      const data = createEvolutionBodySchema.parse(request.body);
      const { sub: autorId, nome: autorNome } = request.user;
      const newEvolution = await prisma.evolucao.create({
        //
        data: {
          // O frontend envia 'conteudo' e o banco espera 'conteudo'
          conteudo: data.conteudo,
          //
          casoId: caseId,
          //
          autorId
          //
        }
      });
      const evolutionForFrontend = {
        id: newEvolution.id,
        createdAt: newEvolution.createdAt,
        conteudo: newEvolution.conteudo,
        autor: { nome: autorNome ?? "Usu\xE1rio" }
        // Adiciona o autor para o cache
      };
      return await reply.status(201).send(evolutionForFrontend);
    } catch (error) {
      console.error("!!!!!!!!!! ERRO 500 AO CRIAR EVOLU\xC7\xC3O !!!!!!!!!!");
      console.error("DADOS RECEBIDOS:", request.body);
      console.error("AUTOR ID:", request.user.sub);
      console.error("ERRO COMPLETO:", error);
      if (error instanceof import_zod.z.ZodError) {
        return reply.status(400).send({
          message: "Dados inv\xE1lidos.",
          errors: error.flatten().fieldErrors
        });
      }
      return await reply.status(500).send({ message: "Erro interno ao criar evolu\xE7\xE3o." });
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  evolutionRoutes
});
