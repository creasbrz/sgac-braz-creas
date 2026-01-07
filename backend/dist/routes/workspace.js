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
async function workspaceRoutes(app) {
  app.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send();
    }
  });
  app.get("/workspace/summary", async (req, reply) => {
    var _a, _b, _c, _d, _e;
    const { sub: userId, cargo } = req.user;
    const todayStart = (0, import_date_fns.startOfDay)(/* @__PURE__ */ new Date());
    const todayEnd = (0, import_date_fns.endOfDay)(/* @__PURE__ */ new Date());
    const thirtyDaysAgo = (0, import_date_fns.subDays)(/* @__PURE__ */ new Date(), 30);
    const ninetyDaysAgo = (0, import_date_fns.subDays)(/* @__PURE__ */ new Date(), 90);
    try {
      const appointments = cargo !== "Auditor" ? await prisma.agendamento.findMany({
        where: { responsavelId: userId, data: { gte: todayStart, lte: todayEnd } },
        include: { caso: { select: { nomeCompleto: true } } },
        orderBy: { data: "asc" }
      }) : [];
      if (cargo === "Gerente") {
        const totalActive = await prisma.case.count({ where: { status: { not: "DESLIGADO" } } });
        const waitingForReception = await prisma.case.count({ where: { status: "AGUARDANDO_ACOLHIDA" } });
        const waitingForDistribution = await prisma.case.count({ where: { status: "AGUARDANDO_DISTRIBUICAO_PAEFI" } });
        const teamLoad = await prisma.user.findMany({
          where: { cargo: { in: ["Especialista", "Agente_Social"] }, ativo: true },
          select: {
            nome: true,
            cargo: true,
            _count: {
              select: {
                // Agente: Em atendimento + Atribuídos na fila
                casosAcolhida: {
                  where: {
                    status: { in: ["EM_ACOLHIDA", "AGUARDANDO_ACOLHIDA"] }
                  }
                },
                // Especialista: Todo o fluxo PAEFI (inclusive fila especializada)
                casosPAEFI: {
                  where: {
                    status: { in: ["EM_ACOLHIDA_ESPECIALIZADA", "EM_ACOMPANHAMENTO_PAEFI", "EM_MONITORAMENTO"] }
                  }
                }
              }
            }
          }
        });
        const violationsRaw = await prisma.case.groupBy({
          by: ["violacao"],
          where: { status: { not: "DESLIGADO" } },
          _count: { violacao: true },
          orderBy: { _count: { violacao: "desc" } },
          take: 5
        });
        return reply.send({
          role: "GERENTE",
          stats: { totalActive, waitingForReception, waitingForDistribution },
          teamLoad: teamLoad.map((t) => {
            var _a2, _b2;
            return {
              nome: t.nome,
              role: t.cargo,
              cases: (((_a2 = t._count) == null ? void 0 : _a2.casosAcolhida) || 0) + (((_b2 = t._count) == null ? void 0 : _b2.casosPAEFI) || 0)
            };
          }),
          topViolations: violationsRaw.filter((v) => v.violacao && v.violacao.trim() !== "").map((v) => ({ label: v.violacao, count: v._count.violacao })),
          appointments
        });
      }
      if (cargo === "Auditor") {
        const incompleteCases = await prisma.case.findMany({
          where: {
            status: { not: "DESLIGADO" },
            OR: [{ cpf: null }, { cpf: "" }, { endereco: null }, { endereco: "" }]
          },
          take: 20,
          select: { id: true, nomeCompleto: true, cpf: true, endereco: true }
        });
        const recentLogs = await prisma.caseLog.findMany({
          where: { acao: { in: ["DESLIGAMENTO", "EXCLUSAO", "MUDANCA_STATUS"] } },
          take: 10,
          orderBy: { createdAt: "desc" },
          include: { autor: { select: { nome: true } } }
        });
        return reply.send({ role: "AUDITOR", incompleteCases, recentLogs });
      }
      const isEspecialista = cargo === "Especialista";
      const caseFilter = isEspecialista ? { especialistaPAEFIId: userId, status: { not: "DESLIGADO" } } : { agenteAcolhidaId: userId, status: { in: ["EM_ACOLHIDA", "AGUARDANDO_ACOLHIDA"] } };
      const myCases = await prisma.case.findMany({
        where: caseFilter,
        orderBy: [
          { pesoUrgencia: "desc" },
          // [ORDENAÇÃO PEDIDA] Urgência primeiro
          { updatedAt: "desc" }
          // Depois atividade recente
        ],
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
          where: { especialistaPAEFIId: userId, status: { not: "DESLIGADO" } },
          _count: { _all: true }
        });
        detailedStats = {
          // Estes números batem com as abas do frontend
          monitoramento: ((_a = stats.find((s) => s.status === "EM_MONITORAMENTO")) == null ? void 0 : _a._count._all) || 0,
          acolhidaEsp: ((_b = stats.find((s) => s.status === "EM_ACOLHIDA_ESPECIALIZADA")) == null ? void 0 : _b._count._all) || 0,
          acompanhamento: ((_c = stats.find((s) => s.status === "EM_ACOMPANHAMENTO_PAEFI")) == null ? void 0 : _c._count._all) || 0
        };
      } else {
        const stats = await prisma.case.groupBy({
          by: ["status"],
          where: { agenteAcolhidaId: userId },
          _count: { _all: true }
        });
        const generalQueue = await prisma.case.count({
          where: { status: "AGUARDANDO_ACOLHIDA", agenteAcolhidaId: null }
        });
        detailedStats = {
          meusAguardando: ((_d = stats.find((s) => s.status === "AGUARDANDO_ACOLHIDA")) == null ? void 0 : _d._count._all) || 0,
          meusEmAtendimento: ((_e = stats.find((s) => s.status === "EM_ACOLHIDA")) == null ? void 0 : _e._count._all) || 0,
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
          if (c.status === "AGUARDANDO_ACOLHIDA" && (0, import_date_fns.differenceInDays)(/* @__PURE__ */ new Date(), dataEntrada) > 2) {
            return { ...c, type: "NOT_STARTED_YET" /* NOT_STARTED_YET */, days: (0, import_date_fns.differenceInDays)(/* @__PURE__ */ new Date(), dataEntrada) };
          }
          if (c.status === "EM_ACOLHIDA" && !lastDate && (0, import_date_fns.differenceInDays)(/* @__PURE__ */ new Date(), dataEntrada) > 5) {
            return { ...c, type: "RECEPTION_DELAY" /* RECEPTION_DELAY */, days: (0, import_date_fns.differenceInDays)(/* @__PURE__ */ new Date(), dataEntrada) };
          }
        }
        return null;
      }).filter(Boolean);
      return reply.send({
        role: cargo.toUpperCase(),
        myCases,
        alerts,
        appointments,
        detailedStats
      });
    } catch (error) {
      console.error("[WORKSPACE_ERROR]", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  workspaceRoutes
});
