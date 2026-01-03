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
  // Habilite logs apenas se quiser debugar queries lentas ou erros
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/appointments.ts
var import_client2 = require("@prisma/client");
var emptyToNull = (val) => {
  if (typeof val === "string" && val.trim() === "") return null;
  return val;
};
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
      month: import_zod.z.string().regex(/^\d{4}-\d{2}$/).optional(),
      pageSize: import_zod.z.coerce.number().optional().default(100)
    });
    const { caseId, month, pageSize } = querySchema.parse(request.query);
    let dateFilter = {};
    if (month) {
      const [year, m] = month.split("-").map(Number);
      const start = new Date(Date.UTC(year, m - 1, 1));
      const end = new Date(Date.UTC(year, m, 1));
      dateFilter = { gte: start, lt: end };
    }
    const appointmentsWhere = {};
    if (caseId) appointmentsWhere.casoId = caseId;
    if (month) appointmentsWhere.data = dateFilter;
    const appointments = await prisma.agendamento.findMany({
      where: appointmentsWhere,
      orderBy: { data: "asc" },
      take: pageSize,
      include: {
        responsavel: { select: { id: true, nome: true } },
        caso: {
          select: { id: true, nomeCompleto: true, telefone: true }
        }
      }
    });
    let groupsWhere = {};
    if (month) groupsWhere.dataRealizacao = dateFilter;
    if (caseId) groupsWhere.participantes = { some: { casoId: caseId } };
    const groups = await prisma.groupActivity.findMany({
      where: groupsWhere,
      orderBy: { dataRealizacao: "asc" },
      take: pageSize,
      include: {
        facilitador: { select: { id: true, nome: true } }
      }
    });
    const mappedAppointments = appointments.map((a) => {
      var _a;
      return {
        ...a,
        title: a.titulo,
        start: a.data,
        end: new Date(new Date(a.data).getTime() + 60 * 60 * 1e3),
        tipo: "INDIVIDUAL",
        isGroup: false,
        color: "#3b82f6",
        casoNome: (_a = a.caso) == null ? void 0 : _a.nomeCompleto
      };
    });
    const mappedGroups = groups.map((g) => ({
      id: g.id,
      titulo: `[GRUPO] ${g.tema}`,
      data: g.dataRealizacao,
      observacoes: `${g.tipo.replace("_", " ")} - Local: ${g.local || "N/A"}`,
      responsavel: g.facilitador,
      caso: null,
      title: `[GRUPO] ${g.tema}`,
      start: g.dataRealizacao,
      end: new Date(new Date(g.dataRealizacao).getTime() + 90 * 60 * 1e3),
      tipo: "COLETIVO",
      isGroup: true,
      color: "#10b981",
      originalId: g.id
    }));
    const combined = [...mappedAppointments, ...mappedGroups].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
    return reply.send(combined);
  });
  app.post("/appointments", async (request, reply) => {
    const bodySchema = import_zod.z.object({
      titulo: import_zod.z.string().min(3, "T\xEDtulo \xE9 obrigat\xF3rio"),
      data: import_zod.z.coerce.date({ required_error: "Data \xE9 obrigat\xF3ria" }),
      observacoes: import_zod.z.preprocess(emptyToNull, import_zod.z.string().optional().nullable()),
      casoId: import_zod.z.string().uuid()
    });
    try {
      const { titulo, data, observacoes, casoId } = bodySchema.parse(request.body);
      const { sub: userId } = request.user;
      const agendamento = await prisma.agendamento.create({
        data: {
          titulo,
          data,
          observacoes,
          casoId,
          // Mapeamento correto
          responsavelId: userId
        },
        include: {
          responsavel: { select: { id: true, nome: true } },
          caso: { select: { id: true, nomeCompleto: true } }
        }
      });
      await prisma.caseLog.create({
        data: {
          casoId,
          autorId: userId,
          acao: import_client2.LogAction.AGENDAMENTO_CRIADO,
          descricao: `Agendou: ${titulo} para ${data.toLocaleDateString("pt-BR")}`
        }
      });
      return reply.status(201).send(agendamento);
    } catch (error) {
      console.error("Erro POST Appointment:", error);
      if (error instanceof import_zod.z.ZodError) return reply.status(400).send({ message: "Dados inv\xE1lidos", errors: error.flatten().fieldErrors });
      return reply.status(500).send({ message: "Erro ao criar agendamento." });
    }
  });
  app.delete("/appointments/:id", async (request, reply) => {
    const paramsSchema = import_zod.z.object({ id: import_zod.z.string().uuid() });
    try {
      const { id } = paramsSchema.parse(request.params);
      const { sub: userId } = request.user;
      const ag = await prisma.agendamento.findUnique({ where: { id } });
      if (!ag) return reply.status(404).send({ message: "Agendamento n\xE3o encontrado" });
      await prisma.agendamento.delete({ where: { id } });
      await prisma.caseLog.create({
        data: {
          casoId: ag.casoId,
          autorId: userId,
          acao: import_client2.LogAction.OUTRO,
          descricao: `Cancelou agendamento: ${ag.titulo}`
        }
      });
      return reply.status(204).send();
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao excluir." });
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  appointmentRoutes
});
