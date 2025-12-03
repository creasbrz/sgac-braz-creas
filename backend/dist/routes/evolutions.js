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
var import_client2 = require("@prisma/client");
async function evolutionRoutes(app) {
  app.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app.get("/cases/:caseId/evolutions", async (request, reply) => {
    const { caseId } = import_zod.z.object({ caseId: import_zod.z.string().uuid() }).parse(request.params);
    const { sub: userId, cargo } = request.user;
    const evolucoes = await prisma.evolucao.findMany({
      where: { casoId: caseId },
      orderBy: { createdAt: "desc" },
      include: {
        autor: { select: { id: true, nome: true, cargo: true } }
      }
    });
    const filteredEvolucoes = evolucoes.filter((evo) => {
      if (!evo.sigilo) return true;
      if (cargo === import_client2.Cargo.Gerente) return true;
      if (evo.autorId === userId) return true;
      return false;
    });
    return reply.send(filteredEvolucoes);
  });
  app.post("/cases/:caseId/evolutions", async (request, reply) => {
    const { caseId } = import_zod.z.object({ caseId: import_zod.z.string().uuid() }).parse(request.params);
    const bodySchema = import_zod.z.object({
      conteudo: import_zod.z.string().min(1),
      sigilo: import_zod.z.boolean().optional().default(false)
      // [NOVO]
    });
    const { conteudo, sigilo } = bodySchema.parse(request.body);
    const { sub: userId } = request.user;
    const evolucao = await prisma.evolucao.create({
      data: {
        conteudo,
        sigilo,
        casoId: caseId,
        autorId: userId
      },
      include: { autor: true }
    });
    await prisma.caseLog.create({
      data: {
        casoId: caseId,
        autorId: userId,
        acao: import_client2.LogAction.EVOLUCAO_CRIADA,
        // Se for sigiloso, não mostra detalhes no log público
        descricao: sigilo ? "Registrou uma evolu\xE7\xE3o SIGILOSA." : "Adicionou uma nova evolu\xE7\xE3o t\xE9cnica."
      }
    });
    return reply.status(201).send(evolucao);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  evolutionRoutes
});
