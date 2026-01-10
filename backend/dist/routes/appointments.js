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

// src/routes/appointments.ts
var appointments_exports = {};
__export(appointments_exports, {
  appointmentRoutes: () => appointmentRoutes
});
module.exports = __toCommonJS(appointments_exports);
var import_zod = require("zod");

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var globalForPrisma = global;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient({
  log: ["error"]
  // Reduzi logs para limpar o terminal, use ['query'] para debug
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/appointments.ts
var import_client2 = require("@prisma/client");
var calendarEventSchema = import_zod.z.object({
  id: import_zod.z.string(),
  title: import_zod.z.string(),
  start: import_zod.z.date(),
  end: import_zod.z.date().nullable().optional(),
  type: import_zod.z.enum(["INDIVIDUAL", "GRUPO"]),
  resourceId: import_zod.z.string().optional(),
  description: import_zod.z.string().optional(),
  status: import_zod.z.string()
});
var upcomingSchema = import_zod.z.object({
  id: import_zod.z.string(),
  titulo: import_zod.z.string(),
  data: import_zod.z.date(),
  caso: import_zod.z.object({ nomeCompleto: import_zod.z.string() }).nullable().optional()
});
var createAppointmentSchema = import_zod.z.object({
  titulo: import_zod.z.string().min(3, "T\xEDtulo muito curto"),
  data: import_zod.z.coerce.date(),
  observacoes: import_zod.z.string().nullable().optional(),
  casoId: import_zod.z.string().uuid(),
  tipo: import_zod.z.string().optional()
});
async function appointmentRoutes(app) {
  const server = app.withTypeProvider();
  server.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  server.get("/stats/my-agenda", {
    schema: {
      tags: ["Agenda"],
      summary: "Pr\xF3ximos compromissos do usu\xE1rio (Widget)",
      response: { 200: import_zod.z.array(upcomingSchema) }
    }
  }, async (req, reply) => {
    const { sub: userId } = req.user;
    const upcoming = await prisma.agendamento.findMany({
      where: { responsavelId: userId, data: { gte: /* @__PURE__ */ new Date() } },
      include: { caso: { select: { nomeCompleto: true } } },
      orderBy: { data: "asc" },
      take: 5
    });
    return reply.send(upcoming);
  });
  server.get("/appointments", {
    schema: {
      tags: ["Agenda"],
      summary: "Listar compromissos (Agendamentos + Grupos)",
      querystring: import_zod.z.object({
        caseId: import_zod.z.string().uuid().optional(),
        start: import_zod.z.coerce.date().optional(),
        end: import_zod.z.coerce.date().optional()
      }),
      response: { 200: import_zod.z.array(calendarEventSchema) }
    }
  }, async (req, reply) => {
    const { caseId, start, end } = req.query;
    const { sub: userId, cargo } = req.user;
    const now = /* @__PURE__ */ new Date();
    const queryStart = start || new Date(now.getFullYear(), now.getMonth(), 1);
    const queryEnd = end || new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const whereClause = { data: { gte: queryStart, lte: queryEnd } };
    if (caseId) {
      whereClause.casoId = caseId;
    } else if (cargo !== import_client2.Cargo.Gerente) {
      whereClause.OR = [
        { responsavelId: userId },
        { caso: { OR: [{ agenteAcolhidaId: userId }, { especialistaPAEFIId: userId }] } }
      ];
    }
    const [appointments, groups] = await Promise.all([
      // 1. Agendamentos Individuais
      prisma.agendamento.findMany({
        where: whereClause,
        include: { caso: { select: { nomeCompleto: true } } }
      }),
      // 2. Atividades de Grupo
      caseId ? prisma.groupActivity.findMany({
        where: {
          dataRealizacao: { gte: queryStart, lte: queryEnd },
          // [CORREÇÃO AQUI] Usando 'casoId: caseId' explicitamente
          participantes: { some: { casoId: caseId } }
        },
        include: { facilitador: { select: { nome: true } } }
      }) : prisma.groupActivity.findMany({
        where: { dataRealizacao: { gte: queryStart, lte: queryEnd } },
        include: { facilitador: { select: { nome: true } } }
      })
    ]);
    const normalized = [
      ...appointments.map((a) => ({
        id: a.id,
        title: a.caso ? `${a.titulo} - ${a.caso.nomeCompleto}` : a.titulo,
        start: a.data,
        type: "INDIVIDUAL",
        resourceId: a.casoId,
        description: a.observacoes || "",
        status: "SCHEDULED"
      })),
      ...groups.map((g) => ({
        id: g.id,
        title: `[GRUPO] ${g.tema} (${g.tipo.replace("_", " ")})`,
        start: g.dataRealizacao,
        type: "GRUPO",
        resourceId: g.id,
        description: g.descricao || "",
        status: "SCHEDULED"
      }))
    ];
    return reply.send(normalized.sort((a, b) => a.start.getTime() - b.start.getTime()));
  });
  server.post("/appointments", {
    schema: {
      tags: ["Agenda"],
      body: createAppointmentSchema
    }
  }, async (req, reply) => {
    const data = req.body;
    const userId = req.user.sub;
    const agendamento = await prisma.agendamento.create({
      data: { ...data, responsavelId: userId }
    });
    prisma.caseLog.create({
      data: {
        casoId: data.casoId,
        autorId: userId,
        acao: import_client2.LogAction.AGENDAMENTO_CRIADO,
        descricao: `Agendamento: ${data.titulo}`
      }
    }).catch(console.error);
    return reply.status(201).send(agendamento);
  });
  server.put("/appointments/:id", {
    schema: {
      tags: ["Agenda"],
      params: import_zod.z.object({ id: import_zod.z.string().uuid() }),
      body: createAppointmentSchema.partial()
    }
  }, async (req, reply) => {
    const { id } = req.params;
    const data = req.body;
    const { sub: userId, cargo } = req.user;
    const existing = await prisma.agendamento.findUnique({ where: { id } });
    if (!existing || existing.responsavelId !== userId && cargo !== import_client2.Cargo.Gerente) {
      return reply.status(403).send({ message: "Sem permiss\xE3o." });
    }
    const updated = await prisma.agendamento.update({
      where: { id },
      data
    });
    return reply.send(updated);
  });
  server.delete("/appointments/:id", {
    schema: {
      tags: ["Agenda"],
      params: import_zod.z.object({ id: import_zod.z.string().uuid() })
    }
  }, async (req, reply) => {
    const { id } = req.params;
    const { sub: userId, cargo } = req.user;
    const existing = await prisma.agendamento.findUnique({ where: { id } });
    if (!existing || existing.responsavelId !== userId && cargo !== import_client2.Cargo.Gerente) {
      return reply.status(403).send({ message: "Sem permiss\xE3o." });
    }
    await prisma.agendamento.delete({ where: { id } });
    return reply.status(204).send();
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  appointmentRoutes
});
