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

// src/routes/workspace.ts
var workspace_exports = {};
__export(workspace_exports, {
  workspaceRoutes: () => workspaceRoutes
});
module.exports = __toCommonJS(workspace_exports);
var import_zod = require("zod");

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var globalForPrisma = global;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient({
  log: ["error"]
  // Reduzi logs para limpar o terminal, use ['query'] para debug
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/workspace.ts
var import_date_fns = require("date-fns");
var import_client2 = require("@prisma/client");
var CaseAlertType = /* @__PURE__ */ ((CaseAlertType2) => {
  CaseAlertType2["PAF_NOT_STARTED"] = "PAF_NOT_STARTED";
  CaseAlertType2["PAF_STALLED"] = "PAF_STALLED";
  CaseAlertType2["PAF_REVIEW_OVERDUE"] = "PAF_REVIEW_OVERDUE";
  CaseAlertType2["RECEPTION_DELAY"] = "RECEPTION_DELAY";
  CaseAlertType2["NOT_STARTED_YET"] = "NOT_STARTED_YET";
  return CaseAlertType2;
})(CaseAlertType || {});
var caseSummarySchema = import_zod.z.object({
  id: import_zod.z.string(),
  nomeCompleto: import_zod.z.string(),
  status: import_zod.z.string(),
  urgencia: import_zod.z.string(),
  violacao: import_zod.z.string().nullable(),
  updatedAt: import_zod.z.date(),
  dataEntrada: import_zod.z.date()
});
var appointmentSchema = import_zod.z.object({
  id: import_zod.z.string(),
  titulo: import_zod.z.string(),
  data: import_zod.z.date(),
  caso: import_zod.z.object({ nomeCompleto: import_zod.z.string() }).optional()
});
var alertSchema = caseSummarySchema.extend({
  type: import_zod.z.nativeEnum(CaseAlertType),
  days: import_zod.z.number()
});
var teamLoadSchema = import_zod.z.object({
  nome: import_zod.z.string(),
  role: import_zod.z.string(),
  cases: import_zod.z.number()
});
var logSchema = import_zod.z.object({
  id: import_zod.z.string(),
  acao: import_zod.z.string(),
  createdAt: import_zod.z.date(),
  autor: import_zod.z.object({ nome: import_zod.z.string() })
});
var workspaceResponseSchema = import_zod.z.object({
  role: import_zod.z.string(),
  // Comuns
  appointments: import_zod.z.array(appointmentSchema).optional(),
  // Gerente
  stats: import_zod.z.object({
    totalActive: import_zod.z.number(),
    waitingForReception: import_zod.z.number(),
    waitingForDistribution: import_zod.z.number()
  }).optional(),
  teamLoad: import_zod.z.array(teamLoadSchema).optional(),
  topViolations: import_zod.z.array(import_zod.z.object({ label: import_zod.z.string(), count: import_zod.z.number() })).optional(),
  // Auditor
  incompleteCases: import_zod.z.array(import_zod.z.object({
    id: import_zod.z.string(),
    nomeCompleto: import_zod.z.string(),
    cpf: import_zod.z.string().nullable(),
    endereco: import_zod.z.string().nullable()
  })).optional(),
  recentLogs: import_zod.z.array(logSchema).optional(),
  // Operacional (Agente/Especialista)
  myCases: import_zod.z.array(caseSummarySchema).optional(),
  alerts: import_zod.z.array(alertSchema).optional(),
  detailedStats: import_zod.z.object({
    // Especialista
    monitoramento: import_zod.z.number().optional(),
    acolhidaEsp: import_zod.z.number().optional(),
    acompanhamento: import_zod.z.number().optional(),
    // Agente
    meusAguardando: import_zod.z.number().optional(),
    meusEmAtendimento: import_zod.z.number().optional(),
    filaGeral: import_zod.z.number().optional()
  }).optional()
});
async function workspaceRoutes(app) {
  const server = app.withTypeProvider();
  server.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado" });
    }
  });
  server.get("/workspace/summary", {
    schema: {
      tags: ["Workspace"],
      summary: "Dados consolidados para a tela inicial (Dashboard Pessoal)",
      response: {
        200: workspaceResponseSchema
      }
    }
  }, async (req, reply) => {
    var _a, _b, _c, _d, _e;
    const { sub: userId, cargo } = req.user;
    const todayStart = (0, import_date_fns.startOfDay)(/* @__PURE__ */ new Date());
    const todayEnd = (0, import_date_fns.endOfDay)(/* @__PURE__ */ new Date());
    const thirtyDaysAgo = (0, import_date_fns.subDays)(/* @__PURE__ */ new Date(), 30);
    const ninetyDaysAgo = (0, import_date_fns.subDays)(/* @__PURE__ */ new Date(), 90);
    try {
      const appointments = cargo !== import_client2.Cargo.Auditor ? await prisma.agendamento.findMany({
        where: { responsavelId: userId, data: { gte: todayStart, lte: todayEnd } },
        include: { caso: { select: { nomeCompleto: true } } },
        orderBy: { data: "asc" }
      }) : [];
      if (cargo === import_client2.Cargo.Gerente) {
        const [totalActive, waitingForReception, waitingForDistribution] = await Promise.all([
          prisma.case.count({ where: { status: { not: import_client2.CaseStatus.DESLIGADO } } }),
          prisma.case.count({ where: { status: import_client2.CaseStatus.AGUARDANDO_ACOLHIDA } }),
          // PAEFI não distribuído
          prisma.case.count({ where: { status: import_client2.CaseStatus.AGUARDANDO_DISTRIBUICAO_PAEFI } })
        ]);
        const teamLoadRaw = await prisma.user.findMany({
          where: { cargo: { in: [import_client2.Cargo.Especialista, import_client2.Cargo.Agente_Social] }, ativo: true },
          select: {
            nome: true,
            cargo: true,
            _count: {
              select: {
                casosAcolhida: {
                  where: { status: { in: [import_client2.CaseStatus.EM_ACOLHIDA, import_client2.CaseStatus.AGUARDANDO_ACOLHIDA] } }
                },
                casosPAEFI: {
                  where: {
                    // [ATUALIZAÇÃO] Enum corrigido para EM_ACOMPANHAMENTO
                    status: { in: [import_client2.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, import_client2.CaseStatus.EM_ACOMPANHAMENTO, import_client2.CaseStatus.EM_MONITORAMENTO] }
                  }
                }
              }
            }
          }
        });
        const violationsRaw = await prisma.case.groupBy({
          by: ["violacao"],
          where: { status: { not: import_client2.CaseStatus.DESLIGADO } },
          _count: { violacao: true },
          orderBy: { _count: { violacao: "desc" } },
          take: 5
        });
        return reply.send({
          role: "GERENTE",
          appointments,
          stats: { totalActive, waitingForReception, waitingForDistribution },
          teamLoad: teamLoadRaw.map((t) => {
            var _a2, _b2;
            return {
              nome: t.nome,
              role: t.cargo,
              cases: (((_a2 = t._count) == null ? void 0 : _a2.casosAcolhida) || 0) + (((_b2 = t._count) == null ? void 0 : _b2.casosPAEFI) || 0)
            };
          }),
          topViolations: violationsRaw.filter((v) => v.violacao && v.violacao.trim() !== "").map((v) => ({ label: v.violacao, count: v._count.violacao }))
        });
      }
      if (cargo === import_client2.Cargo.Auditor) {
        const incompleteCases = await prisma.case.findMany({
          where: {
            status: { not: import_client2.CaseStatus.DESLIGADO },
            OR: [{ cpf: null }, { cpf: "" }, { endereco: null }, { endereco: "" }]
          },
          take: 20,
          select: { id: true, nomeCompleto: true, cpf: true, endereco: true }
        });
        const recentLogs = await prisma.caseLog.findMany({
          where: { acao: { in: [import_client2.LogAction.DESLIGAMENTO, import_client2.LogAction.OUTRO, import_client2.LogAction.MUDANCA_STATUS] } },
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            // Select explícito para bater com logSchema
            id: true,
            acao: true,
            createdAt: true,
            autor: { select: { nome: true } }
          }
        });
        const formattedLogs = recentLogs.map((log) => ({
          ...log,
          acao: log.acao.toString()
        }));
        return reply.send({ role: "AUDITOR", incompleteCases, recentLogs: formattedLogs });
      }
      const isEspecialista = cargo === import_client2.Cargo.Especialista;
      const caseFilter = isEspecialista ? { especialistaPAEFIId: userId, status: { not: import_client2.CaseStatus.DESLIGADO } } : { agenteAcolhidaId: userId, status: { in: [import_client2.CaseStatus.EM_ACOLHIDA, import_client2.CaseStatus.AGUARDANDO_ACOLHIDA] } };
      const myCases = await prisma.case.findMany({
        where: caseFilter,
        orderBy: [{ pesoUrgencia: "desc" }, { updatedAt: "desc" }],
        select: {
          id: true,
          nomeCompleto: true,
          status: true,
          urgencia: true,
          violacao: true,
          updatedAt: true,
          dataEntrada: true
        }
      });
      let detailedStats = {};
      if (isEspecialista) {
        const stats = await prisma.case.groupBy({
          by: ["status"],
          where: { especialistaPAEFIId: userId, status: { not: import_client2.CaseStatus.DESLIGADO } },
          _count: { _all: true }
        });
        detailedStats = {
          monitoramento: ((_a = stats.find((s) => s.status === import_client2.CaseStatus.EM_MONITORAMENTO)) == null ? void 0 : _a._count._all) || 0,
          acolhidaEsp: ((_b = stats.find((s) => s.status === import_client2.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA)) == null ? void 0 : _b._count._all) || 0,
          // [ATUALIZAÇÃO] Enum corrigido
          acompanhamento: ((_c = stats.find((s) => s.status === import_client2.CaseStatus.EM_ACOMPANHAMENTO)) == null ? void 0 : _c._count._all) || 0
        };
      } else {
        const stats = await prisma.case.groupBy({
          by: ["status"],
          where: { agenteAcolhidaId: userId },
          _count: { _all: true }
        });
        const generalQueue = await prisma.case.count({
          where: { status: import_client2.CaseStatus.AGUARDANDO_ACOLHIDA, agenteAcolhidaId: null }
        });
        detailedStats = {
          meusAguardando: ((_d = stats.find((s) => s.status === import_client2.CaseStatus.AGUARDANDO_ACOLHIDA)) == null ? void 0 : _d._count._all) || 0,
          meusEmAtendimento: ((_e = stats.find((s) => s.status === import_client2.CaseStatus.EM_ACOLHIDA)) == null ? void 0 : _e._count._all) || 0,
          filaGeral: generalQueue
        };
      }
      const caseIds = myCases.map((c) => c.id);
      let evoMap = /* @__PURE__ */ new Map();
      if (caseIds.length > 0) {
        const lastEvolutions = await prisma.evolucao.findMany({
          where: { casoId: { in: caseIds } },
          orderBy: { createdAt: "desc" },
          distinct: ["casoId"],
          select: { casoId: true, createdAt: true }
        });
        evoMap = new Map(lastEvolutions.map((e) => [e.casoId, e.createdAt]));
      }
      const alerts = myCases.map((c) => {
        const lastDate = evoMap.get(c.id);
        const dataEntrada = c.dataEntrada ? new Date(c.dataEntrada) : /* @__PURE__ */ new Date();
        if (isEspecialista) {
          if (!lastDate) return { ...c, type: "PAF_NOT_STARTED" /* PAF_NOT_STARTED */, days: 0 };
          if ((0, import_date_fns.isValid)(new Date(lastDate))) {
            if (lastDate < thirtyDaysAgo && lastDate >= ninetyDaysAgo)
              return { ...c, type: "PAF_STALLED" /* PAF_STALLED */, days: (0, import_date_fns.differenceInDays)(/* @__PURE__ */ new Date(), lastDate) };
            if (lastDate < ninetyDaysAgo)
              return { ...c, type: "PAF_REVIEW_OVERDUE" /* PAF_REVIEW_OVERDUE */, days: (0, import_date_fns.differenceInDays)(/* @__PURE__ */ new Date(), lastDate) };
          }
        } else {
          if (c.status === import_client2.CaseStatus.AGUARDANDO_ACOLHIDA && (0, import_date_fns.differenceInDays)(/* @__PURE__ */ new Date(), dataEntrada) > 2) {
            return { ...c, type: "NOT_STARTED_YET" /* NOT_STARTED_YET */, days: (0, import_date_fns.differenceInDays)(/* @__PURE__ */ new Date(), dataEntrada) };
          }
          if (c.status === import_client2.CaseStatus.EM_ACOLHIDA && !lastDate && (0, import_date_fns.differenceInDays)(/* @__PURE__ */ new Date(), dataEntrada) > 5) {
            return { ...c, type: "RECEPTION_DELAY" /* RECEPTION_DELAY */, days: (0, import_date_fns.differenceInDays)(/* @__PURE__ */ new Date(), dataEntrada) };
          }
        }
        return null;
      }).filter(Boolean);
      return reply.send({
        role: cargo.toUpperCase(),
        appointments,
        myCases,
        alerts,
        // Cast simples para satisfazer o union do alertSchema
        detailedStats
      });
    } catch (error) {
      console.error("[WORKSPACE_ERROR]", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
  server.get("/workspace/undistributed", {
    schema: {
      tags: ["Workspace"],
      summary: "Listar casos aguardando distribui\xE7\xE3o",
      response: {
        200: import_zod.z.array(import_zod.z.object({
          id: import_zod.z.string(),
          nomeCompleto: import_zod.z.string(),
          status: import_zod.z.string(),
          urgencia: import_zod.z.string(),
          dataEntrada: import_zod.z.date()
        }))
      }
    }
  }, async (req, reply) => {
    const cases = await prisma.case.findMany({
      where: {
        OR: [
          // Casos novos sem agente
          { status: import_client2.CaseStatus.AGUARDANDO_ACOLHIDA, agenteAcolhidaId: null },
          // Casos PAEFI sem especialista
          { status: import_client2.CaseStatus.AGUARDANDO_DISTRIBUICAO_PAEFI, especialistaPAEFIId: null }
        ]
      },
      orderBy: { dataEntrada: "asc" },
      select: {
        id: true,
        nomeCompleto: true,
        status: true,
        urgencia: true,
        dataEntrada: true
      }
    });
    return reply.send(cases);
  });
  server.patch("/workspace/distribute", {
    schema: {
      tags: ["Workspace"],
      summary: "Atribuir caso a um t\xE9cnico",
      body: import_zod.z.object({
        caseId: import_zod.z.string().uuid(),
        targetUserId: import_zod.z.string().uuid(),
        roleType: import_zod.z.enum(["AGENTE", "ESPECIALISTA"])
      })
    }
  }, async (req, reply) => {
    const { caseId, targetUserId, roleType } = req.body;
    const managerId = req.user.sub;
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, nome: true, cargo: true, ativo: true }
    });
    if (!targetUser || !targetUser.ativo) {
      return reply.status(400).send({ message: "Usu\xE1rio inv\xE1lido ou inativo." });
    }
    const dataToUpdate = {};
    if (roleType === "AGENTE") {
      if (targetUser.cargo !== import_client2.Cargo.Agente_Social) return reply.status(400).send({ message: "Usu\xE1rio n\xE3o \xE9 Agente Social." });
      dataToUpdate.agenteAcolhidaId = targetUserId;
      dataToUpdate.status = import_client2.CaseStatus.EM_ACOLHIDA;
    } else {
      if (targetUser.cargo !== import_client2.Cargo.Especialista) return reply.status(400).send({ message: "Usu\xE1rio n\xE3o \xE9 Especialista." });
      dataToUpdate.especialistaPAEFIId = targetUserId;
      dataToUpdate.status = import_client2.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA;
    }
    await prisma.$transaction(async (tx) => {
      await tx.case.update({ where: { id: caseId }, data: dataToUpdate });
      await tx.caseLog.create({
        data: {
          casoId: caseId,
          autorId: managerId,
          acao: import_client2.LogAction.ATRIBUICAO,
          descricao: `Caso atribu\xEDdo para ${targetUser.nome} (${roleType})`
        }
      });
    });
    return reply.send({ message: "Caso distribu\xEDdo com sucesso." });
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  workspaceRoutes
});
