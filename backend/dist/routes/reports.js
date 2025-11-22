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
async function reportRoutes(app) {
  app.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
      const { cargo } = request.user;
      if (cargo !== "Gerente") {
        return reply.status(403).send({ message: "Acesso negado. Apenas gerentes podem ver relat\xF3rios." });
      }
    } catch (err) {
      await reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app.get("/reports/team-overview", async (request, reply) => {
    try {
      const technicians = await prisma.user.findMany({
        where: {
          cargo: {
            in: ["Agente Social", "Especialista"]
          },
          ativo: true
          //
        },
        select: {
          id: true,
          nome: true,
          cargo: true
        },
        orderBy: {
          cargo: "asc"
        }
      });
      const activeCases = await prisma.case.findMany({
        where: {
          status: {
            not: "DESLIGADO"
          }
        },
        select: {
          id: true,
          nomeCompleto: true,
          status: true,
          agenteAcolhidaId: true,
          //
          especialistaPAEFIId: true
          //
        }
      });
      const overview = technicians.map((tech) => {
        const techCases = activeCases.filter((c) => {
          if (tech.cargo === "Agente Social") {
            return c.agenteAcolhidaId === tech.id && (c.status === "AGUARDANDO_ACOLHIDA" || c.status === "EM_ACOLHIDA");
          }
          if (tech.cargo === "Especialista") {
            return c.especialistaPAEFIId === tech.id && c.status === "EM_ACOMPANHAMENTO_PAEFI";
          }
          return false;
        }).map((c) => ({ id: c.id, nomeCompleto: c.nomeCompleto }));
        return {
          nome: tech.nome,
          //
          cargo: tech.cargo,
          //
          cases: techCases
          //
        };
      });
      return reply.status(200).send(overview);
    } catch (error) {
      console.error("Erro ao gerar relat\xF3rio de equipe:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
  app.get("/reports/rma", async (request, reply) => {
    const querySchema = import_zod.z.object({
      month: import_zod.z.string().regex(/^\d{4}-\d{2}$/, "Formato de m\xEAs inv\xE1lido. Use YYYY-MM.")
    });
    try {
      const { month } = querySchema.parse(request.query);
      const targetMonth = parseISO(month);
      const firstDay = (0, import_date_fns.startOfMonth)(targetMonth);
      const lastDay = (0, import_date_fns.endOfMonth)(targetMonth);
      const firstDayOfPreviousMonth = (0, import_date_fns.startOfMonth)((0, import_date_fns.subMonths)(targetMonth, 1));
      const lastDayOfPreviousMonth = (0, import_date_fns.endOfMonth)((0, import_date_fns.subMonths)(targetMonth, 1));
      const initialCount = await prisma.case.count({
        where: {
          status: "EM_ACOMPANHAMENTO_PAEFI",
          dataInicioPAEFI: {
            lt: firstDay
            // Começou antes do início deste mês
          },
          OR: [
            { dataDesligamento: null },
            // Ainda ativo
            { dataDesligamento: { gte: firstDay } }
            // Ou foi desligado *neste* mês (contava no início)
          ]
        }
      });
      const newEntries = await prisma.case.findMany({
        where: {
          dataInicioPAEFI: {
            gte: firstDay,
            lte: lastDay
          }
        },
        select: {
          id: true,
          sexo: true,
          nascimento: true
        }
      });
      const closedCases = await prisma.case.count({
        where: {
          status: "DESLIGADO",
          dataDesligamento: {
            gte: firstDay,
            lte: lastDay
          }
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
        //
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
      const rmaData = {
        //
        initialCount,
        newEntries: newEntries.length,
        closedCases,
        finalCount,
        profileBySex,
        profileByAgeGroup
      };
      return reply.status(200).send(rmaData);
    } catch (error) {
      if (error instanceof import_zod.z.ZodError) {
        return reply.status(400).send({ message: "Dados inv\xE1lidos.", errors: error.flatten() });
      }
      console.error("Erro ao gerar relat\xF3rio RMA:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  reportRoutes
});
