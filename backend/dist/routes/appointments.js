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
var prisma = new import_client.PrismaClient();

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
    const { caseId, month, pageSize } = import_zod.z.object({
      caseId: import_zod.z.string().uuid().optional(),
      month: import_zod.z.string().regex(/^\d{4}-\d{2}$/).optional(),
      // YYYY-MM
      pageSize: import_zod.z.coerce.number().optional().default(100)
    }).parse(request.query);
    const userId = request.user.sub;
    let dateFilter = {};
    if (month) {
      const start = /* @__PURE__ */ new Date(`${month}-01T00:00:00`);
      const end = new Date(new Date(start).setMonth(start.getMonth() + 1));
      dateFilter = { gte: start, lt: end };
    }
    const appointmentsWhere = { ...caseId ? { casoId } : {} };
    if (month) appointmentsWhere.data = dateFilter;
    const appointments = await prisma.agendamento.findMany({
      where: appointmentsWhere,
      orderBy: { data: "asc" },
      take: pageSize,
      include: {
        responsavel: { select: { nome: true } },
        caso: {
          select: { id: true, nomeCompleto: true, telefone: true }
        }
      }
    });
    let groupsWhere = {};
    if (month) groupsWhere.dataRealizacao = dateFilter;
    if (caseId) {
      groupsWhere.participantes = { some: { casoId } };
    }
    const groups = await prisma.groupActivity.findMany({
      where: groupsWhere,
      orderBy: { dataRealizacao: "asc" },
      take: pageSize,
      include: {
        facilitador: { select: { nome: true } }
        // Não precisamos dos participantes aqui para o calendário leve
      }
    });
    const mappedAppointments = appointments.map((a) => ({
      id: a.id,
      titulo: a.titulo,
      data: a.data,
      observacoes: a.observacoes,
      tipo: "INDIVIDUAL",
      responsavel: a.responsavel,
      caso: a.caso,
      isGroup: false
    }));
    const mappedGroups = groups.map((g) => ({
      id: g.id,
      titulo: `[GRUPO] ${g.tema}`,
      // Prefixo para identificar visualmente
      data: g.dataRealizacao,
      observacoes: `${g.tipo.replace("_", " ")} - Local: ${g.local || "N/A"}`,
      tipo: "COLETIVO",
      responsavel: g.facilitador,
      caso: null,
      // Grupo não tem um caso único "pai"
      isGroup: true,
      originalId: g.id
      // ID original do grupo para links
    }));
    const combined = [...mappedAppointments, ...mappedGroups].sort(
      (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()
    );
    return reply.send(combined);
  });
  app.post("/appointments", async (request, reply) => {
    const bodySchema = import_zod.z.object({
      titulo: import_zod.z.string().min(3),
      data: import_zod.z.coerce.date(),
      observacoes: import_zod.z.any().optional(),
      casoId: import_zod.z.string().uuid()
    });
    try {
      const { titulo, data, observacoes, casoId: casoId2 } = bodySchema.parse(request.body);
      const { sub: userId } = request.user;
      const agendamento = await prisma.agendamento.create({
        data: {
          titulo,
          data,
          observacoes: typeof observacoes === "string" ? observacoes : null,
          casoId: casoId2,
          responsavelId: userId
        }
      });
      await prisma.caseLog.create({
        data: {
          casoId: casoId2,
          autorId: userId,
          acao: import_client2.LogAction.AGENDAMENTO_CRIADO,
          descricao: `Agendou: ${titulo} para ${data.toLocaleDateString("pt-BR")}`
        }
      });
      return reply.status(201).send(agendamento);
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao criar agendamento." });
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  appointmentRoutes
});
