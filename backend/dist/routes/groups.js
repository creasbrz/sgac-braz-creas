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

// src/routes/groups.ts
var groups_exports = {};
__export(groups_exports, {
  groupRoutes: () => groupRoutes
});
module.exports = __toCommonJS(groups_exports);
var import_zod = require("zod");

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var globalForPrisma = global;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient({
  log: ["error"]
  // Reduzi logs para limpar o terminal, use ['query'] para debug
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/groups.ts
var import_client2 = require("@prisma/client");
var import_date_fns = require("date-fns");
var import_locale = require("date-fns/locale");
var groupResponseSchema = import_zod.z.object({
  id: import_zod.z.string().uuid(),
  tema: import_zod.z.string(),
  tipo: import_zod.z.nativeEnum(import_client2.GroupType),
  dataRealizacao: import_zod.z.date(),
  local: import_zod.z.string().nullable().optional(),
  descricao: import_zod.z.string().nullable().optional(),
  facilitador: import_zod.z.object({ nome: import_zod.z.string() }).optional(),
  _count: import_zod.z.object({ participantes: import_zod.z.number() }).optional(),
  attendanceConfirmed: import_zod.z.boolean().default(false),
  participantes: import_zod.z.array(import_zod.z.object({
    id: import_zod.z.string(),
    presente: import_zod.z.boolean(),
    casoId: import_zod.z.string().uuid(),
    caso: import_zod.z.object({
      id: import_zod.z.string(),
      nomeCompleto: import_zod.z.string()
    })
  })).optional()
});
var createGroupSchema = import_zod.z.object({
  tema: import_zod.z.string().min(3, "Tema deve ter no m\xEDnimo 3 caracteres"),
  tipo: import_zod.z.nativeEnum(import_client2.GroupType),
  datas: import_zod.z.array(import_zod.z.string()).optional(),
  dataRealizacao: import_zod.z.string().optional(),
  local: import_zod.z.string().optional(),
  descricao: import_zod.z.string().optional(),
  orgaosEnvolvidos: import_zod.z.array(import_zod.z.string()).default([])
});
async function groupRoutes(app) {
  const server = app.withTypeProvider();
  server.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado" });
    }
  });
  server.get("/groups", {
    schema: {
      tags: ["Grupos/Oficinas"],
      summary: "Listar atividades coletivas agendadas ou realizadas",
      response: {
        200: import_zod.z.array(groupResponseSchema)
      }
    }
  }, async (req, reply) => {
    const groups = await prisma.groupActivity.findMany({
      orderBy: { dataRealizacao: "desc" },
      take: 50,
      include: {
        facilitador: { select: { nome: true } },
        _count: { select: { participantes: true } }
      }
    });
    return reply.send(groups);
  });
  server.get("/groups/:id", {
    schema: {
      tags: ["Grupos/Oficinas"],
      summary: "Obter detalhes e lista de participantes do grupo",
      params: import_zod.z.object({ id: import_zod.z.string().uuid() }),
      response: {
        200: groupResponseSchema
      }
    }
  }, async (req, reply) => {
    const { id } = req.params;
    const group = await prisma.groupActivity.findUnique({
      where: { id },
      include: {
        facilitador: { select: { id: true, nome: true } },
        participantes: {
          include: {
            caso: { select: { id: true, nomeCompleto: true } }
          },
          orderBy: { caso: { nomeCompleto: "asc" } }
        }
      }
    });
    if (!group) return reply.status(404).send({ message: "Grupo n\xE3o encontrado" });
    return reply.send(group);
  });
  server.get("/groups/:id/candidates", {
    schema: {
      tags: ["Grupos/Oficinas"],
      summary: "Listar casos ativos eleg\xEDveis para entrar no grupo",
      params: import_zod.z.object({ id: import_zod.z.string().uuid() }),
      response: {
        200: import_zod.z.array(import_zod.z.object({
          id: import_zod.z.string(),
          nomeCompleto: import_zod.z.string(),
          status: import_zod.z.string()
        }))
      }
    }
  }, async (req, reply) => {
    const { id } = req.params;
    const existingMembers = await prisma.groupAttendance.findMany({
      where: { grupoId: id },
      select: { casoId: true }
    });
    const excludedIds = existingMembers.map((m) => m.casoId);
    const candidates = await prisma.case.findMany({
      where: {
        id: { notIn: excludedIds },
        status: { notIn: ["DESLIGADO", "AGUARDANDO_ACOLHIDA"] }
      },
      select: {
        id: true,
        nomeCompleto: true,
        status: true
      },
      orderBy: { nomeCompleto: "asc" },
      take: 200
    });
    return reply.send(candidates);
  });
  server.post("/groups", {
    schema: {
      tags: ["Grupos/Oficinas"],
      summary: "Agendar nova atividade coletiva",
      body: createGroupSchema,
      response: {
        201: import_zod.z.object({ count: import_zod.z.number(), message: import_zod.z.string() })
      }
    }
  }, async (req, reply) => {
    const data = req.body;
    const userId = req.user.sub;
    let datesToCreate = [];
    if (data.datas && data.datas.length > 0) {
      datesToCreate = data.datas;
    } else if (data.dataRealizacao) {
      datesToCreate = [data.dataRealizacao];
    } else {
      return reply.status(400).send({ message: "Selecione pelo menos uma data." });
    }
    try {
      const createdGroups = await Promise.all(
        datesToCreate.map(async (dateStr) => {
          return prisma.groupActivity.create({
            data: {
              tema: data.tema,
              tipo: data.tipo,
              dataRealizacao: new Date(dateStr),
              local: data.local,
              descricao: data.descricao,
              orgaosEnvolvidos: data.orgaosEnvolvidos,
              facilitadorId: userId
            }
          });
        })
      );
      return reply.status(201).send({
        count: createdGroups.length,
        message: `Atividade agendada para ${createdGroups.length} datas.`
      });
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ message: "Erro ao criar atividade." });
    }
  });
  server.post("/groups/:id/participants", {
    schema: {
      tags: ["Grupos/Oficinas"],
      summary: "Vincular m\xFAltiplos casos ao grupo",
      params: import_zod.z.object({ id: import_zod.z.string().uuid() }),
      body: import_zod.z.object({ caseIds: import_zod.z.array(import_zod.z.string().uuid()) }),
      response: {
        200: import_zod.z.object({ message: import_zod.z.string() })
      }
    }
  }, async (req, reply) => {
    const { id } = req.params;
    const { caseIds } = req.body;
    const userId = req.user.sub;
    const group = await prisma.groupActivity.findUnique({ where: { id } });
    if (!group) return reply.status(404).send({ message: "Grupo n\xE3o encontrado." });
    const dataFormatada = (0, import_date_fns.format)(group.dataRealizacao, "dd/MM/yyyy", { locale: import_locale.ptBR });
    try {
      const count = await prisma.$transaction(async (tx) => {
        let added = 0;
        for (const caseId of caseIds) {
          const existing = await tx.groupAttendance.findUnique({
            where: {
              grupoId_casoId: { grupoId: id, casoId: caseId }
              // [CORREÇÃO] Explicitamente casoId: caseId
            }
          });
          if (!existing) {
            await tx.groupAttendance.create({
              data: { grupoId: id, casoId: caseId, presente: false }
              // [CORREÇÃO] Explicitamente casoId: caseId
            });
            await tx.evolucao.create({
              data: {
                casoId: caseId,
                // [CORREÇÃO] Explicitamente casoId: caseId
                autorId: userId,
                sigilo: false,
                conteudo: `[SISTEMA - GRUPO] Vinculado \xE0 atividade "${group.tema}" (${group.tipo}), prevista para ${dataFormatada}.`
              }
            });
            added++;
          }
        }
        return added;
      });
      return reply.send({ message: `${count} participantes adicionados com sucesso.` });
    } catch (error) {
      console.error("\u274C Erro ao adicionar participantes:", error);
      return reply.status(500).send({ message: "Erro interno ao adicionar participantes." });
    }
  });
  server.patch("/groups/:groupId/attendance/:caseId", {
    schema: {
      tags: ["Grupos/Oficinas"],
      summary: "Registrar presen\xE7a e observa\xE7\xF5es do participante",
      params: import_zod.z.object({
        groupId: import_zod.z.string().uuid(),
        caseId: import_zod.z.string().uuid()
      }),
      body: import_zod.z.object({
        presente: import_zod.z.boolean(),
        observacoes: import_zod.z.string().optional()
      }),
      response: {
        200: import_zod.z.any()
      }
    }
  }, async (req, reply) => {
    const { groupId, caseId } = req.params;
    const { presente, observacoes } = req.body;
    const userId = req.user.sub;
    try {
      const result = await prisma.$transaction(async (tx) => {
        const group = await tx.groupActivity.findUnique({ where: { id: groupId } });
        const attendance = await tx.groupAttendance.findUnique({
          where: { grupoId_casoId: { grupoId: groupId, casoId: caseId } }
          // [CORREÇÃO] Explicitamente casoId: caseId
        });
        if (!attendance) throw new Error("Participa\xE7\xE3o n\xE3o encontrada");
        const updatedAttendance = await tx.groupAttendance.update({
          where: { id: attendance.id },
          data: { presente, observacoes }
        });
        if (group) {
          const statusTexto = presente ? "PRESENTE" : "AUSENTE";
          const obsTexto = observacoes ? ` Obs: ${observacoes}` : "";
          const dataFormatada = (0, import_date_fns.format)(group.dataRealizacao, "dd/MM/yyyy", { locale: import_locale.ptBR });
          await tx.evolucao.create({
            data: {
              casoId: caseId,
              // [CORREÇÃO] Explicitamente casoId: caseId
              autorId: userId,
              sigilo: false,
              conteudo: `[SISTEMA - FREQU\xCANCIA] Atividade: ${group.tema} (${dataFormatada}). Status: ${statusTexto}.${obsTexto}`
            }
          });
        }
        await tx.caseLog.create({
          data: {
            casoId: caseId,
            // [CORREÇÃO] Explicitamente casoId: caseId
            autorId: userId,
            acao: import_client2.LogAction.PRESENCA_REGISTRADA,
            descricao: `Presen\xE7a em grupo (${presente ? "Presente" : "Ausente"})`
          }
        });
        return updatedAttendance;
      });
      return reply.send(result);
    } catch (error) {
      console.error("\u274C Erro ao atualizar presen\xE7a:", error);
      if (error.message === "Participa\xE7\xE3o n\xE3o encontrada") {
        return reply.status(404).send({ message: "Participante n\xE3o vinculado a este grupo." });
      }
      return reply.status(500).send({ message: "Erro ao atualizar presen\xE7a." });
    }
  });
  server.patch("/groups/:id/confirm", {
    schema: {
      tags: ["Grupos/Oficinas"],
      summary: "Confirmar que a atividade foi realizada e a chamada finalizada",
      params: import_zod.z.object({ id: import_zod.z.string().uuid() }),
      response: {
        200: import_zod.z.object({ message: import_zod.z.string(), attendanceConfirmed: import_zod.z.boolean() })
      }
    }
  }, async (req, reply) => {
    const { id } = req.params;
    const group = await prisma.groupActivity.update({
      where: { id },
      data: { attendanceConfirmed: true }
    });
    return reply.send({
      message: "Atividade confirmada e finalizada com sucesso.",
      attendanceConfirmed: group.attendanceConfirmed
    });
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  groupRoutes
});
