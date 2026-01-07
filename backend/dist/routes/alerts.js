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
var globalForPrisma = global;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient({
  log: ["error"]
  // Reduzi logs para limpar o terminal, use ['query'] para debug
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/alerts.ts
var import_date_fns = require("date-fns");
async function alertRoutes(app) {
  app.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send();
    }
  });
  app.get("/alerts", async (req, reply) => {
    const { sub: userId, cargo } = req.user;
    try {
      let whereCondition = { status: { not: "DESLIGADO" } };
      if (cargo === "Especialista") {
        whereCondition.especialistaPAEFIId = userId;
      } else if (cargo === "Agente_Social") {
        whereCondition.agenteAcolhidaId = userId;
        whereCondition.status = { in: ["EM_ACOLHIDA", "AGUARDANDO_ACOLHIDA"] };
      } else if (cargo === "Gerente" || cargo === "Auditor") {
        whereCondition.OR = [
          { especialistaPAEFIId: { not: null } },
          { agenteAcolhidaId: { not: null } }
        ];
      }
      const cases = await prisma.case.findMany({
        where: whereCondition,
        select: {
          id: true,
          nomeCompleto: true,
          status: true,
          dataEntrada: true,
          urgencia: true,
          evolucoes: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true }
          }
        },
        take: 100
        // Limite de segurança
      });
      const alerts = cases.map((c) => {
        var _a;
        try {
          const lastEvolucao = (_a = c.evolucoes[0]) == null ? void 0 : _a.createdAt;
          const lastDate = lastEvolucao ? new Date(lastEvolucao) : null;
          const dataEntrada = c.dataEntrada ? new Date(c.dataEntrada) : /* @__PURE__ */ new Date();
          const today = /* @__PURE__ */ new Date();
          if (cargo === "Especialista" || cargo === "Gerente" && c.status.includes("PAEFI")) {
            if (!lastDate) {
              return { id: c.id, nomeCompleto: c.nomeCompleto, type: "PAF_NOT_STARTED", days: 0, urgencia: c.urgencia };
            }
            if ((0, import_date_fns.isValid)(lastDate)) {
              const daysSince = (0, import_date_fns.differenceInDays)(today, lastDate);
              if (daysSince >= 90) return { id: c.id, nomeCompleto: c.nomeCompleto, type: "PAF_REVIEW_OVERDUE", days: daysSince, urgencia: c.urgencia };
              if (daysSince >= 30) return { id: c.id, nomeCompleto: c.nomeCompleto, type: "PAF_STALLED", days: daysSince, urgencia: c.urgencia };
            }
          }
          if (cargo === "Agente_Social" || cargo === "Gerente" && c.status.includes("ACOLHIDA")) {
            const daysWaiting = (0, import_date_fns.differenceInDays)(today, dataEntrada);
            if (c.status === "AGUARDANDO_ACOLHIDA" && daysWaiting > 2) {
              return { id: c.id, nomeCompleto: c.nomeCompleto, type: "NOT_STARTED_YET", days: daysWaiting, urgencia: c.urgencia };
            }
            if (c.status === "EM_ACOLHIDA" && !lastDate && daysWaiting > 5) {
              return { id: c.id, nomeCompleto: c.nomeCompleto, type: "RECEPTION_DELAY", days: daysWaiting, urgencia: c.urgencia };
            }
          }
        } catch (err) {
          return null;
        }
        return null;
      }).filter(Boolean);
      return reply.send(alerts);
    } catch (error) {
      console.error("[ALERTS_ERROR]", error);
      return reply.status(500).send({ message: "Erro ao processar alertas." });
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  alertRoutes
});
