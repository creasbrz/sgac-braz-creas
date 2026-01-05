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
async function appointmentRoutes(app) {
  app.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app.get("/appointments", async (request, reply) => {
    const querySchema = import_zod.z.object({
      caseId: import_zod.z.string().uuid().optional(),
      start: import_zod.z.coerce.date().optional(),
      end: import_zod.z.coerce.date().optional()
    });
    const { caseId, start: reqStart, end: reqEnd } = querySchema.parse(request.query);
    const { sub: userId, cargo } = request.user;
    let start = reqStart;
    let end = reqEnd;
    if (!start || !end) {
      const now = /* @__PURE__ */ new Date();
      if (caseId) {
        if (!start) start = new Date(now.getFullYear() - 5, 0, 1);
        if (!end) end = new Date(now.getFullYear() + 2, 11, 31);
      } else {
        if (!start) start = new Date(now.getFullYear(), now.getMonth(), 1);
        if (!end) end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }
    }
    const queryStart = start;
    const queryEnd = end;
    const whereClause = {
      data: { gte: queryStart, lte: queryEnd }
    };
    if (caseId) {
      whereClause.casoId = caseId;
    } else {
      if (cargo !== "Gerente" && cargo !== import_client2.Cargo.Gerente) {
        whereClause.OR = [
          { responsavelId: userId },
          // Criado por mim
          // OU sou o técnico do caso vinculado ao agendamento
          { caso: { OR: [{ agenteAcolhidaId: userId }, { especialistaPAEFIId: userId }] } }
        ];
      }
    }
    const individualPromise = prisma.agendamento.findMany({
      where: whereClause,
      include: { caso: { select: { nomeCompleto: true } } }
    });
    const groupPromise = caseId ? prisma.groupActivity.findMany({
      where: {
        dataRealizacao: { gte: queryStart, lte: queryEnd },
        participantes: { some: { casoId: caseId } }
      },
      include: { facilitador: { select: { nome: true } } }
    }) : prisma.groupActivity.findMany({
      where: {
        dataRealizacao: { gte: queryStart, lte: queryEnd }
      },
      include: { facilitador: { select: { nome: true } } }
    });
    try {
      const [appointments, groups] = await Promise.all([individualPromise, groupPromise]);
      const normalizedEvents = [
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
          description: g.descricao || `Facilitador: ${g.facilitador.nome}`,
          status: "SCHEDULED"
        }))
      ];
      return reply.send(normalizedEvents.sort((a, b) => a.start.getTime() - b.start.getTime()));
    } catch (error) {
      console.error("ERRO GET /appointments:", error);
      return reply.status(500).send({ message: "Erro ao buscar agenda." });
    }
  });
  app.post("/appointments", async (request, reply) => {
    const bodySchema = import_zod.z.object({
      titulo: import_zod.z.string().min(3),
      data: import_zod.z.coerce.date(),
      observacoes: import_zod.z.string().nullable().optional(),
      casoId: import_zod.z.string().uuid(),
      tipo: import_zod.z.string().optional()
      // Adicionado tipo
    });
    const { titulo, data, observacoes, casoId, tipo } = bodySchema.parse(request.body);
    const userId = request.user.sub;
    try {
      const agendamento = await prisma.agendamento.create({
        data: {
          titulo,
          data,
          observacoes: observacoes || null,
          casoId,
          responsavelId: userId
          // Se tiver campo 'tipo' no banco, adicione aqui. Se não, remova.
          // tipo: tipo 
        }
      });
      try {
        await prisma.caseLog.create({
          data: {
            casoId,
            autorId: userId,
            acao: import_client2.LogAction.AGENDAMENTO_CRIADO,
            descricao: `Agendamento criado: ${titulo} para ${data.toLocaleString()}`
          }
        });
      } catch (logError) {
        console.warn("\u26A0\uFE0F Log falhou, mas agendamento ok.", logError);
      }
      return reply.status(201).send(agendamento);
    } catch (mainError) {
      console.error("\u274C ERRO POST /appointments:", mainError);
      return reply.status(500).send({ message: "Erro ao criar agendamento." });
    }
  });
  app.put("/appointments/:id", async (request, reply) => {
    const paramsSchema = import_zod.z.object({ id: import_zod.z.string().uuid() });
    const bodySchema = import_zod.z.object({
      titulo: import_zod.z.string().min(3).optional(),
      data: import_zod.z.coerce.date().optional(),
      observacoes: import_zod.z.string().nullable().optional()
    });
    const { id } = paramsSchema.parse(request.params);
    const data = bodySchema.parse(request.body);
    const userId = request.user.sub;
    const { cargo } = request.user;
    const existing = await prisma.agendamento.findUnique({ where: { id } });
    if (!existing || existing.responsavelId !== userId && cargo !== "Gerente") {
      return reply.status(403).send({ message: "Sem permiss\xE3o." });
    }
    const updated = await prisma.agendamento.update({
      where: { id },
      data: {
        ...data,
        ...data.observacoes !== void 0 ? { observacoes: data.observacoes } : {}
      }
    });
    return reply.send(updated);
  });
  app.delete("/appointments/:id", async (request, reply) => {
    const paramsSchema = import_zod.z.object({ id: import_zod.z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const userId = request.user.sub;
    const { cargo } = request.user;
    const existing = await prisma.agendamento.findUnique({ where: { id } });
    if (!existing || existing.responsavelId !== userId && cargo !== "Gerente") {
      return reply.status(403).send({ message: "Sem permiss\xE3o." });
    }
    await prisma.agendamento.delete({ where: { id } });
    if (existing.casoId) {
      try {
        await prisma.caseLog.create({
          data: {
            casoId: existing.casoId,
            autorId: userId,
            acao: import_client2.LogAction.OUTRO,
            descricao: `Agendamento exclu\xEDdo: ${existing.titulo}`
          }
        });
      } catch (e) {
      }
    }
    return reply.status(204).send();
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  appointmentRoutes
});
