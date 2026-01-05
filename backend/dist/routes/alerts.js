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
var import_client2 = require("@prisma/client");
var import_date_fns = require("date-fns");
async function alertRoutes(app) {
  app.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app.get("/alerts", async (request, reply) => {
    const { sub: userId, cargo } = request.user;
    const notifications = [];
    const today = (0, import_date_fns.startOfDay)(/* @__PURE__ */ new Date());
    const tomorrowEnd = (0, import_date_fns.addDays)(today, 2);
    const thirtyDaysAgo = (0, import_date_fns.subDays)(today, 30);
    const tasks = [];
    tasks.push(
      prisma.agendamento.findMany({
        where: {
          responsavelId: userId,
          data: { gte: today, lt: tomorrowEnd }
        },
        include: { caso: { select: { nomeCompleto: true } } }
      }).then((agenda) => {
        agenda.forEach((ag) => {
          var _a;
          notifications.push({
            id: `agenda-${ag.id}`,
            title: "Compromisso Pr\xF3ximo",
            description: `${ag.tipo} - ${((_a = ag.caso) == null ? void 0 : _a.nomeCompleto) || "Sem caso vinculado"} \xE0s ${new Date(ag.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
            link: "/dashboard/agenda",
            type: "info"
          });
        });
      })
    );
    if (cargo === import_client2.Cargo.Coordenador) {
      tasks.push(
        prisma.case.count({
          where: { status: import_client2.CaseStatus.AGUARDANDO_ACOLHIDA }
        }).then((waitingCount) => {
          if (waitingCount > 0) {
            notifications.push({
              id: "waiting-cases",
              title: "Triagem Pendente",
              description: `Existem ${waitingCount} fam\xEDlias aguardando acolhida para triagem inicial.`,
              link: "/dashboard/cases?status=AGUARDANDO_ACOLHIDA",
              type: "critical"
            });
          }
        })
      );
    }
    if (cargo === import_client2.Cargo.Especialista) {
      tasks.push(
        prisma.case.count({
          where: {
            especialistaPAEFIId: userId,
            status: import_client2.CaseStatus.EM_ACOMPANHAMENTO_PAEFI,
            paf: { is: null }
          }
        }).then((casesWithoutPaf) => {
          if (casesWithoutPaf > 0) {
            notifications.push({
              id: "missing-paf",
              title: "Casos sem PAF",
              description: `${casesWithoutPaf} casos precisam do plano inicial.`,
              link: "/dashboard/cases",
              type: "critical"
            });
          }
        })
      );
      const pafDeadline = (0, import_date_fns.addDays)(/* @__PURE__ */ new Date(), 15);
      tasks.push(
        prisma.paf.findMany({
          where: {
            caso: {
              especialistaPAEFIId: userId,
              status: { not: import_client2.CaseStatus.DESLIGADO }
            },
            deadline: { gte: today, lte: pafDeadline }
          },
          include: { caso: { select: { nomeCompleto: true, id: true } } }
        }).then((pafsExpiring) => {
          pafsExpiring.forEach((p) => {
            notifications.push({
              id: `paf-exp-${p.id}`,
              title: "Revis\xE3o de PAF",
              description: `O plano de ${p.caso.nomeCompleto} vence em ${new Date(p.deadline).toLocaleDateString("pt-BR")}.`,
              link: `/dashboard/cases/${p.caso.id}/paf`,
              type: "warning"
            });
          });
        })
      );
      tasks.push(
        prisma.case.findMany({
          select: { id: true, nomeCompleto: true },
          where: {
            especialistaPAEFIId: userId,
            status: import_client2.CaseStatus.EM_ACOMPANHAMENTO_PAEFI,
            // Logica: Não tem NENHUMA evolução com data >= 30 dias atrás
            // Ou seja, a última foi antes disso ou nunca houve.
            evolucao: {
              none: {
                data: { gte: thirtyDaysAgo }
              }
            }
          }
        }).then((stagnantCases) => {
          stagnantCases.forEach((c) => {
            notifications.push({
              id: `stagnant-${c.id}`,
              title: "Caso Sem Evolu\xE7\xE3o",
              description: `${c.nomeCompleto} n\xE3o possui registros nos \xFAltimos 30 dias.`,
              link: `/dashboard/cases/${c.id}`,
              type: "warning"
            });
          });
        })
      );
    }
    await Promise.all(tasks);
    return notifications;
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  alertRoutes
});
