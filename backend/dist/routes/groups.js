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
var prisma = new import_client.PrismaClient();

// src/routes/groups.ts
var import_client2 = require("@prisma/client");
var import_date_fns = require("date-fns");
var import_locale = require("date-fns/locale");
async function groupRoutes(app) {
  app.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send();
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
              caso: { select: { id: true, nomeCompleto: true } }
            }
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
        tema: import_zod.z.string().min(3),
        tipo: import_zod.z.nativeEnum(import_client2.GroupType),
        // Aceita array de strings ou string única (para compatibilidade)
        datas: import_zod.z.array(import_zod.z.string()).optional(),
        dataRealizacao: import_zod.z.string().optional(),
        local: import_zod.z.string().optional(),
        descricao: import_zod.z.string().optional(),
        orgaosEnvolvidos: import_zod.z.array(import_zod.z.string()).default([])
      });
      const data = bodySchema.parse(req.body);
      const userId = req.user.sub;
      let datesToCreate = [];
      if (data.datas && data.datas.length > 0) {
        datesToCreate = data.datas;
      } else if (data.dataRealizacao) {
        datesToCreate = [data.dataRealizacao];
      } else {
        return reply.status(400).send({ message: "Selecione pelo menos uma data." });
      }
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
      await prisma.caseLog.create({
        data: {
          casoId: "SISTEMA",
          // Log global ou associado ao usuário
          autorId: userId,
          acao: import_client2.LogAction.ATIVIDADE_GRUPO_CRIADA,
          descricao: `Criou atividade "${data.tema}" para ${datesToCreate.length} data(s).`
        }
      });
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
      const userId = req.user.sub;
      const group = await prisma.groupActivity.findUnique({ where: { id } });
      if (!group) return reply.status(404).send({ message: "Grupo n\xE3o encontrado." });
      let count = 0;
      for (const caseId of caseIds) {
        const exists = await prisma.groupAttendance.findUnique({
          where: {
            grupoId_casoId: { grupoId: id, casoId: caseId }
          }
        });
        if (!exists) {
          await prisma.groupAttendance.create({
            data: { grupoId: id, casoId: caseId, presente: false }
          });
          const dataFormatada = (0, import_date_fns.format)(group.dataRealizacao, "dd/MM/yyyy", { locale: import_locale.ptBR });
          await prisma.evolucao.create({
            data: {
              casoId: caseId,
              autorId: userId,
              sigilo: false,
              conteudo: `[SISTEMA] Usu\xE1rio vinculado \xE0 atividade "${group.tema}" (${group.tipo}), prevista para ${dataFormatada}.`
            }
          });
          count++;
        }
      }
      return reply.send({ message: `${count} participantes adicionados.` });
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
      const userId = req.user.sub;
      const group = await prisma.groupActivity.findUnique({ where: { id: groupId } });
      const attendance = await prisma.groupAttendance.update({
        where: {
          grupoId_casoId: { grupoId: groupId, casoId: caseId }
        },
        data: { presente, observacoes }
      });
      if (group) {
        const statusTexto = presente ? "PRESENTE" : "AUSENTE";
        const obsTexto = observacoes ? ` Observa\xE7\xF5es: ${observacoes}` : "";
        const dataFormatada = (0, import_date_fns.format)(group.dataRealizacao, "dd/MM/yyyy", { locale: import_locale.ptBR });
        await prisma.evolucao.create({
          data: {
            casoId: caseId,
            autorId: userId,
            sigilo: false,
            conteudo: `[SISTEMA] Registro de Frequ\xEAncia - ${group.tema} (${dataFormatada}). Status: ${statusTexto}.${obsTexto}`
          }
        });
      }
      await prisma.caseLog.create({
        data: {
          casoId: caseId,
          autorId: userId,
          acao: import_client2.LogAction.PRESENCA_REGISTRADA,
          descricao: `Presen\xE7a em grupo (${presente ? "Presente" : "Ausente"})`
        }
      });
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
