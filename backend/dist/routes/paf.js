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
async function pafRoutes(app) {
  app.get(
    "/cases/:caseId/paf",
    { onRequest: [app.authenticate] },
    //
    async (request, reply) => {
      const paramsSchema = import_zod.z.object({ caseId: import_zod.z.string().uuid() });
      try {
        const { caseId } = paramsSchema.parse(request.params);
        const paf = await prisma.paf.findUnique({
          where: { casoId: caseId },
          //
          include: { autor: { select: { id: true, nome: true } } }
          //
        });
        return await reply.status(200).send(paf);
      } catch (error) {
        request.log.error(error, "Erro ao buscar PAF.");
        return await reply.status(500).send({ message: "Erro interno ao buscar PAF." });
      }
    }
  );
  const pafBodySchema = import_zod.z.object({
    //
    diagnostico: import_zod.z.string().min(10),
    //
    objetivos: import_zod.z.string().min(10),
    //
    estrategias: import_zod.z.string().min(10),
    //
    // Trocamos 'prazos: z.string()' por 'deadline: z.coerce.date()'
    deadline: import_zod.z.coerce.date({
      required_error: "A data do prazo \xE9 obrigat\xF3ria."
    })
  });
  app.post(
    "/cases/:caseId/paf",
    { onRequest: [app.authenticate] },
    //
    async (request, reply) => {
      const paramsSchema = import_zod.z.object({ caseId: import_zod.z.string().uuid() });
      try {
        const { caseId } = paramsSchema.parse(request.params);
        const data = pafBodySchema.parse(request.body);
        const { sub: autorId, cargo } = request.user;
        if (cargo !== "Especialista" && cargo !== "Gerente") {
          return await reply.status(403).send({ message: "Apenas especialistas podem criar um PAF." });
        }
        const newPaf = await prisma.paf.create({
          data: {
            ...data,
            // 'data' agora contém 'deadline' em vez de 'prazos'
            casoId: caseId,
            //
            autorId
            //
          }
        });
        return await reply.status(201).send(newPaf);
      } catch (error) {
        request.log.error(error, "Erro ao criar PAF.");
        return await reply.status(500).send({ message: "Erro interno ao criar PAF." });
      }
    }
  );
  app.put(
    "/cases/:caseId/paf",
    { onRequest: [app.authenticate] },
    //
    async (request, reply) => {
      const paramsSchema = import_zod.z.object({ caseId: import_zod.z.string().uuid() });
      try {
        const { caseId } = paramsSchema.parse(request.params);
        const data = pafBodySchema.partial().parse(request.body);
        const { sub: userId, cargo } = request.user;
        const existingPaf = await prisma.paf.findUnique({
          where: { casoId: caseId }
          //
        });
        if (!existingPaf) {
          return await reply.status(404).send({ message: "PAF n\xE3o encontrado." });
        }
        if (existingPaf.autorId !== userId && cargo !== "Gerente") {
          return await reply.status(403).send({ message: "Apenas o autor ou um gerente podem editar este PAF." });
        }
        const updatedPaf = await prisma.paf.update({
          where: { casoId: caseId },
          //
          data: {
            ...data,
            // 'data' agora contém 'deadline' (se foi enviado)
            updatedAt: /* @__PURE__ */ new Date()
            //
          }
        });
        return await reply.status(200).send(updatedPaf);
      } catch (error) {
        request.log.error(error, "Erro ao atualizar PAF.");
        return await reply.status(500).send({ message: "Erro interno ao atualizar PAF." });
      }
    }
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  pafRoutes
});
