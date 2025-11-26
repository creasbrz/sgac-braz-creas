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
    const agenda = await prisma.agendamento.findMany({
      where: {
        responsavelId: userId,
        data: { gte: today, lt: tomorrowEnd }
      },
      include: { caso: { select: { nomeCompleto: true } } }
    });
    for (const ag of agenda) {
      notifications.push({
        id: `agenda-${ag.id}`,
        title: "Agendamento Pr\xF3ximo",
        description: `${ag.titulo} - ${ag.caso.nomeCompleto}`,
        link: "/dashboard/agenda",
        type: "info"
      });
    }
    if (cargo === import_client2.Cargo.Gerente) {
      const distCount = await prisma.case.count({
        where: { status: import_client2.CaseStatus.AGUARDANDO_DISTRIBUICAO_PAEFI }
      });
      if (distCount > 0) {
        notifications.push({
          id: "dist-queue",
          title: "Distribui\xE7\xE3o Pendente",
          description: `${distCount} casos aguardam atribui\xE7\xE3o de t\xE9cnico.`,
          link: "/dashboard/cases",
          // Link para lista geral
          type: "critical"
        });
      }
    }
    if (cargo === import_client2.Cargo.Agente_Social) {
      const acolhidaCount = await prisma.case.count({
        where: {
          agenteAcolhidaId: userId,
          status: import_client2.CaseStatus.AGUARDANDO_ACOLHIDA
        }
      });
      if (acolhidaCount > 0) {
        notifications.push({
          id: "acolhida-queue",
          title: "Novos Casos para Acolhida",
          description: `Voc\xEA tem ${acolhidaCount} casos aguardando atendimento inicial.`,
          link: "/dashboard/cases",
          type: "critical"
        });
      }
    }
    if (cargo === import_client2.Cargo.Especialista) {
      const casesWithoutPaf = await prisma.case.count({
        where: {
          especialistaPAEFIId: userId,
          status: import_client2.CaseStatus.EM_ACOMPANHAMENTO_PAEFI,
          paf: { is: null }
        }
      });
      if (casesWithoutPaf > 0) {
        notifications.push({
          id: "missing-paf",
          title: "Casos sem PAF",
          description: `${casesWithoutPaf} casos precisam de Plano de Acompanhamento.`,
          link: "/dashboard/cases",
          type: "critical"
        });
      }
      const pafDeadline = (0, import_date_fns.addDays)(/* @__PURE__ */ new Date(), 15);
      const pafsExpiring = await prisma.paf.findMany({
        where: {
          autorId: userId,
          // Ou filtrar pelo caso especialistaPAEFIId
          deadline: { gte: today, lte: pafDeadline },
          caso: { status: { not: import_client2.CaseStatus.DESLIGADO } }
          // Ignora casos já fechados
        },
        include: { caso: { select: { nomeCompleto: true } } }
      });
      for (const p of pafsExpiring) {
        notifications.push({
          id: `paf-exp-${p.id}`,
          title: "PAF Vencendo",
          description: `Revis\xE3o necess\xE1ria: ${p.caso.nomeCompleto}`,
          link: `/dashboard/cases/${p.casoId}`,
          type: "critical"
        });
      }
    }
    return reply.send(notifications);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  alertRoutes
});
