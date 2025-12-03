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
        return reply.status(403).send({ message: "Acesso negado." });
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
          // [NOVO]
          sexo: true,
          // [NOVO]
          urgencia: true,
          // [NOVO]
          violacao: true,
          // [NOVO]
          dataEntrada: true,
          // [NOVO]
          status: true,
          agenteAcolhidaId: true,
          especialistaPAEFIId: true,
          agenteAcolhida: { select: { nome: true } },
          // [NOVO] Para exibir nome na tabela
          especialistaPAEFI: { select: { nome: true } }
          // [NOVO] Para exibir nome na tabela
        },
        orderBy: { pesoUrgencia: "desc" }
        // Ordenar por prioridade dentro da equipe
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
          // Agora contém o objeto completo do caso
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
      const targetMonth = (0, import_date_fns.parseISO)(month);
      const firstDay = (0, import_date_fns.startOfMonth)(targetMonth);
      const lastDay = (0, import_date_fns.endOfMonth)(targetMonth);
      const initialCount = await prisma.case.count({
        where: {
          status: import_client2.CaseStatus.EM_ACOMPANHAMENTO_PAEFI,
          dataInicioPAEFI: { lt: firstDay },
          OR: [
            { dataDesligamento: null },
            { dataDesligamento: { gte: firstDay } }
          ]
        }
      });
      const newEntries = await prisma.case.findMany({
        where: {
          dataInicioPAEFI: { gte: firstDay, lte: lastDay }
        },
        select: { id: true, sexo: true, nascimento: true }
      });
      const closedCases = await prisma.case.count({
        where: {
          status: import_client2.CaseStatus.DESLIGADO,
          dataDesligamento: { gte: firstDay, lte: lastDay }
        }
      });
      const finalCount = initialCount + newEntries.length - closedCases;
      const profileBySex = { masculino: 0, feminino: 0, outro: 0 };
      newEntries.forEach((c) => {
        if (c.sexo === "Masculino") profileBySex.masculino++;
        else if (c.sexo === "Feminino") profileBySex.feminino++;
        else profileBySex.outro++;
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
      newEntries.forEach((c) => {
        const age = now.getFullYear() - new Date(c.nascimento).getFullYear();
        if (age <= 6) profileByAgeGroup["0-6"]++;
        else if (age <= 12) profileByAgeGroup["7-12"]++;
        else if (age <= 17) profileByAgeGroup["13-17"]++;
        else if (age <= 29) profileByAgeGroup["18-29"]++;
        else if (age <= 59) profileByAgeGroup["30-59"]++;
        else profileByAgeGroup["60+"]++;
      });
      return reply.status(200).send({
        initialCount,
        newEntries: newEntries.length,
        closedCases,
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
