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
var import_zod = require("zod");

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var globalForPrisma = global;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient({
  log: ["error"]
  // Reduzi logs para limpar o terminal, use ['query'] para debug
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/stats.ts
var import_date_fns2 = require("date-fns");
var import_locale = require("date-fns/locale");
var import_client3 = require("@prisma/client");

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

// src/services/AnalyticsAI.ts
var import_date_fns = require("date-fns");
var import_client2 = require("@prisma/client");
var AnalyticsAI = class {
  /**
   * Gera insights baseados em análise estatística dos dados reais do CREAS
   */
  static async generateInsights(monthsToCheck = 3) {
    const insights = [];
    const today = /* @__PURE__ */ new Date();
    const currentMonthStart = (0, import_date_fns.startOfMonth)(today);
    const lastMonthStart = (0, import_date_fns.startOfMonth)((0, import_date_fns.subMonths)(today, 1));
    const [currentMonthCases, lastMonthCases] = await Promise.all([
      prisma.case.count({ where: { dataEntrada: { gte: currentMonthStart } } }),
      prisma.case.count({ where: { dataEntrada: { gte: lastMonthStart, lt: currentMonthStart } } })
    ]);
    if (lastMonthCases > 0) {
      const growth = (currentMonthCases - lastMonthCases) / lastMonthCases * 100;
      if (growth > 20) {
        insights.push({
          type: "warning",
          title: "Alerta de Demanda",
          description: `Aumento s\xFAbito de ${growth.toFixed(0)}% na entrada de novos casos em rela\xE7\xE3o ao m\xEAs anterior.`
        });
      } else if (growth < -20) {
        insights.push({
          type: "info",
          title: "Queda na Demanda",
          description: `Houve uma redu\xE7\xE3o de ${Math.abs(growth).toFixed(0)}% nos atendimentos iniciados este m\xEAs.`
        });
      }
    }
    const stalledCases = await prisma.case.count({
      where: {
        status: { not: import_client2.CaseStatus.DESLIGADO },
        evolucoes: {
          none: {
            createdAt: { gte: (0, import_date_fns.subDays)(today, 30) }
          }
        }
      }
    });
    if (stalledCases > 0) {
      insights.push({
        type: "warning",
        title: "Risco de Neglig\xEAncia",
        description: `Detectados ${stalledCases} casos ativos sem nenhuma evolu\xE7\xE3o t\xE9cnica registrada h\xE1 mais de 30 dias.`
      });
    } else {
      insights.push({
        type: "success",
        title: "Cobertura Total",
        description: "Todos os casos ativos receberam atendimento t\xE9cnico nos \xFAltimos 30 dias."
      });
    }
    const topViolations = await prisma.case.groupBy({
      by: ["violacao"],
      where: {
        dataEntrada: { gte: (0, import_date_fns.subMonths)(today, monthsToCheck) }
      },
      _count: { violacao: true },
      orderBy: { _count: { violacao: "desc" } },
      take: 1
    });
    if (topViolations.length > 0) {
      const top = topViolations[0];
      insights.push({
        type: "info",
        title: "Padr\xE3o de Viola\xE7\xE3o",
        description: `A viola\xE7\xE3o "${top.violacao}" representa a maior incid\xEAncia do per\xEDodo (${top._count.violacao} casos).`
      });
    }
    const visitsCount = await prisma.agendamento.count({
      where: {
        data: { gte: (0, import_date_fns.subMonths)(today, 1) },
        OR: [
          { titulo: { contains: "Visita", mode: "insensitive" } },
          { titulo: { contains: "Busca", mode: "insensitive" } }
        ]
      }
    });
    if (visitsCount > 5) {
      insights.push({
        type: "success",
        title: "Territ\xF3rio Ativo",
        description: `Equipe realizou ${visitsCount} visitas/buscas ativas no \xFAltimo m\xEAs.`
      });
    }
    return insights.sort((a, b) => {
      const priority = { warning: 0, success: 1, info: 2 };
      return priority[a.type] - priority[b.type];
    }).slice(0, 3);
  }
};

// src/routes/stats.ts
var calculateUrgencyWeight = (urgencia) => {
  if (!urgencia) return 1;
  const term = urgencia.trim();
  if (["Convive com agressor", "Idoso 80+", "Primeira inf\xE2ncia", "Risco de morte"].includes(term)) return 4;
  if (["Risco de reincid\xEAncia", "Sofre amea\xE7a", "Risco de desabrigo", "Crian\xE7a/Adolescente"].includes(term)) return 3;
  if (["PCD", "Idoso", "Interna\xE7\xE3o", "Acolhimento", "Gestante/Lactante"].includes(term)) return 2;
  return 1;
};
var statsQuerySchema = import_zod.z.object({
  months: import_zod.z.coerce.number().min(1).max(60).default(12),
  violacao: import_zod.z.string().optional()
});
var productivityQuerySchema = import_zod.z.object({
  mode: import_zod.z.enum(["workload", "performance"]).default("workload"),
  months: import_zod.z.coerce.number().default(1)
});
var simpleStatSchema = import_zod.z.object({
  name: import_zod.z.string(),
  value: import_zod.z.number()
});
async function statsRoutes(app) {
  const server = app.withTypeProvider();
  server.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  server.get("/stats", {
    schema: {
      tags: ["Dashboard"],
      summary: "Indicadores principais (Cards do Topo)",
      response: {
        200: import_zod.z.object({
          role: import_zod.z.string(),
          totalCases: import_zod.z.number().optional(),
          acolhidasCount: import_zod.z.number().optional(),
          acompanhamentosCount: import_zod.z.number().optional(),
          monitoringCount: import_zod.z.number().optional(),
          newCasesThisMonth: import_zod.z.number().optional(),
          closedCasesThisMonth: import_zod.z.number().optional(),
          workloadByAgent: import_zod.z.array(simpleStatSchema).optional(),
          workloadBySpecialist: import_zod.z.array(simpleStatSchema).optional(),
          casesByUrgency: import_zod.z.array(simpleStatSchema).optional(),
          casesByCategory: import_zod.z.array(simpleStatSchema).optional(),
          productivity: import_zod.z.array(import_zod.z.any()).optional(),
          lastUpdated: import_zod.z.string().optional(),
          myActiveCases: import_zod.z.number().optional(),
          myClosedMonth: import_zod.z.number().optional(),
          myNewCasesMonth: import_zod.z.number().optional(),
          message: import_zod.z.string().optional()
        })
      }
    }
  }, async (request, reply) => {
    const { cargo, sub: userId } = request.user;
    if (cargo === import_client3.Cargo.Gerente) {
      const cacheKey = "manager_stats_main";
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        reply.header("X-Cache", "HIT");
        return reply.send(cachedData);
      }
      const today2 = /* @__PURE__ */ new Date();
      const firstDayOfMonth2 = (0, import_date_fns2.startOfMonth)(today2);
      const lastDayOfMonth2 = (0, import_date_fns2.endOfMonth)(today2);
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
        prisma.case.count({ where: { status: { in: [import_client3.CaseStatus.AGUARDANDO_ACOLHIDA, import_client3.CaseStatus.EM_ACOLHIDA] } } }),
        prisma.case.count({ where: { status: { in: [import_client3.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, import_client3.CaseStatus.EM_ACOMPANHAMENTO] } } }),
        prisma.case.count({ where: { status: import_client3.CaseStatus.EM_MONITORAMENTO } }),
        prisma.case.count({ where: { dataEntrada: { gte: firstDayOfMonth2, lte: lastDayOfMonth2 } } }),
        prisma.case.count({ where: { status: import_client3.CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth2, lte: lastDayOfMonth2 } } }),
        prisma.case.groupBy({
          by: ["agenteAcolhidaId"],
          where: { status: { in: [import_client3.CaseStatus.AGUARDANDO_ACOLHIDA, import_client3.CaseStatus.EM_ACOLHIDA] }, agenteAcolhidaId: { not: null } },
          _count: { _all: true }
        }),
        prisma.case.groupBy({
          by: ["especialistaPAEFIId"],
          where: { status: { in: [import_client3.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, import_client3.CaseStatus.EM_ACOMPANHAMENTO] }, especialistaPAEFIId: { not: null } },
          _count: { _all: true }
        }),
        prisma.case.groupBy({ by: ["urgencia"], _count: { _all: true }, where: { status: { not: import_client3.CaseStatus.DESLIGADO } } }),
        prisma.case.groupBy({ by: ["categoria"], _count: { _all: true }, where: { status: { not: import_client3.CaseStatus.DESLIGADO } } })
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
    }
    const today = /* @__PURE__ */ new Date();
    const firstDayOfMonth = (0, import_date_fns2.startOfMonth)(today);
    const lastDayOfMonth = (0, import_date_fns2.endOfMonth)(today);
    if (cargo === import_client3.Cargo.Agente_Social) {
      const [myActive, myClosed, myNew] = await Promise.all([
        prisma.case.count({ where: { agenteAcolhidaId: userId, status: { in: [import_client3.CaseStatus.AGUARDANDO_ACOLHIDA, import_client3.CaseStatus.EM_ACOLHIDA] } } }),
        prisma.case.count({ where: { agenteAcolhidaId: userId, status: import_client3.CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
        prisma.case.count({ where: { agenteAcolhidaId: userId, dataEntrada: { gte: firstDayOfMonth, lte: lastDayOfMonth } } })
      ]);
      return reply.send({ role: "Agente_Social", myActiveCases: myActive, myClosedMonth: myClosed, myNewCasesMonth: myNew });
    }
    if (cargo === import_client3.Cargo.Especialista) {
      const [myActive, myClosed, myNew] = await Promise.all([
        prisma.case.count({ where: { especialistaPAEFIId: userId, status: { in: [import_client3.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, import_client3.CaseStatus.EM_ACOMPANHAMENTO, import_client3.CaseStatus.EM_MONITORAMENTO] } } }),
        prisma.case.count({ where: { especialistaPAEFIId: userId, status: import_client3.CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
        prisma.case.count({ where: { especialistaPAEFIId: userId, dataInicioPAEFI: { gte: firstDayOfMonth, lte: lastDayOfMonth } } })
      ]);
      return reply.send({ role: "Especialista", myActiveCases: myActive, myClosedMonth: myClosed, myNewCasesMonth: myNew });
    }
    return reply.status(200).send({ role: "Visitante", message: "Sem dados." });
  });
  server.get("/stats/productivity", {
    schema: {
      tags: ["Dashboard"],
      summary: "M\xE9tricas de produtividade da equipe",
      querystring: productivityQuerySchema
    }
  }, async (request, reply) => {
    const { mode, months } = request.query;
    const users = await prisma.user.findMany({
      where: { ativo: true, cargo: { not: import_client3.Cargo.Gerente } },
      select: { id: true, nome: true, cargo: true }
    });
    if (mode === "performance") {
      const startDate = (0, import_date_fns2.subMonths)(/* @__PURE__ */ new Date(), months);
      const flowActions = [import_client3.LogAction.MUDANCA_STATUS, import_client3.LogAction.DESLIGAMENTO, import_client3.LogAction.ATRIBUICAO];
      const rawActivity = await prisma.caseLog.findMany({
        where: {
          createdAt: { gte: startDate },
          acao: { in: flowActions }
        },
        select: { autorId: true, casoId: true }
      });
      const statsMap = /* @__PURE__ */ new Map();
      rawActivity.forEach((log) => {
        var _a;
        if (!statsMap.has(log.autorId)) statsMap.set(log.autorId, /* @__PURE__ */ new Set());
        (_a = statsMap.get(log.autorId)) == null ? void 0 : _a.add(log.casoId);
      });
      const data2 = users.map((u) => {
        var _a;
        return {
          name: u.nome.split(" ")[0],
          value: ((_a = statsMap.get(u.id)) == null ? void 0 : _a.size) || 0,
          role: u.cargo
        };
      }).sort((a, b) => b.value - a.value);
      return reply.send(data2);
    }
    const [specialistStats, agentStats] = await Promise.all([
      prisma.case.groupBy({
        by: ["especialistaPAEFIId", "status"],
        where: {
          especialistaPAEFIId: { in: users.map((u) => u.id) },
          status: { in: [import_client3.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, import_client3.CaseStatus.EM_ACOMPANHAMENTO, import_client3.CaseStatus.EM_MONITORAMENTO] }
        },
        _count: { _all: true }
      }),
      prisma.case.groupBy({
        by: ["agenteAcolhidaId", "status"],
        where: {
          agenteAcolhidaId: { in: users.map((u) => u.id) },
          status: { in: [import_client3.CaseStatus.AGUARDANDO_ACOLHIDA, import_client3.CaseStatus.EM_ACOLHIDA] }
        },
        _count: { _all: true }
      })
    ]);
    const data = users.map((u) => {
      let active = 0;
      let monitoring = 0;
      if (u.cargo === import_client3.Cargo.Especialista) {
        const stats = specialistStats.filter((s) => s.especialistaPAEFIId === u.id);
        active = stats.filter((s) => s.status !== import_client3.CaseStatus.EM_MONITORAMENTO).reduce((acc, curr) => acc + curr._count._all, 0);
        monitoring = stats.filter((s) => s.status === import_client3.CaseStatus.EM_MONITORAMENTO).reduce((acc, curr) => acc + curr._count._all, 0);
      } else if (u.cargo === import_client3.Cargo.Agente_Social) {
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
  });
  server.get("/stats/vigilancia", {
    schema: {
      tags: ["Dashboard"],
      summary: "Relat\xF3rio avan\xE7ado de vigil\xE2ncia sociassistencial"
    }
  }, async (request, reply) => {
    const { cargo } = request.user;
    if (!["Gerente", "Especialista"].includes(cargo)) {
      return reply.status(403).send({ message: "Acesso restrito." });
    }
    const today = /* @__PURE__ */ new Date();
    const sixMonthsAgo = (0, import_date_fns2.subMonths)(today, 6);
    const allCases = await prisma.case.findMany({
      where: {
        OR: [
          { dataEntrada: { gte: sixMonthsAgo } },
          { dataDesligamento: { gte: sixMonthsAgo } }
        ]
      },
      select: {
        id: true,
        dataEntrada: true,
        dataDesligamento: true,
        dataInicioPAEFI: true,
        status: true,
        urgencia: true,
        violacao: true,
        categoria: true,
        sexo: true,
        nascimento: true
      }
    });
    const monthsMap = /* @__PURE__ */ new Map();
    for (let i = 5; i >= 0; i--) {
      const d = (0, import_date_fns2.subMonths)(today, i);
      const key = (0, import_date_fns2.format)(d, "yyyy-MM");
      const label = (0, import_date_fns2.format)(d, "MMM/yy", { locale: import_locale.ptBR });
      monthsMap.set(key, { name: label.charAt(0).toUpperCase() + label.slice(1), novos: 0, desligados: 0 });
    }
    allCases.forEach((c) => {
      const entryKey = (0, import_date_fns2.format)(c.dataEntrada, "yyyy-MM");
      const exitKey = c.dataDesligamento ? (0, import_date_fns2.format)(c.dataDesligamento, "yyyy-MM") : null;
      if (monthsMap.has(entryKey)) monthsMap.get(entryKey).novos++;
      if (exitKey && monthsMap.has(exitKey)) monthsMap.get(exitKey).desligados++;
    });
    const evolutionData = Array.from(monthsMap.values());
    const [violations, urgencies, origins, referrals, benefits] = await Promise.all([
      prisma.case.groupBy({ by: ["violacao"], _count: { _all: true }, where: { status: { not: import_client3.CaseStatus.DESLIGADO } } }),
      prisma.case.groupBy({ by: ["urgencia"], _count: { _all: true }, where: { status: { not: import_client3.CaseStatus.DESLIGADO } } }),
      prisma.case.groupBy({ by: ["orgaoDemandante"], _count: { _all: true }, where: { status: { not: import_client3.CaseStatus.DESLIGADO } }, orderBy: { _count: { orgaoDemandante: "desc" } }, take: 10 }),
      prisma.encaminhamento.groupBy({ by: ["instituicao"], _count: { _all: true }, orderBy: { _count: { instituicao: "desc" } }, take: 10 }),
      prisma.serviceDeliverable.groupBy({ by: ["tipo"], _count: { _all: true }, orderBy: { _count: { tipo: "desc" } } })
    ]);
    const violationData = violations.map((v) => ({ name: v.violacao, value: v._count._all })).sort((a, b) => b.value - a.value);
    const urgencyData = urgencies.map((u) => ({ name: u.urgencia, value: u._count._all, weight: calculateUrgencyWeight(u.urgencia) })).sort((a, b) => b.weight - a.weight);
    const originData = origins.map((o) => ({ name: o.orgaoDemandante, value: o._count._all }));
    const networkData = referrals.map((r) => ({ name: r.instituicao, value: r._count._all }));
    const benefitsData = benefits.map((b) => ({ name: b.tipo, value: b._count._all }));
    const demographics = { sexo: { Masculino: 0, Feminino: 0, Outro: 0 }, etaria: { "0-11 (Crian\xE7a)": 0, "12-17 (Adolescente)": 0, "18-59 (Adulto)": 0, "60+ (Idoso)": 0 } };
    const mapData = [];
    for (const c of allCases) {
      if (c.status === import_client3.CaseStatus.DESLIGADO) continue;
      if (c.sexo === "Masculino") demographics.sexo.Masculino++;
      else if (c.sexo === "Feminino") demographics.sexo.Feminino++;
      else demographics.sexo.Outro++;
      const age = today.getFullYear() - c.nascimento.getFullYear();
      if (age < 12) demographics.etaria["0-11 (Crian\xE7a)"]++;
      else if (age < 18) demographics.etaria["12-17 (Adolescente)"]++;
      else if (age < 60) demographics.etaria["18-59 (Adulto)"]++;
      else demographics.etaria["60+ (Idoso)"]++;
      const pseudoRandom = c.id.charCodeAt(0) + c.id.charCodeAt(c.id.length - 1);
      mapData.push({ id: c.id, lat: -15.668 + (pseudoRandom % 100 - 50) / 4e3, lng: -48.201 + (pseudoRandom % 100 - 50) / 4e3, intensity: calculateUrgencyWeight(c.urgencia), label: c.urgencia, violacao: c.violacao || "N\xE3o Informado", categoria: c.categoria || "N\xE3o Informado" });
    }
    const [groupCount, participantsCount] = await Promise.all([
      prisma.groupActivity.count({ where: { dataRealizacao: { gte: sixMonthsAgo } } }),
      prisma.groupAttendance.count({ where: { presente: true, grupo: { dataRealizacao: { gte: sixMonthsAgo } } } })
    ]);
    const collectiveData = { totalGroups: groupCount, totalParticipants: participantsCount, avgAttendance: groupCount > 0 ? Math.round(participantsCount / groupCount) : 0 };
    const closedCases = allCases.filter((c) => c.dataDesligamento);
    const totalPermanence = closedCases.reduce((acc, c) => acc + (c.dataDesligamento.getTime() - c.dataEntrada.getTime()), 0);
    const avgPermanence = closedCases.length ? Math.round(totalPermanence / closedCases.length / 864e5) : 0;
    return reply.send({
      evolutionData,
      violationData,
      urgencyData,
      originData,
      networkData,
      benefitsData,
      collectiveData,
      ageData: Object.entries(demographics.etaria).map(([name, value]) => ({ name, value })),
      sexData: Object.entries(demographics.sexo).map(([name, value]) => ({ name, value })),
      mapData,
      efficiencyData: { avgPermanence, totalClosed: closedCases.length, retentionRate: Math.round((1 - closedCases.length / (allCases.length || 1)) * 100) }
    });
  });
  server.get("/stats/advanced", {
    schema: {
      tags: ["Dashboard"],
      summary: "An\xE1lise de tend\xEAncias e IA",
      querystring: statsQuerySchema
    }
  }, async (request, reply) => {
    const { cargo } = request.user;
    if (cargo !== import_client3.Cargo.Gerente) return reply.status(403).send({ message: "Acesso restrito." });
    const { months, violacao } = request.query;
    const today = /* @__PURE__ */ new Date();
    const startDate = (0, import_date_fns2.startOfMonth)((0, import_date_fns2.subMonths)(today, months - 1));
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
      const d = (0, import_date_fns2.subMonths)(today, months - 1 - i);
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
    const insights = await AnalyticsAI.generateInsights(months);
    return reply.send({ trendData: Array.from(monthlyStats.values()), totalActive: await prisma.case.count({ where: { status: { not: import_client3.CaseStatus.DESLIGADO } } }), insights, pieData });
  });
  server.get("/stats/activity", {
    schema: {
      tags: ["Dashboard"],
      summary: "Feed de atividades em tempo real"
    }
  }, async (request, reply) => {
    const { sub: userId, cargo } = request.user;
    const whereScope = cargo === import_client3.Cargo.Gerente ? {} : { caso: { OR: [{ agenteAcolhidaId: userId }, { especialistaPAEFIId: userId }] } };
    const logs = await prisma.caseLog.findMany({ where: whereScope, take: 10, orderBy: { createdAt: "desc" }, include: { autor: { select: { nome: true, cargo: true } }, caso: { select: { id: true, nomeCompleto: true } } } });
    return reply.send(logs);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  statsRoutes
});
