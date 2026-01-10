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

// src/services/AnalyticsAI.ts
var AnalyticsAI_exports = {};
__export(AnalyticsAI_exports, {
  AnalyticsAI: () => AnalyticsAI
});
module.exports = __toCommonJS(AnalyticsAI_exports);

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var globalForPrisma = global;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient({
  log: ["error"]
  // Reduzi logs para limpar o terminal, use ['query'] para debug
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AnalyticsAI
});
