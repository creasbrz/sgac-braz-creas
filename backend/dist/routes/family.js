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

// src/routes/family.ts
var family_exports = {};
__export(family_exports, {
  familyRoutes: () => familyRoutes
});
module.exports = __toCommonJS(family_exports);
var import_zod = require("zod");

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var prisma = new import_client.PrismaClient();

// src/routes/family.ts
var import_client2 = require("@prisma/client");
async function familyRoutes(app) {
  app.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send();
    }
  });
  app.post("/cases/:caseId/family", async (req, reply) => {
    const paramsSchema = import_zod.z.object({ caseId: import_zod.z.string().uuid() });
    const bodySchema = import_zod.z.object({
      nome: import_zod.z.string().min(2),
      parentesco: import_zod.z.string().min(2),
      idade: import_zod.z.number().int().nonnegative().optional(),
      // [NOVOS CAMPOS]
      cpf: import_zod.z.string().optional().nullable(),
      nascimento: import_zod.z.coerce.date().optional().nullable(),
      telefone: import_zod.z.string().optional().nullable(),
      ocupacao: import_zod.z.string().optional(),
      renda: import_zod.z.number().nonnegative().optional(),
      observacoes: import_zod.z.string().optional()
    });
    try {
      const { caseId } = paramsSchema.parse(req.params);
      const data = bodySchema.parse(req.body);
      const userId = req.user.sub;
      const cpfLimpo = data.cpf ? data.cpf.replace(/\D/g, "") : null;
      const telefoneLimpo = data.telefone ? data.telefone.replace(/\D/g, "") : null;
      const member = await prisma.membroFamilia.create({
        data: {
          ...data,
          cpf: cpfLimpo,
          telefone: telefoneLimpo,
          // [CORREÇÃO]: Mapeamento explícito (banco: variável)
          casoId: caseId
        }
      });
      await prisma.caseLog.create({
        data: {
          // [CORREÇÃO]: Mapeamento explícito aqui também
          casoId: caseId,
          autorId: userId,
          acao: import_client2.LogAction.MEMBRO_FAMILIA_ADICIONADO,
          descricao: `Adicionou familiar: ${data.nome} (${data.parentesco})`
        }
      });
      return reply.status(201).send(member);
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ message: "Erro ao adicionar familiar." });
    }
  });
  app.get("/cases/:caseId/family", async (req, reply) => {
    const { caseId } = import_zod.z.object({ caseId: import_zod.z.string().uuid() }).parse(req.params);
    const members = await prisma.membroFamilia.findMany({
      // [CORREÇÃO]: Mapeamento explícito
      where: { casoId: caseId },
      orderBy: { createdAt: "asc" }
    });
    return reply.send(members);
  });
  app.delete("/family/:id", async (req, reply) => {
    const { id } = import_zod.z.object({ id: import_zod.z.string().uuid() }).parse(req.params);
    const userId = req.user.sub;
    try {
      const member = await prisma.membroFamilia.findUnique({ where: { id } });
      if (!member) return reply.status(404).send();
      await prisma.membroFamilia.delete({ where: { id } });
      await prisma.caseLog.create({
        data: {
          casoId: member.casoId,
          // Aqui 'member' vem do banco, então já tem 'casoId' correto
          autorId: userId,
          acao: import_client2.LogAction.OUTRO,
          descricao: `Removeu familiar: ${member.nome}`
        }
      });
      return reply.status(204).send();
    } catch (error) {
      return reply.status(500).send();
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  familyRoutes
});
