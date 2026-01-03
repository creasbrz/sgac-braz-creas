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

// src/routes/reports.ts
var reports_exports = {};
__export(reports_exports, {
  reportRoutes: () => reportRoutes
});
module.exports = __toCommonJS(reports_exports);
var import_zod = require("zod");

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var globalForPrisma = global;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient({
  // Habilite logs apenas se quiser debugar queries lentas ou erros
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/reports.ts
var import_date_fns = require("date-fns");
var import_client2 = require("@prisma/client");
async function reportRoutes(app) {
  app.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
      const { cargo } = request.user;
      if (cargo !== import_client2.Cargo.Gerente) {
        return reply.status(403).send({ message: "Acesso negado. Apenas Ger\xEAncia." });
      }
    } catch (err) {
      await reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app.get("/reports/team-overview", async (request, reply) => {
    try {
      const technicians = await prisma.user.findMany({
        where: {
          cargo: { in: [import_client2.Cargo.Agente_Social, import_client2.Cargo.Especialista] },
          ativo: true
        },
        select: { id: true, nome: true, cargo: true },
        orderBy: { cargo: "asc" }
      });
      const activeCases = await prisma.case.findMany({
        where: {
          status: { not: import_client2.CaseStatus.DESLIGADO }
        },
        select: {
          id: true,
          nomeCompleto: true,
          cpf: true,
          sexo: true,
          urgencia: true,
          violacao: true,
          dataEntrada: true,
          status: true,
          agenteAcolhidaId: true,
          especialistaPAEFIId: true
          // Não precisamos dos includes complexos aqui, só os IDs bastam para filtrar
        },
        orderBy: { pesoUrgencia: "desc" }
      });
      const overview = technicians.map((tech) => {
        const techCases = activeCases.filter((c) => {
          if (tech.cargo === import_client2.Cargo.Agente_Social) {
            return c.agenteAcolhidaId === tech.id && (c.status === import_client2.CaseStatus.AGUARDANDO_ACOLHIDA || c.status === import_client2.CaseStatus.EM_ACOLHIDA);
          }
          if (tech.cargo === import_client2.Cargo.Especialista) {
            return c.especialistaPAEFIId === tech.id && (c.status === import_client2.CaseStatus.EM_ACOMPANHAMENTO_PAEFI || c.status === import_client2.CaseStatus.EM_MONITORAMENTO);
          }
          return false;
        });
        return {
          id: tech.id,
          nome: tech.nome,
          cargo: tech.cargo === import_client2.Cargo.Agente_Social ? "Agente Social" : "Especialista",
          cases: techCases,
          caseCount: techCases.length
        };
      });
      return reply.status(200).send(overview);
    } catch (error) {
      console.error("Erro /reports/team-overview:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
  app.get("/reports/rma", async (request, reply) => {
    const querySchema = import_zod.z.object({
      month: import_zod.z.string().regex(/^\d{4}-\d{2}$/, "Formato inv\xE1lido (YYYY-MM).")
    });
    try {
      const { month } = querySchema.parse(request.query);
      const [year, m] = month.split("-").map(Number);
      const firstDay = new Date(Date.UTC(year, m - 1, 1));
      const lastDay = new Date(Date.UTC(year, m, 0, 23, 59, 59));
      const [initialCount, newEntriesCount, closedCasesCount] = await Promise.all([
        // Volume Inicial (Casos ativos vindos do mês anterior)
        prisma.case.count({
          where: {
            status: { in: [import_client2.CaseStatus.EM_ACOMPANHAMENTO_PAEFI, import_client2.CaseStatus.EM_MONITORAMENTO] },
            dataInicioPAEFI: { lt: firstDay },
            // Começaram antes deste mês
            OR: [
              { dataDesligamento: null },
              // E não acabaram
              { dataDesligamento: { gte: firstDay } }
              // Ou acabaram, mas só dentro deste mês (então contam no saldo inicial)
            ]
          }
        }),
        // Novos Casos (Entraram no PAEFI neste mês)
        prisma.case.count({
          where: {
            dataInicioPAEFI: { gte: firstDay, lte: lastDay }
          }
        }),
        // Desligados (Saíram do PAEFI neste mês)
        prisma.case.count({
          where: {
            status: import_client2.CaseStatus.DESLIGADO,
            dataDesligamento: { gte: firstDay, lte: lastDay }
          }
        })
      ]);
      const sexGroups = await prisma.case.groupBy({
        by: ["sexo"],
        where: {
          dataInicioPAEFI: { gte: firstDay, lte: lastDay }
        },
        _count: { sexo: true }
      });
      const profileBySex = {
        masculino: 0,
        feminino: 0,
        outro: 0
      };
      sexGroups.forEach((g) => {
        if (!g.sexo) return;
        const s = g.sexo.toLowerCase();
        if (s === "masculino") profileBySex.masculino += g._count.sexo;
        else if (s === "feminino") profileBySex.feminino += g._count.sexo;
        else profileBySex.outro += g._count.sexo;
      });
      const newEntriesAges = await prisma.case.findMany({
        where: { dataInicioPAEFI: { gte: firstDay, lte: lastDay } },
        select: { nascimento: true }
      });
      const profileByAgeGroup = {
        "0-6": 0,
        "7-12": 0,
        "13-17": 0,
        "18-29": 0,
        "30-59": 0,
        "60+": 0
      };
      const now = /* @__PURE__ */ new Date();
      for (const c of newEntriesAges) {
        if (!c.nascimento) continue;
        const age = (0, import_date_fns.differenceInYears)(now, c.nascimento);
        if (age <= 6) profileByAgeGroup["0-6"]++;
        else if (age <= 12) profileByAgeGroup["7-12"]++;
        else if (age <= 17) profileByAgeGroup["13-17"]++;
        else if (age <= 29) profileByAgeGroup["18-29"]++;
        else if (age <= 59) profileByAgeGroup["30-59"]++;
        else profileByAgeGroup["60+"]++;
      }
      const finalCount = initialCount + newEntriesCount - closedCasesCount;
      return reply.status(200).send({
        initialCount,
        newEntries: newEntriesCount,
        closedCases: closedCasesCount,
        finalCount,
        profileBySex,
        profileByAgeGroup
      });
    } catch (error) {
      console.error("Erro /reports/rma:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  reportRoutes
});
