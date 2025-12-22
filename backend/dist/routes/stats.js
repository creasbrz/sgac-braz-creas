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
var import_locale = require("date-fns/locale");
var import_client2 = require("@prisma/client");
var import_zod = require("zod");

// src/lib/cache.ts
var CacheService = class _CacheService {
  static instance;
  store = /* @__PURE__ */ new Map();
  constructor() {
  }
  static getInstance() {
    if (!_CacheService.instance) {
      _CacheService.instance = new _CacheService();
    }
    return _CacheService.instance;
  }
  /**
   * Recupera um valor do cache se não tiver expirado.
   * @param key Chave única
   * @param ttlMs Tempo de vida em milissegundos (Padrão: 5 min)
   */
  get(key, ttlMs = 5 * 60 * 1e3) {
    const entry = this.store.get(key);
    if (!entry) return null;
    const now = Date.now();
    if (now - entry.timestamp > ttlMs) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }
  /**
   * Salva um valor no cache.
   */
  set(key, data) {
    this.store.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  /**
   * Invalida chaves que começam com um prefixo.
   * Útil para limpar "stats_*" quando um novo caso é criado.
   */
  invalidate(keyPrefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(keyPrefix)) {
        this.store.delete(key);
      }
    }
  }
  clearAll() {
    this.store.clear();
  }
};
var cache = CacheService.getInstance();

// src/routes/stats.ts
var calculateUrgencyWeight = (urgencia) => {
  const term = urgencia ? urgencia.trim() : "";
  if (["Convive com agressor", "Idoso 80+", "Primeira inf\xE2ncia", "Risco de morte"].includes(term)) return 4;
  if (["Risco de reincid\xEAncia", "Sofre amea\xE7a", "Risco de desabrigo", "Crian\xE7a/Adolescente"].includes(term)) return 3;
  if (["PCD", "Idoso", "Interna\xE7\xE3o", "Acolhimento", "Gestante/Lactante"].includes(term)) return 2;
  return 1;
};
async function statsRoutes(app) {
  app.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app.get("/stats", async (request, reply) => {
    const { cargo, sub: userId } = request.user;
    if (cargo === import_client2.Cargo.Gerente) {
      const cacheKey = "manager_stats_main";
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        reply.header("X-Cache", "HIT");
        return reply.send(cachedData);
      }
      const today2 = /* @__PURE__ */ new Date();
      const firstDayOfMonth2 = (0, import_date_fns.startOfMonth)(today2);
      const lastDayOfMonth2 = (0, import_date_fns.endOfMonth)(today2);
      try {
        const [
          totalCases,
          acolhidasCount,
          acompanhamentosCount,
          monitoringCount,
          newCases,
          closedCases,
          workloadAgent,
          workloadSpec,
          urgencyGroups,
          categoryGroups
        ] = await Promise.all([
          prisma.case.count(),
          prisma.case.count({ where: { status: { in: [import_client2.CaseStatus.AGUARDANDO_ACOLHIDA, import_client2.CaseStatus.EM_ACOLHIDA] } } }),
          prisma.case.count({ where: { status: { in: [import_client2.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, import_client2.CaseStatus.EM_ACOMPANHAMENTO_PAEFI] } } }),
          prisma.case.count({ where: { status: import_client2.CaseStatus.EM_MONITORAMENTO } }),
          prisma.case.count({ where: { dataEntrada: { gte: firstDayOfMonth2, lte: lastDayOfMonth2 } } }),
          prisma.case.count({ where: { status: import_client2.CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth2, lte: lastDayOfMonth2 } } }),
          prisma.case.groupBy({
            by: ["agenteAcolhidaId"],
            where: { status: { in: [import_client2.CaseStatus.AGUARDANDO_ACOLHIDA, import_client2.CaseStatus.EM_ACOLHIDA] }, agenteAcolhidaId: { not: null } },
            _count: { _all: true }
          }),
          prisma.case.groupBy({
            by: ["especialistaPAEFIId"],
            where: { status: { in: [import_client2.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, import_client2.CaseStatus.EM_ACOMPANHAMENTO_PAEFI] }, especialistaPAEFIId: { not: null } },
            _count: { _all: true }
          }),
          prisma.case.groupBy({ by: ["urgencia"], _count: { _all: true }, where: { status: { not: import_client2.CaseStatus.DESLIGADO } } }),
          prisma.case.groupBy({ by: ["categoria"], _count: { _all: true }, where: { status: { not: import_client2.CaseStatus.DESLIGADO } } })
        ]);
        const userIds = [
          .../* @__PURE__ */ new Set([
            ...workloadAgent.map((w) => w.agenteAcolhidaId),
            ...workloadSpec.map((w) => w.especialistaPAEFIId)
          ])
        ].filter((id) => id !== null);
        const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, nome: true } });
        const userMap = new Map(users.map((u) => [u.id, u.nome]));
        const result = {
          role: "Gerente",
          totalCases,
          acolhidasCount,
          acompanhamentosCount,
          monitoringCount,
          newCasesThisMonth: newCases,
          closedCasesThisMonth: closedCases,
          workloadByAgent: workloadAgent.map((w) => ({ name: userMap.get(w.agenteAcolhidaId) || "Desc.", value: w._count._all })),
          workloadBySpecialist: workloadSpec.map((w) => ({ name: userMap.get(w.especialistaPAEFIId) || "Desc.", value: w._count._all })),
          casesByUrgency: urgencyGroups.map((g) => ({ name: g.urgencia, value: g._count._all })),
          casesByCategory: categoryGroups.map((g) => ({ name: g.categoria, value: g._count._all })),
          productivity: [],
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
        };
        cache.set(cacheKey, result);
        reply.header("X-Cache", "MISS");
        return reply.send(result);
      } catch (error) {
        console.error("Erro stats:", error);
        return reply.status(500).send({ message: "Erro ao processar dados." });
      }
    }
    const today = /* @__PURE__ */ new Date();
    const firstDayOfMonth = (0, import_date_fns.startOfMonth)(today);
    const lastDayOfMonth = (0, import_date_fns.endOfMonth)(today);
    try {
      if (cargo === import_client2.Cargo.Agente_Social) {
        const [myActive, myClosed, myNew] = await Promise.all([
          prisma.case.count({ where: { agenteAcolhidaId: userId, status: { in: [import_client2.CaseStatus.AGUARDANDO_ACOLHIDA, import_client2.CaseStatus.EM_ACOLHIDA] } } }),
          prisma.case.count({ where: { agenteAcolhidaId: userId, status: import_client2.CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
          prisma.case.count({ where: { agenteAcolhidaId: userId, dataEntrada: { gte: firstDayOfMonth, lte: lastDayOfMonth } } })
        ]);
        return reply.send({ role: "Agente_Social", myActiveCases: myActive, myClosedMonth: myClosed, myNewCasesMonth: myNew });
      }
      if (cargo === import_client2.Cargo.Especialista) {
        const [myActive, myClosed, myNew] = await Promise.all([
          prisma.case.count({ where: { especialistaPAEFIId: userId, status: { in: [import_client2.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, import_client2.CaseStatus.EM_ACOMPANHAMENTO_PAEFI, import_client2.CaseStatus.EM_MONITORAMENTO] } } }),
          prisma.case.count({ where: { especialistaPAEFIId: userId, status: import_client2.CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
          prisma.case.count({ where: { especialistaPAEFIId: userId, dataInicioPAEFI: { gte: firstDayOfMonth, lte: lastDayOfMonth } } })
        ]);
        return reply.send({ role: "Especialista", myActiveCases: myActive, myClosedMonth: myClosed, myNewCasesMonth: myNew });
      }
      return reply.status(200).send({ message: "Sem dados." });
    } catch (error) {
      return reply.status(500).send({ message: "Erro interno." });
    }
  });
  app.get("/stats/productivity", async (request, reply) => {
    const querySchema = import_zod.z.object({
      mode: import_zod.z.enum(["workload", "performance"]).default("workload"),
      months: import_zod.z.coerce.number().default(1)
    });
    const { mode, months } = querySchema.parse(request.query);
    try {
      const users = await prisma.user.findMany({
        where: { ativo: true, cargo: { not: import_client2.Cargo.Gerente } },
        select: { id: true, nome: true, cargo: true }
      });
      if (mode === "performance") {
        const startDate = (0, import_date_fns.subMonths)(/* @__PURE__ */ new Date(), months);
        const safeActions = [
          import_client2.LogAction.CRIACAO,
          import_client2.LogAction.MUDANCA_STATUS,
          import_client2.LogAction.DESLIGAMENTO,
          import_client2.LogAction.EVOLUCAO,
          import_client2.LogAction.OUTRO,
          // @ts-ignore - Ignora erro de TS se ATRIBUICAO não existir no types ainda
          import_client2.LogAction.ATRIBUICAO
        ].filter(Boolean);
        const activityCounts = await prisma.caseLog.groupBy({
          by: ["autorId"],
          where: {
            createdAt: { gte: startDate },
            acao: { in: safeActions }
          },
          _count: { _all: true }
        });
        const data2 = users.map((u) => {
          const stats = activityCounts.find((a) => a.autorId === u.id);
          return {
            name: u.nome.split(" ")[0],
            value: stats ? stats._count._all : 0,
            role: u.cargo
          };
        }).sort((a, b) => b.value - a.value);
        return reply.send(data2);
      }
      const specialistStats = await prisma.case.groupBy({
        by: ["especialistaPAEFIId", "status"],
        where: {
          especialistaPAEFIId: { in: users.map((u) => u.id) },
          status: { in: [import_client2.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, import_client2.CaseStatus.EM_ACOMPANHAMENTO_PAEFI, import_client2.CaseStatus.EM_MONITORAMENTO] }
        },
        _count: { _all: true }
      });
      const agentStats = await prisma.case.groupBy({
        by: ["agenteAcolhidaId", "status"],
        where: {
          agenteAcolhidaId: { in: users.map((u) => u.id) },
          status: { in: [import_client2.CaseStatus.AGUARDANDO_ACOLHIDA, import_client2.CaseStatus.EM_ACOLHIDA] }
        },
        _count: { _all: true }
      });
      const data = users.map((u) => {
        let active = 0;
        let monitoring = 0;
        if (u.cargo === import_client2.Cargo.Especialista) {
          const stats = specialistStats.filter((s) => s.especialistaPAEFIId === u.id);
          active = stats.filter((s) => s.status !== import_client2.CaseStatus.EM_MONITORAMENTO).reduce((acc, curr) => acc + curr._count._all, 0);
          monitoring = stats.filter((s) => s.status === import_client2.CaseStatus.EM_MONITORAMENTO).reduce((acc, curr) => acc + curr._count._all, 0);
        } else if (u.cargo === import_client2.Cargo.Agente_Social) {
          const stats = agentStats.filter((s) => s.agenteAcolhidaId === u.id);
          active = stats.reduce((acc, curr) => acc + curr._count._all, 0);
        }
        return {
          id: u.id,
          name: u.nome,
          role: u.cargo,
          active,
          monitoring,
          totalLoad: active + monitoring * 0.2
        };
      }).sort((a, b) => b.totalLoad - a.totalLoad);
      return reply.send(data);
    } catch (error) {
      console.error("Erro em /stats/productivity:", error);
      return reply.status(500).send([]);
    }
  });
  app.get("/stats/vigilancia", async (request, reply) => {
    const { cargo } = request.user;
    if (!["Gerente", "Especialista"].includes(cargo)) return reply.status(403).send({ message: "Acesso restrito." });
    try {
      const today = /* @__PURE__ */ new Date();
      const sixMonthsAgo = (0, import_date_fns.subMonths)(today, 6);
      const allCases = await prisma.case.findMany({
        where: { OR: [{ dataEntrada: { gte: sixMonthsAgo } }, { dataDesligamento: { gte: sixMonthsAgo } }] },
        select: { dataEntrada: true, dataDesligamento: true, dataInicioPAEFI: true, status: true, id: true, urgencia: true }
      });
      const monthsMap = /* @__PURE__ */ new Map();
      for (let i = 5; i >= 0; i--) {
        const d = (0, import_date_fns.subMonths)(today, i);
        const key = (0, import_date_fns.format)(d, "yyyy-MM");
        const label = (0, import_date_fns.format)(d, "MMM/yy", { locale: import_locale.ptBR });
        monthsMap.set(key, { name: label.charAt(0).toUpperCase() + label.slice(1), novos: 0, desligados: 0 });
      }
      allCases.forEach((c) => {
        const entryKey = (0, import_date_fns.format)(c.dataEntrada, "yyyy-MM");
        const exitKey = c.dataDesligamento ? (0, import_date_fns.format)(c.dataDesligamento, "yyyy-MM") : null;
        if (monthsMap.has(entryKey)) monthsMap.get(entryKey).novos++;
        if (exitKey && monthsMap.has(exitKey)) monthsMap.get(exitKey).desligados++;
      });
      const evolutionData = Array.from(monthsMap.values());
      const violations = await prisma.case.groupBy({
        by: ["violacao"],
        _count: { _all: true },
        where: { status: { not: import_client2.CaseStatus.DESLIGADO } }
      });
      const violationData = violations.map((v) => ({ name: v.violacao, value: v._count._all })).sort((a, b) => b.value - a.value);
      const urgencies = await prisma.case.groupBy({
        by: ["urgencia"],
        _count: { _all: true },
        where: { status: { not: import_client2.CaseStatus.DESLIGADO } }
      });
      const urgencyData = urgencies.map((u) => ({
        name: u.urgencia,
        value: u._count._all,
        weight: calculateUrgencyWeight(u.urgencia)
      })).sort((a, b) => b.weight - a.weight);
      const origins = await prisma.case.groupBy({
        by: ["orgaoDemandante"],
        _count: { _all: true },
        where: { status: { not: import_client2.CaseStatus.DESLIGADO } },
        orderBy: { _count: { orgaoDemandante: "desc" } },
        take: 10
      });
      const originData = origins.map((o) => ({ name: o.orgaoDemandante, value: o._count._all }));
      const referrals = await prisma.encaminhamento.groupBy({
        by: ["instituicao"],
        _count: { _all: true },
        orderBy: { _count: { instituicao: "desc" } },
        take: 10
      });
      const networkData = referrals.map((r) => ({ name: r.instituicao, value: r._count._all }));
      const benefits = await prisma.serviceDeliverable.groupBy({
        by: ["tipo"],
        _count: { _all: true },
        orderBy: { _count: { tipo: "desc" } }
      });
      const benefitsData = benefits.map((b) => ({ name: b.tipo, value: b._count._all }));
      const groupCount = await prisma.groupActivity.count({ where: { dataRealizacao: { gte: sixMonthsAgo } } });
      const participantsCount = await prisma.groupAttendance.count({ where: { presente: true, grupo: { dataRealizacao: { gte: sixMonthsAgo } } } });
      const collectiveData = { totalGroups: groupCount, totalParticipants: participantsCount, avgAttendance: groupCount > 0 ? Math.round(participantsCount / groupCount) : 0 };
      const closedCases = allCases.filter((c) => c.dataDesligamento && c.dataEntrada);
      const totalDaysOpen = closedCases.reduce((acc, c) => {
        const diff = Math.abs(c.dataDesligamento.getTime() - c.dataEntrada.getTime());
        return acc + Math.ceil(diff / (1e3 * 60 * 60 * 24));
      }, 0);
      const avgPermanence = closedCases.length ? Math.round(totalDaysOpen / closedCases.length) : 0;
      const paefiCases = allCases.filter((c) => c.dataInicioPAEFI && c.dataEntrada);
      const totalWaitDays = paefiCases.reduce((acc, c) => {
        const diff = Math.abs(c.dataInicioPAEFI.getTime() - c.dataEntrada.getTime());
        return acc + Math.ceil(diff / (1e3 * 60 * 60 * 24));
      }, 0);
      const avgWaitTime = paefiCases.length ? Math.round(totalWaitDays / paefiCases.length) : 0;
      const efficiencyData = {
        avgPermanence,
        avgWaitTime,
        totalClosed: closedCases.length,
        retentionRate: Math.round((1 - closedCases.length / (allCases.length || 1)) * 100)
      };
      const demographicsRaw = await prisma.case.findMany({
        where: { status: { not: import_client2.CaseStatus.DESLIGADO } },
        select: { nascimento: true, sexo: true, id: true, urgencia: true, violacao: true, categoria: true }
      });
      const demographics = {
        sexo: { Masculino: 0, Feminino: 0, Outro: 0 },
        etaria: { "0-11 (Crian\xE7a)": 0, "12-17 (Adolescente)": 0, "18-59 (Adulto)": 0, "60+ (Idoso)": 0 }
      };
      demographicsRaw.forEach((c) => {
        if (c.sexo === "Masculino") demographics.sexo.Masculino++;
        else if (c.sexo === "Feminino") demographics.sexo.Feminino++;
        else demographics.sexo.Outro++;
        const age = (/* @__PURE__ */ new Date()).getFullYear() - c.nascimento.getFullYear();
        if (age < 12) demographics.etaria["0-11 (Crian\xE7a)"]++;
        else if (age < 18) demographics.etaria["12-17 (Adolescente)"]++;
        else if (age < 60) demographics.etaria["18-59 (Adulto)"]++;
        else demographics.etaria["60+ (Idoso)"]++;
      });
      const ageData = Object.entries(demographics.etaria).map(([name, value]) => ({ name, value }));
      const sexData = Object.entries(demographics.sexo).map(([name, value]) => ({ name, value }));
      const mapData = demographicsRaw.map((c) => {
        const pseudoRandom = c.id.charCodeAt(0) + c.id.charCodeAt(c.id.length - 1);
        const latOffset = (pseudoRandom % 100 - 50) / 4e3;
        const lngOffset = (pseudoRandom % 100 - 50) / 4e3;
        return {
          id: c.id,
          lat: -15.668 + latOffset,
          lng: -48.201 + lngOffset,
          intensity: calculateUrgencyWeight(c.urgencia),
          label: c.urgencia,
          violacao: c.violacao || "N\xE3o Informado",
          categoria: c.categoria || "N\xE3o Informado"
        };
      });
      return reply.send({ evolutionData, violationData, urgencyData, originData, collectiveData, ageData, sexData, mapData, networkData, benefitsData, efficiencyData });
    } catch (error) {
      console.error("Erro vigil\xE2ncia:", error);
      return reply.status(500).send({ message: "Erro de vigil\xE2ncia." });
    }
  });
  app.get("/stats/advanced", async (request, reply) => {
    const { cargo } = request.user;
    const querySchema = import_zod.z.object({ months: import_zod.z.coerce.number().default(12), violacao: import_zod.z.string().optional() });
    const { months, violacao } = querySchema.parse(request.query);
    if (cargo !== import_client2.Cargo.Gerente) return reply.status(403).send({ message: "Acesso restrito." });
    try {
      const today = /* @__PURE__ */ new Date();
      const startDate = (0, import_date_fns.startOfMonth)((0, import_date_fns.subMonths)(today, months - 1));
      const whereClause = { OR: [{ dataEntrada: { gte: startDate } }, { dataDesligamento: { gte: startDate } }] };
      if (violacao && violacao !== "all") {
        whereClause.violacao = violacao;
      }
      const cases = await prisma.case.findMany({
        where: whereClause,
        select: { id: true, dataEntrada: true, dataDesligamento: true, status: true, violacao: true }
      });
      const monthlyStats = /* @__PURE__ */ new Map();
      for (let i = 0; i < months; i++) {
        const d = (0, import_date_fns.subMonths)(today, months - 1 - i);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        monthlyStats.set(key, { name: d.toLocaleDateString("pt-BR", { month: "short" }).toUpperCase(), novos: 0, fechados: 0 });
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
        if (diff > 15) insights.push(`\u{1F4C8} Aumento s\xFAbito de ${Math.round(diff)}% na demanda este m\xEAs.`);
        else if (diff < -15) insights.push(`\u{1F4C9} Queda de ${Math.abs(Math.round(diff))}% na demanda este m\xEAs.`);
      }
      if (avgHandlingTime > 120) insights.push(`\u26A0\uFE0F Tempo m\xE9dio de acompanhamento alto (${avgHandlingTime} dias).`);
      if (pieData.length > 0) insights.push(`\u{1F50D} Principal demanda local: ${pieData[0].name} (${pieData[0].value} casos).`);
      return reply.send({ trendData, avgHandlingTime, totalActive: activeTotal, insights, pieData });
    } catch (error) {
      return reply.status(500).send({ message: "Erro interno ao processar analytics." });
    }
  });
  app.get("/stats/heatmap", async (request, reply) => {
    const querySchema = import_zod.z.object({ months: import_zod.z.coerce.number().default(12) });
    const { months } = querySchema.parse(request.query);
    try {
      const startDate = (0, import_date_fns.subMonths)(/* @__PURE__ */ new Date(), months);
      const logs = await prisma.caseLog.findMany({ where: { createdAt: { gte: startDate } }, select: { createdAt: true } });
      const map = /* @__PURE__ */ new Map();
      logs.forEach((l) => {
        const day = (0, import_date_fns.format)(l.createdAt, "yyyy-MM-dd");
        map.set(day, (map.get(day) || 0) + 1);
      });
      const result = Array.from(map.entries()).map(([date, count]) => ({ date, count }));
      return reply.send(result);
    } catch {
      return reply.status(500).send([]);
    }
  });
  app.get("/stats/my-agenda", async (request, reply) => {
    const { sub: userId } = request.user;
    try {
      const start = (0, import_date_fns.startOfDay)(/* @__PURE__ */ new Date());
      const appointments = await prisma.agendamento.findMany({
        where: { responsavelId: userId, data: { gte: start } },
        orderBy: { data: "asc" },
        take: 5,
        include: { caso: { select: { id: true, nomeCompleto: true } } }
      });
      return reply.send(appointments);
    } catch {
      return reply.status(500).send({ message: "Erro agenda." });
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  statsRoutes
});
