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

// src/routes/alerts.ts
var alerts_exports = {};
__export(alerts_exports, {
  alertRoutes: () => alertRoutes
});
module.exports = __toCommonJS(alerts_exports);

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var prisma = new import_client.PrismaClient();

// src/routes/alerts.ts
var import_date_fns = require("date-fns");
var UPCOMING_DEADLINE_DAYS = 7;
async function alertRoutes(app) {
  app.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app.get("/alerts/paf-deadlines", async (request, reply) => {
    const { sub: userId, cargo } = request.user;
    if (cargo === "Agente Social") {
      return reply.status(200).send([]);
    }
    try {
      const today = (0, import_date_fns.startOfDay)(/* @__PURE__ */ new Date());
      const cutoffDate = (0, import_date_fns.endOfDay)((0, import_date_fns.addDays)(today, UPCOMING_DEADLINE_DAYS));
      const whereClause = {
        // Filtra pelo campo 'deadline' (DateTime)
        deadline: {
          gte: today,
          lte: cutoffDate
        },
        // Usa a relação 'caso' (minúsculo)
        caso: {
          status: "EM_ACOMPANHAMENTO_PAEFI"
          //
        }
      };
      if (cargo === "Especialista") {
        whereClause.caso.especialistaPAEFIId = userId;
      }
      const upcomingPAFs = await prisma.paf.findMany({
        where: whereClause,
        orderBy: {
          deadline: "asc"
          // Ordena pelo campo 'deadline'
        },
        select: {
          id: true,
          deadline: true,
          objetivos: true,
          caso: {
            // Usa a relação 'caso'
            select: {
              id: true,
              nomeCompleto: true,
              //
              especialistaPAEFI: {
                //
                select: {
                  nome: true
                  //
                }
              }
            }
          }
        }
      });
      const formattedAlerts = upcomingPAFs.map((paf) => {
        var _a, _b;
        return {
          pafId: paf.id,
          deadline: paf.deadline,
          caseId: paf.caso.id,
          caseName: paf.caso.nomeCompleto,
          specialistName: ((_a = paf.caso.especialistaPAEFI) == null ? void 0 : _a.nome) ?? "N\xE3o atribu\xEDdo",
          objetivosResumo: ((_b = paf.objetivos) == null ? void 0 : _b.length) > 100 ? paf.objetivos.substring(0, 100) + "..." : paf.objetivos ?? ""
        };
      });
      return reply.status(200).send(formattedAlerts);
    } catch (error) {
      console.error("Erro ao buscar alertas de prazo do PAF:", error);
      return reply.status(500).send({ message: "Erro interno ao buscar alertas." });
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  alertRoutes
});
