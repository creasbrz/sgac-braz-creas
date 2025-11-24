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
var import_client2 = require("@prisma/client");
var import_zod = require("zod");
async function statsRoutes(app) {
  app.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app.get("/stats/advanced", async (request, reply) => {
    const { cargo } = request.user;
    const querySchema = import_zod.z.object({
      months: import_zod.z.coerce.number().default(12),
      violacao: import_zod.z.string().optional()
    });
    const { months, violacao } = querySchema.parse(request.query);
    if (cargo !== import_client2.Cargo.Gerente) return reply.status(403).send({ message: "Acesso restrito." });
    try {
      const today = /* @__PURE__ */ new Date();
      const startDate = (0, import_date_fns.startOfMonth)((0, import_date_fns.subMonths)(today, months - 1));
      const whereClause = {
        OR: [
          { dataEntrada: { gte: startDate } },
          { dataDesligamento: { gte: startDate } }
        ]
      };
      if (violacao && violacao !== "all") {
        whereClause.violacao = violacao;
      }
      const cases = await prisma.case.findMany({
        where: whereClause,
        select: {
          id: true,
          dataEntrada: true,
          dataDesligamento: true,
          status: true,
          violacao: true
        }
      });
      const monthlyStats = /* @__PURE__ */ new Map();
      for (let i = 0; i < months; i++) {
        const d = (0, import_date_fns.subMonths)(today, months - 1 - i);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        monthlyStats.set(key, {
          name: d.toLocaleDateString("pt-BR", { month: "short" }).toUpperCase(),
          novos: 0,
          fechados: 0
        });
      }
      const violationCount = {};
      cases.forEach((c) => {
        const inKey = `${c.dataEntrada.getFullYear()}-${c.dataEntrada.getMonth()}`;
        if (monthlyStats.has(inKey)) monthlyStats.get(inKey).novos++;
        if (c.dataDesligamento) {
          const outKey = `${c.dataDesligamento.getFullYear()}-${c.dataDesligamento.getMonth()}`;
          if (monthlyStats.has(outKey)) monthlyStats.get(outKey).fechados++;
        }
        const v = c.violacao || "N\xE3o Informado";
        violationCount[v] = (violationCount[v] || 0) + 1;
      });
      const pieData = Object.entries(violationCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
      const closedCases = cases.filter((c) => c.dataDesligamento);
      const totalDays = closedCases.reduce((acc, c) => {
        return acc + Math.ceil(Math.abs(c.dataDesligamento.getTime() - c.dataEntrada.getTime()) / 864e5);
      }, 0);
      const avgHandlingTime = closedCases.length > 0 ? Math.round(totalDays / closedCases.length) : 0;
      const activeTotal = await prisma.case.count({ where: { status: { not: import_client2.CaseStatus.DESLIGADO } } });
      const insights = [];
      const trendData = Array.from(monthlyStats.values());
      const last = trendData[trendData.length - 1];
      const prev = trendData[trendData.length - 2];
      if (last && prev && prev.novos > 0) {
        const diff = (last.novos - prev.novos) / prev.novos * 100;
        if (diff > 15) insights.push(`\u{1F4C8} Aumento de ${Math.round(diff)}% na demanda.`);
        else if (diff < -15) insights.push(`\u{1F4C9} Queda de ${Math.abs(Math.round(diff))}% na demanda.`);
      }
      if (avgHandlingTime > 120) insights.push(`\u26A0\uFE0F Tempo m\xE9dio alto (${avgHandlingTime} dias).`);
      if (pieData.length > 0) {
        insights.push(`\u{1F50D} Principal demanda: ${pieData[0].name} (${pieData[0].value} casos).`);
      }
      return reply.send({
        trendData,
        avgHandlingTime,
        totalActive: activeTotal,
        insights,
        pieData
        // Agora enviamos os dados reais
      });
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ message: "Erro interno." });
    }
  });
  app.get("/stats/productivity", async (request, reply) => {
    try {
      const users = await prisma.user.findMany({
        where: { ativo: true, cargo: { not: import_client2.Cargo.Gerente } },
        select: {
          id: true,
          nome: true,
          cargo: true,
          _count: {
            select: {
              casosDeAcolhida: { where: { status: { in: [import_client2.CaseStatus.AGUARDANDO_ACOLHIDA, import_client2.CaseStatus.EM_ACOLHIDA] } } },
              casosDeAcompanhamento: { where: { status: import_client2.CaseStatus.EM_ACOMPANHAMENTO_PAEFI } }
            }
          }
        }
      });
      const data = users.map((u) => ({
        name: u.nome.split(" ")[0],
        value: u._count.casosDeAcolhida + u._count.casosDeAcompanhamento,
        role: u.cargo
      })).sort((a, b) => b.value - a.value);
      return reply.send(data);
    } catch (error) {
      return reply.status(500).send([]);
    }
  });
  app.get("/stats/heatmap", async (request, reply) => {
    const querySchema = import_zod.z.object({ months: import_zod.z.coerce.number().default(12) });
    const { months } = querySchema.parse(request.query);
    try {
      const startDate = (0, import_date_fns.subMonths)(/* @__PURE__ */ new Date(), months);
      const logs = await prisma.caseLog.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true }
      });
      const map = /* @__PURE__ */ new Map();
      logs.forEach((l) => {
        const day = (0, import_date_fns.format)(l.createdAt, "yyyy-MM-dd");
        map.set(day, (map.get(day) || 0) + 1);
      });
      const result = Array.from(map.entries()).map(([date, count]) => ({ date, count }));
      return reply.send(result);
    } catch (error) {
      return reply.status(500).send([]);
    }
  });
  app.get("/stats", async (request, reply) => {
    const { cargo, sub: userId } = request.user;
    const today = /* @__PURE__ */ new Date();
    const firstDayOfMonth = (0, import_date_fns.startOfMonth)(today);
    const lastDayOfMonth = (0, import_date_fns.endOfMonth)(today);
    try {
      if (cargo === import_client2.Cargo.Gerente) {
        const [totalCases, acolhidasCount, acompanhamentosCount, newCases, closedCases] = await Promise.all([
          prisma.case.count(),
          prisma.case.count({ where: { status: { in: [import_client2.CaseStatus.AGUARDANDO_ACOLHIDA, import_client2.CaseStatus.EM_ACOLHIDA] } } }),
          prisma.case.count({ where: { status: import_client2.CaseStatus.EM_ACOMPANHAMENTO_PAEFI } }),
          prisma.case.count({ where: { dataEntrada: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
          prisma.case.count({ where: { status: import_client2.CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } })
        ]);
        const [agentWorkload, specialistWorkload] = await Promise.all([
          prisma.user.findMany({
            where: { cargo: import_client2.Cargo.Agente_Social, ativo: true },
            select: { nome: true, casosDeAcolhida: { where: { status: { in: [import_client2.CaseStatus.AGUARDANDO_ACOLHIDA, import_client2.CaseStatus.EM_ACOLHIDA] } } } }
          }),
          prisma.user.findMany({
            where: { cargo: import_client2.Cargo.Especialista, ativo: true },
            select: { nome: true, casosDeAcompanhamento: { where: { status: import_client2.CaseStatus.EM_ACOMPANHAMENTO_PAEFI } } }
          })
        ]);
        const [urgencyGroups, categoryGroups, violationGroups] = await Promise.all([
          prisma.case.groupBy({ by: ["urgencia"], _count: { _all: true }, where: { status: { not: import_client2.CaseStatus.DESLIGADO } } }),
          prisma.case.groupBy({ by: ["categoria"], _count: { _all: true }, where: { status: { not: import_client2.CaseStatus.DESLIGADO } } }),
          prisma.case.groupBy({ by: ["violacao"], _count: { _all: true }, where: { status: { not: import_client2.CaseStatus.DESLIGADO } } })
        ]);
        return reply.send({
          role: "Gerente",
          totalCases,
          acolhidasCount,
          acompanhamentosCount,
          newCasesThisMonth: newCases,
          closedCasesThisMonth: closedCases,
          workloadByAgent: agentWorkload.map((u) => ({ name: u.nome, value: u.casosDeAcolhida.length })),
          workloadBySpecialist: specialistWorkload.map((u) => ({ name: u.nome, value: u.casosDeAcompanhamento.length })),
          casesByUrgency: urgencyGroups.map((g) => ({ name: g.urgencia, value: g._count._all })),
          casesByCategory: categoryGroups.map((g) => ({ name: g.categoria, value: g._count._all })),
          productivity: [...agentWorkload, ...specialistWorkload].map((u) => {
            var _a, _b;
            return { name: u.nome, value: (((_a = u.casosDeAcolhida) == null ? void 0 : _a.length) || 0) + (((_b = u.casosDeAcompanhamento) == null ? void 0 : _b.length) || 0) };
          })
        });
      }
      if (cargo === import_client2.Cargo.Agente_Social) {
        const [myActive, myClosed, myNew] = await Promise.all([
          prisma.case.count({ where: { agenteAcolhidaId: userId, status: { in: [import_client2.CaseStatus.AGUARDANDO_ACOLHIDA, import_client2.CaseStatus.EM_ACOLHIDA] } } }),
          prisma.case.count({ where: { agenteAcolhidaId: userId, status: import_client2.CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
          prisma.case.count({ where: { agenteAcolhidaId: userId, dataEntrada: { gte: firstDayOfMonth, lte: lastDayOfMonth } } })
        ]);
        return reply.send({ role: "Agente Social", myActiveCases: myActive, myClosedMonth: myClosed, myNewCasesMonth: myNew });
      }
      if (cargo === import_client2.Cargo.Especialista) {
        const [myActive, myClosed, myNew] = await Promise.all([
          prisma.case.count({ where: { especialistaPAEFIId: userId, status: import_client2.CaseStatus.EM_ACOMPANHAMENTO_PAEFI } }),
          prisma.case.count({ where: { especialistaPAEFIId: userId, status: import_client2.CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
          prisma.case.count({ where: { especialistaPAEFIId: userId, dataInicioPAEFI: { gte: firstDayOfMonth, lte: lastDayOfMonth } } })
        ]);
        return reply.send({ role: "Especialista", myActiveCases: myActive, myClosedMonth: myClosed, myNewCasesMonth: myNew });
      }
      return reply.status(200).send({ message: "Sem dados." });
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ message: "Erro no servidor." });
    }
  });
  app.get("/stats/my-agenda", async (request, reply) => {
    const { sub: userId } = request.user;
    try {
      const start = (0, import_date_fns.startOfDay)(/* @__PURE__ */ new Date());
      const end = (0, import_date_fns.endOfDay)((0, import_date_fns.addDays)(start, 30));
      const appointments = await prisma.agendamento.findMany({
        where: { responsavelId: userId, data: { gte: start, lte: end } },
        orderBy: { data: "asc" },
        take: 5,
        include: { caso: { select: { id: true, nomeCompleto: true } } }
      });
      return reply.send(appointments);
    } catch {
      return reply.status(500).send({ message: "Erro ao buscar agenda." });
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  statsRoutes
});
