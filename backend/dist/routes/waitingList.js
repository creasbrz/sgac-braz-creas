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

// src/routes/waitingList.ts
var waitingList_exports = {};
__export(waitingList_exports, {
  waitingListRoutes: () => waitingListRoutes
});
module.exports = __toCommonJS(waitingList_exports);

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var globalForPrisma = global;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient({
  log: ["error"]
  // Reduzi logs para limpar o terminal, use ['query'] para debug
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/waitingList.ts
var import_zod = require("zod");
async function waitingListRoutes(app) {
  app.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send();
    }
  });
  app.get("/cases/waiting", async (req, reply) => {
    const { sub: userId, cargo } = req.user;
    try {
      let whereCondition = {};
      if (cargo === "Agente_Social") {
        whereCondition = {
          status: "AGUARDANDO_ACOLHIDA",
          agenteAcolhidaId: userId
        };
      } else if (cargo === "Gerente") {
        whereCondition = { status: "AGUARDANDO_DISTRIBUICAO_PAEFI" };
      } else if (cargo === "Especialista") {
        whereCondition = {
          status: "EM_ACOLHIDA_ESPECIALIZADA",
          especialistaPAEFIId: userId
        };
      } else if (cargo === "Auditor") {
        whereCondition = {
          status: { in: ["AGUARDANDO_ACOLHIDA", "AGUARDANDO_DISTRIBUICAO_PAEFI", "EM_ACOLHIDA_ESPECIALIZADA"] }
        };
      }
      const cases = await prisma.case.findMany({
        where: {
          ...whereCondition,
          deletado: false
        },
        orderBy: [
          { pesoUrgencia: "desc" },
          // 1º Prioridade: Urgência
          { dataEntrada: "asc" }
          // 2º Prioridade: Antiguidade
        ],
        select: {
          id: true,
          nomeCompleto: true,
          dataEntrada: true,
          urgencia: true,
          pesoUrgencia: true,
          violacao: true,
          status: true,
          agenteAcolhida: { select: { nome: true } },
          especialistaPAEFI: { select: { nome: true } }
        }
      });
      return reply.send(cases);
    } catch (error) {
      console.error("[WAITING_LIST_ERROR]", error);
      return reply.status(500).send({ message: "Erro ao buscar fila de espera." });
    }
  });
  app.patch("/cases/waiting/:id/assign", async (req, reply) => {
    const { id } = import_zod.z.object({ id: import_zod.z.string().uuid() }).parse(req.params);
    const { sub: userId, cargo } = req.user;
    const bodySchema = import_zod.z.object({ targetUserId: import_zod.z.string().uuid().optional() });
    const { targetUserId } = bodySchema.parse(req.body || {});
    try {
      const existingCase = await prisma.case.findUnique({ where: { id } });
      if (!existingCase) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
      let updateData = {};
      let logAction = "";
      if (cargo === "Agente_Social" && existingCase.status === "AGUARDANDO_ACOLHIDA") {
        if (existingCase.agenteAcolhidaId !== userId) {
          return reply.status(403).send({ message: "Este caso n\xE3o foi atribu\xEDdo a voc\xEA." });
        }
        updateData = { status: "EM_ACOLHIDA" };
        logAction = "Iniciou Acolhida";
      } else if (cargo === "Gerente" && existingCase.status === "AGUARDANDO_DISTRIBUICAO_PAEFI") {
        if (!targetUserId) return reply.status(400).send({ message: "Selecione um especialista." });
        updateData = {
          status: "EM_ACOLHIDA_ESPECIALIZADA",
          especialistaPAEFIId: targetUserId
        };
        logAction = "Distribuiu Caso PAEFI";
      } else if (cargo === "Especialista" && existingCase.status === "EM_ACOLHIDA_ESPECIALIZADA") {
        if (existingCase.especialistaPAEFIId !== userId) {
          return reply.status(403).send({ message: "Este caso n\xE3o foi atribu\xEDdo a voc\xEA." });
        }
        updateData = { status: "EM_ACOMPANHAMENTO_PAEFI" };
        logAction = "Iniciou Acompanhamento";
      } else {
        return reply.status(400).send({ message: "A\xE7\xE3o n\xE3o permitida." });
      }
      const updatedCase = await prisma.case.update({
        where: { id },
        data: updateData
      });
      await prisma.caseLog.create({
        data: {
          casoId: id,
          autorId: userId,
          acao: "MUDANCA_STATUS",
          descricao: `${logAction} via Fila de Espera`
        }
      });
      return reply.send(updatedCase);
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ message: "Erro ao processar a\xE7\xE3o." });
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  waitingListRoutes
});
