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

// src/routes/stats.ts
var stats_exports = {};
__export(stats_exports, {
  statsRoutes: () => statsRoutes
});
module.exports = __toCommonJS(stats_exports);

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var prisma = new import_client.PrismaClient();

// src/routes/stats.ts
var import_date_fns = require("date-fns");
async function statsRoutes(app) {
  app.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app.get("/stats", async (request, reply) => {
    const { cargo } = request.user;
    if (cargo !== "Gerente") {
      return reply.status(403).send({ message: "Acesso negado." });
    }
    try {
      const today = /* @__PURE__ */ new Date();
      const firstDayOfMonth = (0, import_date_fns.startOfMonth)(today);
      const lastDayOfMonth = (0, import_date_fns.endOfMonth)(today);
      const totalCases = await prisma.case.count();
      const acolhidasCount = await prisma.case.count({
        where: {
          status: { in: ["AGUARDANDO_ACOLHIDA", "EM_ACOLHIDA"] }
        }
      });
      const acompanhamentosCount = await prisma.case.count({
        where: { status: "EM_ACOMPANHAMENTO_PAEFI" }
      });
      const newCasesThisMonth = await prisma.case.count({
        where: {
          dataEntrada: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth
          }
        }
      });
      const closedCasesThisMonth = await prisma.case.count({
        where: {
          status: "DESLIGADO",
          dataDesligamento: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth
          }
        }
      });
      const agentWorkload = await prisma.user.findMany({
        where: {
          cargo: "Agente Social",
          ativo: true
        },
        select: {
          nome: true,
          casosDeAcolhida: {
            where: { status: { in: ["AGUARDANDO_ACOLHIDA", "EM_ACOLHIDA"] } }
          }
        }
      });
      const specialistWorkload = await prisma.user.findMany({
        where: {
          cargo: "Especialista",
          ativo: true
        },
        select: {
          nome: true,
          casosDeAcompanhamento: {
            where: { status: "EM_ACOMPANHAMENTO_PAEFI" }
          }
        }
      });
      const workloadByAgent = agentWorkload.map((u) => {
        var _a;
        return {
          name: u.nome,
          value: ((_a = u.casosDeAcolhida) == null ? void 0 : _a.length) ?? 0
        };
      });
      const workloadBySpecialist = specialistWorkload.map((u) => {
        var _a;
        return {
          name: u.nome,
          value: ((_a = u.casosDeAcompanhamento) == null ? void 0 : _a.length) ?? 0
        };
      });
      const productivity = [...workloadByAgent, ...workloadBySpecialist].sort((a, b) => b.value - a.value);
      const urgencyGroups = await prisma.case.groupBy({
        by: ["urgencia"],
        _count: { _all: true },
        where: { status: { not: "DESLIGADO" } }
      });
      const casesByUrgency = urgencyGroups.map((g) => ({ name: g.urgencia, value: g._count._all }));
      const categoryGroups = await prisma.case.groupBy({
        by: ["categoria"],
        _count: { _all: true },
        where: { status: { not: "DESLIGADO" } }
      });
      const casesByCategory = categoryGroups.map((g) => ({ name: g.categoria, value: g._count._all }));
      const violationGroups = await prisma.case.groupBy({
        by: ["violacao"],
        _count: { _all: true },
        where: { status: { not: "DESLIGADO" } }
      });
      const casesByViolation = violationGroups.map((g) => ({ name: g.violacao, value: g._count._all }));
      return reply.status(200).send({
        // Dashboard
        totalCases,
        acolhidasCount,
        acompanhamentosCount,
        newCasesThisMonth,
        closedCasesThisMonth,
        workloadByAgent,
        workloadBySpecialist,
        // Relatórios
        productivity,
        casesByUrgency,
        casesByCategory,
        casesByViolation
      });
    } catch (error) {
      console.error("Erro ao buscar estat\xEDsticas:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
  app.get("/stats/my-agenda", async (request, reply) => {
    const { sub: userId } = request.user;
    try {
      const today = (0, import_date_fns.startOfDay)(/* @__PURE__ */ new Date());
      const cutoffDate = (0, import_date_fns.endOfDay)((0, import_date_fns.addDays)(today, 30));
      const appointments = await prisma.agendamento.findMany({
        where: {
          responsavelId: userId,
          data: {
            gte: today,
            lte: cutoffDate
          }
        },
        orderBy: { data: "asc" },
        take: 5,
        include: {
          caso: {
            select: { id: true, nomeCompleto: true }
          }
        }
      });
      return reply.status(200).send(appointments);
    } catch (error) {
      console.error("Erro ao buscar pr\xF3ximos agendamentos:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  statsRoutes
});
