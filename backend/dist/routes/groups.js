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
  // Habilite logs apenas se quiser debugar queries lentas ou erros
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/groups.ts
var import_client2 = require("@prisma/client");
var import_date_fns = require("date-fns");
var import_locale = require("date-fns/locale");
async function groupRoutes(app) {
  app.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app.get("/groups", async (req, reply) => {
    try {
      const groups = await prisma.groupActivity.findMany({
        orderBy: { dataRealizacao: "desc" },
        include: {
          facilitador: { select: { nome: true } },
          _count: { select: { participantes: true } }
        }
      });
      return reply.send(groups);
    } catch (error) {
      console.error("Erro ao listar grupos:", error);
      return reply.status(500).send({ message: "Erro ao buscar grupos." });
    }
  });
  app.get("/groups/:id", async (req, reply) => {
    try {
      const { id } = import_zod.z.object({ id: import_zod.z.string().uuid() }).parse(req.params);
      const group = await prisma.groupActivity.findUnique({
        where: { id },
        include: {
          facilitador: { select: { id: true, nome: true } },
          participantes: {
            include: {
              caso: { select: { id: true, nomeCompleto: true, telefone: true } }
            },
            orderBy: { caso: { nomeCompleto: "asc" } }
            // Lista de chamada em ordem alfabética
          }
        }
      });
      if (!group) return reply.status(404).send({ message: "Grupo n\xE3o encontrado" });
      return reply.send(group);
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao buscar detalhes." });
    }
  });
  app.post("/groups", async (req, reply) => {
    try {
      const bodySchema = import_zod.z.object({
        tema: import_zod.z.string().min(3, "Tema \xE9 obrigat\xF3rio"),
        tipo: import_zod.z.nativeEnum(import_client2.GroupType),
        // Aceita array de strings ou string única (para compatibilidade)
        datas: import_zod.z.array(import_zod.z.string()).optional(),
        dataRealizacao: import_zod.z.string().optional(),
        local: import_zod.z.string().optional(),
        descricao: import_zod.z.string().optional(),
        orgaosEnvolvidos: import_zod.z.array(import_zod.z.string()).default([])
      });
      const data = bodySchema.parse(req.body);
      const { sub: userId } = req.user;
      let datesToCreate = [];
      if (data.datas && data.datas.length > 0) {
        datesToCreate = data.datas;
      } else if (data.dataRealizacao) {
        datesToCreate = [data.dataRealizacao];
      } else {
        return reply.status(400).send({ message: "Selecione pelo menos uma data." });
      }
      const createdGroups = await prisma.$transaction(
        datesToCreate.map((dateStr) => {
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
      return reply.status(201).send({ count: createdGroups.length, groups: createdGroups });
    } catch (error) {
      console.error("Erro ao criar grupo:", error);
      return reply.status(500).send({ message: "Erro ao criar atividade." });
    }
  });
  app.post("/groups/:id/participants", async (req, reply) => {
    try {
      const { id } = import_zod.z.object({ id: import_zod.z.string().uuid() }).parse(req.params);
      const { caseIds } = import_zod.z.object({ caseIds: import_zod.z.array(import_zod.z.string().uuid()) }).parse(req.body);
      const { sub: userId } = req.user;
      const group = await prisma.groupActivity.findUnique({ where: { id } });
      if (!group) return reply.status(404).send({ message: "Grupo n\xE3o encontrado." });
      const existingParticipants = await prisma.groupAttendance.findMany({
        where: {
          grupoId: id,
          casoId: { in: caseIds }
        },
        select: { casoId: true }
      });
      const existingIds = new Set(existingParticipants.map((p) => p.casoId));
      const newParticipantsIds = caseIds.filter((cid) => !existingIds.has(cid));
      if (newParticipantsIds.length === 0) {
        return reply.send({ message: "Todos os selecionados j\xE1 est\xE3o no grupo." });
      }
      const dataFormatada = (0, import_date_fns.format)(group.dataRealizacao, "dd/MM/yyyy", { locale: import_locale.ptBR });
      await prisma.$transaction(async (tx) => {
        for (const caseId of newParticipantsIds) {
          await tx.groupAttendance.create({
            data: { grupoId: id, casoId, presente: false }
          });
          await tx.evolucao.create({
            data: {
              casoId,
              autorId: userId,
              sigilo: false,
              conteudo: `[SISTEMA] Usu\xE1rio vinculado \xE0 atividade coletiva "${group.tema}" (${group.tipo}), prevista para ${dataFormatada}.`
            }
          });
        }
      });
      return reply.send({ message: `${newParticipantsIds.length} participantes adicionados.` });
    } catch (error) {
      console.error("\u274C Erro ao adicionar participantes:", error);
      return reply.status(500).send({ message: "Erro interno ao adicionar participantes." });
    }
  });
  app.patch("/groups/:groupId/attendance/:caseId", async (req, reply) => {
    try {
      const paramsSchema = import_zod.z.object({ groupId: import_zod.z.string().uuid(), caseId: import_zod.z.string().uuid() });
      const bodySchema = import_zod.z.object({ presente: import_zod.z.boolean(), observacoes: import_zod.z.string().optional() });
      const { groupId, caseId } = paramsSchema.parse(req.params);
      const { presente, observacoes } = bodySchema.parse(req.body);
      const { sub: userId } = req.user;
      const group = await prisma.groupActivity.findUnique({ where: { id: groupId } });
      if (!group) return reply.status(404).send({ message: "Grupo n\xE3o encontrado" });
      const attendance = await prisma.groupAttendance.update({
        where: {
          grupoId_casoId: { grupoId: groupId, casoId: caseId }
        },
        data: { presente, observacoes }
      });
      const statusTexto = presente ? "PRESENTE" : "AUSENTE";
      const obsTexto = observacoes ? ` Observa\xE7\xF5es: ${observacoes}` : "";
      const dataFormatada = (0, import_date_fns.format)(group.dataRealizacao, "dd/MM/yyyy", { locale: import_locale.ptBR });
      await Promise.all([
        prisma.evolucao.create({
          data: {
            casoId: caseId,
            autorId: userId,
            sigilo: false,
            conteudo: `[SISTEMA] Registro de Frequ\xEAncia - ${group.tema} (${dataFormatada}). Status: ${statusTexto}.${obsTexto}`
          }
        }),
        prisma.caseLog.create({
          data: {
            casoId: caseId,
            autorId: userId,
            acao: import_client2.LogAction.PRESENCA_REGISTRADA,
            descricao: `Presen\xE7a em grupo: ${statusTexto} (${group.tema})`
          }
        })
      ]);
      return reply.send(attendance);
    } catch (error) {
      console.error("\u274C Erro ao atualizar presen\xE7a:", error);
      return reply.status(500).send({ message: "Erro ao atualizar presen\xE7a." });
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  groupRoutes
});
