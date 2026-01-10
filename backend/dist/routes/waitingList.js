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
var import_zod = require("zod");

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var globalForPrisma = global;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient({
  log: ["error"]
  // Reduzi logs para limpar o terminal, use ['query'] para debug
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/waitingList.ts
var import_client2 = require("@prisma/client");
var waitingCaseSchema = import_zod.z.object({
  id: import_zod.z.string(),
  nomeCompleto: import_zod.z.string(),
  dataEntrada: import_zod.z.date(),
  urgencia: import_zod.z.string(),
  pesoUrgencia: import_zod.z.number(),
  violacao: import_zod.z.string(),
  status: import_zod.z.string(),
  agenteAcolhida: import_zod.z.object({ nome: import_zod.z.string() }).nullable().optional(),
  especialistaPAEFI: import_zod.z.object({ nome: import_zod.z.string() }).nullable().optional()
});
var assignBodySchema = import_zod.z.object({
  targetUserId: import_zod.z.string().uuid().optional()
  // Obrigatório apenas para Gerente distribuindo
});
async function waitingListRoutes(app) {
  const server = app.withTypeProvider();
  server.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado" });
    }
  });
  server.get("/cases/waiting", {
    schema: {
      tags: ["Fila de Espera"],
      summary: "Listar casos parados aguardando a\xE7\xE3o do usu\xE1rio logado",
      response: {
        200: import_zod.z.array(waitingCaseSchema)
      }
    }
  }, async (req, reply) => {
    const { sub: userId, cargo } = req.user;
    try {
      let whereCondition = { deletado: false };
      if (cargo === import_client2.Cargo.Agente_Social) {
        whereCondition.status = import_client2.CaseStatus.AGUARDANDO_ACOLHIDA;
        whereCondition.agenteAcolhidaId = userId;
      } else if (cargo === import_client2.Cargo.Gerente) {
        whereCondition.status = import_client2.CaseStatus.AGUARDANDO_DISTRIBUICAO;
      } else if (cargo === import_client2.Cargo.Especialista) {
        whereCondition.status = import_client2.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA;
        whereCondition.especialistaPAEFIId = userId;
      } else if (cargo === import_client2.Cargo.Auditor) {
        whereCondition.status = {
          in: [
            import_client2.CaseStatus.AGUARDANDO_ACOLHIDA,
            import_client2.CaseStatus.AGUARDANDO_DISTRIBUICAO,
            import_client2.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA
          ]
        };
      } else {
        return reply.send([]);
      }
      const cases = await prisma.case.findMany({
        where: whereCondition,
        orderBy: [
          { pesoUrgencia: "desc" },
          // 1º Prioridade: Urgência
          { dataEntrada: "asc" }
          // 2º Prioridade: Antiguidade (FIFO)
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
  server.patch("/cases/waiting/:id/assign", {
    schema: {
      tags: ["Fila de Espera"],
      summary: "Realizar a\xE7\xE3o da fila (Iniciar Acolhida, Distribuir ou Iniciar Acompanhamento)",
      params: import_zod.z.object({ id: import_zod.z.string().uuid() }),
      body: assignBodySchema,
      response: {
        200: import_zod.z.object({ status: import_zod.z.string() })
        // Retorna apenas o novo status
      }
    }
  }, async (req, reply) => {
    const { id } = req.params;
    const { targetUserId } = req.body;
    const { sub: userId, cargo } = req.user;
    try {
      const existingCase = await prisma.case.findUnique({ where: { id } });
      if (!existingCase) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
      let updateData = {};
      let logDescricao = "";
      let logAction = import_client2.LogAction.MUDANCA_STATUS;
      if (cargo === import_client2.Cargo.Agente_Social && existingCase.status === import_client2.CaseStatus.AGUARDANDO_ACOLHIDA) {
        if (existingCase.agenteAcolhidaId !== userId) {
          return reply.status(403).send({ message: "Este caso n\xE3o foi atribu\xEDdo a voc\xEA." });
        }
        updateData = { status: import_client2.CaseStatus.EM_ACOLHIDA };
        logDescricao = "Iniciou a Acolhida (Check-in)";
      } else if (cargo === import_client2.Cargo.Gerente && existingCase.status === import_client2.CaseStatus.AGUARDANDO_DISTRIBUICAO) {
        if (!targetUserId) return reply.status(400).send({ message: "Selecione um especialista para assumir o caso." });
        updateData = {
          status: import_client2.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA,
          // Próximo passo: Especialista aceitar
          especialistaPAEFIId: targetUserId
        };
        const targetUser = await prisma.user.findUnique({ where: { id: targetUserId }, select: { nome: true } });
        logAction = import_client2.LogAction.ATRIBUICAO;
        logDescricao = `Distribuiu caso para: ${(targetUser == null ? void 0 : targetUser.nome) || "Especialista"}`;
      } else if (cargo === import_client2.Cargo.Especialista && existingCase.status === import_client2.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA) {
        if (existingCase.especialistaPAEFIId !== userId) {
          return reply.status(403).send({ message: "Este caso n\xE3o foi atribu\xEDdo a voc\xEA." });
        }
        updateData = {
          status: import_client2.CaseStatus.EM_ACOMPANHAMENTO,
          dataInicioPAEFI: /* @__PURE__ */ new Date()
          // Marca o início oficial do acompanhamento
        };
        logDescricao = "Iniciou Acompanhamento PAEFI (Aceite)";
      } else {
        return reply.status(400).send({ message: "A\xE7\xE3o n\xE3o permitida para o status atual ou seu cargo." });
      }
      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.case.update({
          where: { id },
          data: updateData,
          select: { status: true }
          // Retorno leve
        });
        await tx.caseLog.create({
          data: {
            casoId: id,
            autorId: userId,
            acao: logAction,
            descricao: logDescricao,
            valorAnterior: existingCase.status,
            valorNovo: updated.status
          }
        });
        return updated;
      });
      return reply.send(result);
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ message: "Erro ao processar a\xE7\xE3o na fila." });
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  waitingListRoutes
});
