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
        title: "Compromisso Pr\xF3ximo",
        description: `${ag.titulo} - ${ag.caso.nomeCompleto}`,
        link: `/dashboard/cases/${ag.casoId}`,
        // Link direto para o caso
        type: "info"
      });
    }
    const dataLimiteInatividade = (0, import_date_fns.subDays)(/* @__PURE__ */ new Date(), 30);
    const casosInativos = await prisma.case.findMany({
      where: {
        status: import_client2.CaseStatus.EM_ACOMPANHAMENTO_PAEFI,
        // Se for Especialista, filtra pelos dele. Se Gerente, vê todos.
        especialistaPAEFIId: cargo === import_client2.Cargo.Especialista ? userId : void 0,
        // Lógica: Nenhuma evolução criada DEPOIS da data limite
        evolucoes: {
          none: {
            createdAt: { gte: dataLimiteInatividade }
          }
        }
      },
      select: { id: true, nomeCompleto: true }
    });
    for (const caso of casosInativos) {
      notifications.push({
        id: `inativo-${caso.id}`,
        title: "Caso sem Movimenta\xE7\xE3o",
        description: `${caso.nomeCompleto} n\xE3o tem evolu\xE7\xE3o h\xE1 +30 dias.`,
        link: `/dashboard/cases/${caso.id}`,
        type: "critical"
        // Alerta vermelho
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
          description: `${distCount} casos aguardam atribui\xE7\xE3o.`,
          link: "/dashboard/cases?status=AGUARDANDO_DISTRIBUICAO_PAEFI",
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
          title: "Novos na Acolhida",
          description: `Voc\xEA tem ${acolhidaCount} casos para triagem inicial.`,
          link: "/dashboard/cases?status=AGUARDANDO_ACOLHIDA",
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
          description: `${casesWithoutPaf} casos precisam do plano inicial.`,
          link: "/dashboard/cases",
          // Idealmente filtrar na lista
          type: "critical"
        });
      }
      const pafDeadline = (0, import_date_fns.addDays)(/* @__PURE__ */ new Date(), 15);
      const pafsExpiring = await prisma.paf.findMany({
        where: {
          // O PAF pode ter sido criado por outro, mas o alerta vai para o responsável atual do caso
          caso: {
            especialistaPAEFIId: userId,
            status: { not: import_client2.CaseStatus.DESLIGADO }
          },
          deadline: { gte: today, lte: pafDeadline }
        },
        include: { caso: { select: { nomeCompleto: true, id: true } } }
      });
      for (const p of pafsExpiring) {
        notifications.push({
          id: `paf-exp-${p.id}`,
          title: "Reavalia\xE7\xE3o de PAF",
          description: `Prazo pr\xF3ximo: ${p.caso.nomeCompleto}`,
          link: `/dashboard/cases/${p.caso.id}`,
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
