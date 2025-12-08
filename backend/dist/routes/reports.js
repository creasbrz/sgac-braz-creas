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
var prisma = new import_client.PrismaClient();

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
          especialistaPAEFIId: true,
          agenteAcolhida: { select: { nome: true } },
          especialistaPAEFI: { select: { nome: true } }
        },
        orderBy: { pesoUrgencia: "desc" }
      });
      const overview = technicians.map((tech) => {
        const techCases = activeCases.filter((c) => {
          if (tech.cargo === import_client2.Cargo.Agente_Social) {
            return c.agenteAcolhidaId === tech.id && (c.status === import_client2.CaseStatus.AGUARDANDO_ACOLHIDA || c.status === import_client2.CaseStatus.EM_ACOLHIDA);
          }
          if (tech.cargo === import_client2.Cargo.Especialista) {
            return c.especialistaPAEFIId === tech.id && c.status === import_client2.CaseStatus.EM_ACOMPANHAMENTO_PAEFI;
          }
          return false;
        });
        return {
          nome: tech.nome,
          cargo: tech.cargo === import_client2.Cargo.Agente_Social ? "Agente Social" : "Especialista",
          cases: techCases
        };
      });
      return reply.status(200).send(overview);
    } catch (error) {
      console.error("Erro /reports/team-overview:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
  app.get("/reports/rma", async (request, reply) => {
    var _a, _b, _c;
    const querySchema = import_zod.z.object({
      month: import_zod.z.string().regex(/^\d{4}-\d{2}$/, "Formato inv\xE1lido (YYYY-MM).")
    });
    try {
      const { month } = querySchema.parse(request.query);
      const targetDate = /* @__PURE__ */ new Date(month + "-01T00:00:00");
      const firstDay = (0, import_date_fns.startOfMonth)(targetDate);
      const lastDay = (0, import_date_fns.endOfMonth)(targetDate);
      const [initialCount, newEntriesCount, closedCasesCount] = await Promise.all([
        // B1: Saldo anterior
        prisma.case.count({
          where: {
            status: import_client2.CaseStatus.EM_ACOMPANHAMENTO_PAEFI,
            dataInicioPAEFI: { lt: firstDay },
            OR: [
              { dataDesligamento: null },
              { dataDesligamento: { gte: firstDay } }
            ]
          }
        }),
        // B2: Novos entrados no mês
        prisma.case.count({
          where: {
            dataInicioPAEFI: { gte: firstDay, lte: lastDay }
          }
        }),
        // B3: Desligados no mês
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
        masculino: ((_a = sexGroups.find((g) => g.sexo === "Masculino")) == null ? void 0 : _a._count.sexo) || 0,
        feminino: ((_b = sexGroups.find((g) => g.sexo === "Feminino")) == null ? void 0 : _b._count.sexo) || 0,
        outro: ((_c = sexGroups.find((g) => !["Masculino", "Feminino"].includes(g.sexo))) == null ? void 0 : _c._count.sexo) || 0
      };
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
