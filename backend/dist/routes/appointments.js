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
var import_date_fns = require("date-fns");
async function appointmentRoutes(app) {
  app.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      await reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app.get("/appointments", async (request, reply) => {
    const { sub: userId, cargo } = request.user;
    const querySchema = import_zod.z.object({
      month: import_zod.z.string().regex(/^\d{4}-\d{2}$/, "Formato de m\xEAs inv\xE1lido. Use YYYY-MM."),
      userId: import_zod.z.string().uuid().optional()
    });
    try {
      const { month, userId: queryUserId } = querySchema.parse(request.query);
      const firstDay = (0, import_date_fns.startOfMonth)((0, import_date_fns.parseISO)(month));
      const lastDay = (0, import_date_fns.endOfMonth)((0, import_date_fns.parseISO)(month));
      const whereClause = {
        data: {
          gte: firstDay,
          lte: lastDay
        }
      };
      if (cargo === "Gerente") {
        if (queryUserId) {
          whereClause.responsavelId = queryUserId;
        }
      } else {
        whereClause.responsavelId = userId;
      }
      const appointments = await prisma.agendamento.findMany({
        //
        where: whereClause,
        orderBy: {
          data: "asc"
        },
        include: {
          caso: {
            select: {
              id: true,
              nomeCompleto: true
            }
          },
          responsavel: {
            select: {
              nome: true
            }
          }
        }
      });
      return reply.status(200).send(appointments);
    } catch (error) {
      if (error instanceof import_zod.z.ZodError) {
        return reply.status(400).send({ message: "Dados inv\xE1lidos.", errors: error.flatten() });
      }
      console.error("Erro ao buscar agendamentos:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
  app.get("/cases/:caseId/appointments", async (request, reply) => {
    const paramsSchema = import_zod.z.object({ caseId: import_zod.z.string().uuid() });
    try {
      const { caseId } = paramsSchema.parse(request.params);
      const appointments = await prisma.agendamento.findMany({
        //
        where: { casoId: caseId },
        //
        orderBy: { data: "desc" },
        //
        include: {
          responsavel: { select: { id: true, nome: true } }
          //
        }
      });
      return reply.status(200).send(appointments);
    } catch (error) {
      request.log.error(error, "Erro ao buscar agendamentos do caso");
      return reply.status(500).send({ message: "Erro interno ao buscar agendamentos do caso." });
    }
  });
  app.post("/appointments", async (request, reply) => {
    const { sub: userId } = request.user;
    const createAppointmentSchema = import_zod.z.object({
      //
      titulo: import_zod.z.string().min(3, "O t\xEDtulo \xE9 muito curto."),
      //
      data: import_zod.z.string().min(1, "A data \xE9 obrigat\xF3ria."),
      //
      time: import_zod.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Hora inv\xE1lida."),
      //
      casoId: import_zod.z.string().uuid("Selecione um caso."),
      //
      observacoes: import_zod.z.string().optional()
    });
    try {
      const { titulo, data, time, casoId, observacoes } = createAppointmentSchema.parse(request.body);
      const dataHoraISO = `${data}T${time}:00.000`;
      const newAppointment = await prisma.agendamento.create({
        //
        data: {
          titulo,
          data: new Date(dataHoraISO),
          // Salva o DateTime completo
          observacoes,
          casoId,
          // Campo agora existe no schema
          responsavelId: userId
          // Campo agora existe no schema
        }
      });
      return reply.status(201).send(newAppointment);
    } catch (error) {
      if (error instanceof import_zod.z.ZodError) {
        return reply.status(400).send({ message: "Dados inv\xE1lidos.", errors: error.flatten() });
      }
      console.error("Erro ao criar agendamento:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  appointmentRoutes
});
