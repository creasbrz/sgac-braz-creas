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
    const { caseId, month } = import_zod.z.object({
      caseId: import_zod.z.string().uuid().optional(),
      month: import_zod.z.string().regex(/^\d{4}-\d{2}$/).optional()
      // YYYY-MM
    }).parse(request.query);
    const where = {};
    if (caseId) where.casoId = caseId;
    if (month) {
      const start = /* @__PURE__ */ new Date(`${month}-01T00:00:00`);
      const end = new Date(new Date(start).setMonth(start.getMonth() + 1));
      where.data = { gte: start, lt: end };
    }
    const appointments = await prisma.agendamento.findMany({
      where,
      orderBy: { data: "asc" },
      include: {
        responsavel: { select: { nome: true } },
        // [CORREÇÃO] Incluindo telefone para o botão de WhatsApp
        caso: {
          select: {
            id: true,
            nomeCompleto: true,
            telefone: true
          }
        }
      }
    });
    return reply.send(appointments);
  });
  app.post("/appointments", async (request, reply) => {
    const bodySchema = import_zod.z.object({
      titulo: import_zod.z.string().min(3),
      data: import_zod.z.coerce.date(),
      observacoes: import_zod.z.any().optional(),
      casoId: import_zod.z.string().uuid()
    });
    try {
      const { titulo, data, observacoes, casoId } = bodySchema.parse(request.body);
      const { sub: userId } = request.user;
      const agendamento = await prisma.agendamento.create({
        data: {
          titulo,
          data,
          observacoes: typeof observacoes === "string" ? observacoes : null,
          casoId,
          responsavelId: userId
        }
      });
      await prisma.caseLog.create({
        data: {
          casoId,
          autorId: userId,
          acao: import_client2.LogAction.AGENDAMENTO_CRIADO || import_client2.LogAction.OUTRO,
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
