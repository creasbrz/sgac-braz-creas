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
    const { caseId } = import_zod.z.object({ caseId: import_zod.z.string().uuid().optional() }).parse(request.query);
    const where = caseId ? { casoId } : {};
    const appointments = await prisma.agendamento.findMany({
      where,
      orderBy: { data: "asc" },
      include: { responsavel: { select: { nome: true } } }
    });
    return reply.send(appointments);
  });
  app.post("/appointments", async (request, reply) => {
    console.log("\u{1F4E5} Recebido no Backend:", request.body);
    const bodySchema = import_zod.z.object({
      titulo: import_zod.z.string().min(3, "O t\xEDtulo deve ter pelo menos 3 letras"),
      data: import_zod.z.coerce.date(),
      // Converte string ISO para Date
      observacoes: import_zod.z.any().optional(),
      // Aceita string ou null
      casoId: import_zod.z.string().uuid("ID do caso inv\xE1lido")
    });
    try {
      const { titulo, data, observacoes, casoId: casoId2 } = bodySchema.parse(request.body);
      const { sub: userId } = request.user;
      const action = import_client2.LogAction.AGENDAMENTO_CRIADO ? import_client2.LogAction.AGENDAMENTO_CRIADO : import_client2.LogAction.OUTRO;
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
          acao: action,
          descricao: `Agendou: ${titulo} para ${data.toLocaleDateString("pt-BR")}`
        }
      });
      return reply.status(201).send(agendamento);
    } catch (error) {
      if (error instanceof import_zod.z.ZodError) {
        console.error("\u274C Erro de Valida\xE7\xE3o Zod:", JSON.stringify(error.format(), null, 2));
        return reply.status(400).send({ message: "Dados inv\xE1lidos", errors: error.format() });
      }
      console.error("\u274C Erro Interno:", error);
      return reply.status(500).send({ message: "Erro interno ao criar agendamento." });
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  appointmentRoutes
});
