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
var globalForPrisma = global;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient({
  // Habilite logs apenas se quiser debugar queries lentas ou erros
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/family.ts
var import_client2 = require("@prisma/client");
var import_date_fns = require("date-fns");
var calculateAge = (birthDate) => {
  if (!birthDate || isNaN(birthDate.getTime())) return void 0;
  return (0, import_date_fns.differenceInYears)(/* @__PURE__ */ new Date(), birthDate);
};
var emptyToNull = (val) => {
  if (typeof val === "string" && val.trim() === "") return null;
  return val;
};
async function familyRoutes(app) {
  app.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app.post("/cases/:caseId/family", async (req, reply) => {
    const paramsSchema = import_zod.z.object({ caseId: import_zod.z.string().uuid() });
    const bodySchema = import_zod.z.object({
      nome: import_zod.z.string().min(2, "Nome muito curto"),
      parentesco: import_zod.z.string().min(2, "Informe o parentesco"),
      idade: import_zod.z.preprocess(emptyToNull, import_zod.z.coerce.number().int().nonnegative().optional().nullable()),
      cpf: import_zod.z.preprocess(emptyToNull, import_zod.z.string().optional().nullable()),
      nascimento: import_zod.z.preprocess(emptyToNull, import_zod.z.coerce.date().optional().nullable()),
      telefone: import_zod.z.preprocess(emptyToNull, import_zod.z.string().optional().nullable()),
      ocupacao: import_zod.z.preprocess(emptyToNull, import_zod.z.string().optional().nullable()),
      renda: import_zod.z.preprocess((val) => val === "" ? 0 : val, import_zod.z.coerce.number().nonnegative().optional().default(0)),
      observacoes: import_zod.z.preprocess(emptyToNull, import_zod.z.string().optional().nullable())
    });
    try {
      const { caseId } = paramsSchema.parse(req.params);
      const data = bodySchema.parse(req.body);
      const userId = req.user.sub;
      const caso = await prisma.case.findUnique({ where: { id: caseId } });
      if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
      const cpfLimpo = data.cpf ? data.cpf.replace(/\D/g, "") : null;
      const telefoneLimpo = data.telefone ? data.telefone.replace(/\D/g, "") : null;
      let idadeFinal = data.idade;
      if (data.nascimento) {
        const idadeCalculada = calculateAge(data.nascimento);
        if (idadeCalculada !== void 0) idadeFinal = idadeCalculada;
      }
      const idadeParaSalvar = idadeFinal === null ? void 0 : idadeFinal;
      const member = await prisma.membroFamilia.create({
        data: {
          casoId: caseId,
          // CORREÇÃO CONFIRMADA
          nome: data.nome,
          parentesco: data.parentesco,
          idade: idadeParaSalvar,
          nascimento: data.nascimento,
          cpf: cpfLimpo,
          telefone: telefoneLimpo,
          ocupacao: data.ocupacao,
          renda: data.renda,
          observacoes: data.observacoes
        }
      });
      await prisma.caseLog.create({
        data: {
          casoId: caseId,
          autorId: userId,
          acao: import_client2.LogAction.MEMBRO_FAMILIA_ADICIONADO,
          descricao: `Adicionou familiar: ${data.nome} (${data.parentesco})`
        }
      });
      const safeMember = {
        ...member,
        renda: member.renda ? Number(member.renda) : 0
      };
      return reply.status(201).send(safeMember);
    } catch (error) {
      console.error("Erro POST Family:", error);
      if (error instanceof import_zod.z.ZodError) return reply.status(400).send({ message: "Dados inv\xE1lidos", errors: error.flatten().fieldErrors });
      return reply.status(500).send({ message: "Erro ao adicionar familiar." });
    }
  });
  app.get("/cases/:caseId/family", async (req, reply) => {
    try {
      const { caseId } = import_zod.z.object({ caseId: import_zod.z.string().uuid() }).parse(req.params);
      const members = await prisma.membroFamilia.findMany({
        // CORREÇÃO AQUI: Mapeando explicitamente a variável
        where: { casoId: caseId },
        orderBy: [{ renda: "desc" }, { idade: "desc" }]
      });
      const safeMembers = members.map((m) => ({
        ...m,
        renda: m.renda ? Number(m.renda) : 0
      }));
      return reply.send(safeMembers);
    } catch (error) {
      console.error("Erro GET Family:", error);
      return reply.status(500).send({ message: "Erro ao listar fam\xEDlia." });
    }
  });
  app.put("/family/:id", async (req, reply) => {
    const paramsSchema = import_zod.z.object({ id: import_zod.z.string().uuid() });
    const bodySchema = import_zod.z.object({
      nome: import_zod.z.string().min(2),
      parentesco: import_zod.z.string(),
      nascimento: import_zod.z.preprocess(emptyToNull, import_zod.z.coerce.date().optional().nullable()),
      idade: import_zod.z.preprocess(emptyToNull, import_zod.z.coerce.number().optional().nullable()),
      ocupacao: import_zod.z.preprocess(emptyToNull, import_zod.z.string().optional().nullable()),
      renda: import_zod.z.preprocess((val) => val === "" ? 0 : val, import_zod.z.coerce.number().nonnegative().optional()),
      cpf: import_zod.z.preprocess(emptyToNull, import_zod.z.string().optional().nullable()),
      telefone: import_zod.z.preprocess(emptyToNull, import_zod.z.string().optional().nullable()),
      observacoes: import_zod.z.preprocess(emptyToNull, import_zod.z.string().optional().nullable())
    });
    try {
      const { id } = paramsSchema.parse(req.params);
      const data = bodySchema.parse(req.body);
      let idadeFinal = data.idade;
      if (data.nascimento) {
        const calc = calculateAge(data.nascimento);
        if (calc !== void 0) idadeFinal = calc;
      }
      const idadeParaSalvar = idadeFinal === null ? null : idadeFinal;
      const updated = await prisma.membroFamilia.update({
        where: { id },
        data: {
          nome: data.nome,
          parentesco: data.parentesco,
          nascimento: data.nascimento,
          idade: idadeParaSalvar,
          ocupacao: data.ocupacao,
          renda: data.renda,
          observacoes: data.observacoes,
          cpf: data.cpf ? data.cpf.replace(/\D/g, "") : null,
          telefone: data.telefone ? data.telefone.replace(/\D/g, "") : null
        }
      });
      const safeUpdated = {
        ...updated,
        renda: updated.renda ? Number(updated.renda) : 0
      };
      return reply.send(safeUpdated);
    } catch (error) {
      console.error("Erro PUT Family:", error);
      return reply.status(500).send({ message: "Erro ao atualizar membro." });
    }
  });
  app.delete("/family/:id", async (req, reply) => {
    const { id } = import_zod.z.object({ id: import_zod.z.string().uuid() }).parse(req.params);
    const userId = req.user.sub;
    try {
      const member = await prisma.membroFamilia.findUnique({ where: { id } });
      if (!member) return reply.status(404).send({ message: "Membro n\xE3o encontrado." });
      await prisma.membroFamilia.delete({ where: { id } });
      await prisma.caseLog.create({
        data: {
          casoId: member.casoId,
          autorId: userId,
          acao: import_client2.LogAction.OUTRO,
          descricao: `Removeu familiar: ${member.nome}`
        }
      });
      return reply.status(204).send();
    } catch (error) {
      console.error("Erro DELETE Family:", error);
      return reply.status(500).send({ message: "Erro ao remover familiar." });
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  familyRoutes
});
