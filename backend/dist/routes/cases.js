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

// src/routes/cases.ts
var cases_exports = {};
__export(cases_exports, {
  caseRoutes: () => caseRoutes
});
module.exports = __toCommonJS(cases_exports);
var import_zod = require("zod");

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var prisma = new import_client.PrismaClient();

// src/routes/cases.ts
var import_date_fns = require("date-fns");
var import_locale = require("date-fns/locale");
var formatDateForCsv = (date) => {
  if (date && !isNaN(date.getTime())) {
    return (0, import_date_fns.format)(date, "dd/MM/yyyy", { locale: import_locale.ptBR });
  }
  return "N/A";
};
function internalError(reply, message, error) {
  console.error(message, error);
  return reply.status(500).send({ message });
}
function buildActiveCaseWhereClause(user) {
  if (user.cargo === "Agente Social") {
    return {
      agenteAcolhidaId: user.sub,
      //
      status: { in: ["AGUARDANDO_ACOLHIDA", "EM_ACOLHIDA"] }
      //
    };
  }
  if (user.cargo === "Especialista") {
    return {
      especialistaPAEFIId: user.sub,
      //
      status: "EM_ACOMPANHAMENTO_PAEFI"
      //
    };
  }
  if (user.cargo === "Gerente") {
    return {
      status: "AGUARDANDO_DISTRIBUICAO_PAEFI"
      //
    };
  }
  return { id: "-1" };
}
function buildClosedCaseWhereClause(user) {
  const where = {
    status: "DESLIGADO"
    //
  };
  if (user.cargo === "Agente Social") {
    where.agenteAcolhidaId = user.sub;
  } else if (user.cargo === "Especialista") {
    where.especialistaPAEFIId = user.sub;
  }
  return where;
}
async function caseRoutes(app) {
  app.post(
    "/cases",
    { onRequest: [app.authenticate] },
    //
    async (request, reply) => {
      const createCaseBodySchema = import_zod.z.object({
        nomeCompleto: import_zod.z.string(),
        //
        cpf: import_zod.z.string().length(11),
        //
        nascimento: import_zod.z.coerce.date(),
        //
        sexo: import_zod.z.string(),
        //
        telefone: import_zod.z.string(),
        //
        endereco: import_zod.z.string(),
        //
        dataEntrada: import_zod.z.coerce.date(),
        //
        urgencia: import_zod.z.string(),
        //
        violacao: import_zod.z.string(),
        //
        categoria: import_zod.z.string(),
        //
        orgaoDemandante: import_zod.z.string(),
        //
        numeroSei: import_zod.z.string().optional(),
        //
        linkSei: import_zod.z.string().url().optional().or(import_zod.z.literal("")),
        // (Aceita URL ou string vazia)
        agenteAcolhidaId: import_zod.z.string().uuid(),
        //
        observacoes: import_zod.z.string().optional(),
        //
        beneficios: import_zod.z.array(import_zod.z.string()).optional()
        //
      });
      try {
        const dataToSave = createCaseBodySchema.parse(request.body);
        const userId = request.user.sub;
        const newCase = await prisma.case.create({
          //
          data: {
            ...dataToSave,
            criadoPorId: userId,
            //
            // Garante que campos opcionais não enviados sejam null
            numeroSei: dataToSave.numeroSei || null,
            linkSei: dataToSave.linkSei || null,
            observacoes: dataToSave.observacoes || null,
            beneficios: dataToSave.beneficios || []
          }
        });
        return await reply.status(201).send(newCase);
      } catch (error) {
        if (error instanceof import_zod.z.ZodError) {
          return await reply.status(400).send({
            message: "Dados inv\xE1lidos.",
            errors: error.flatten().fieldErrors
            //
          });
        }
        return internalError(reply, "Erro interno ao criar caso.", error);
      }
    }
  );
  app.get(
    "/cases",
    { onRequest: [app.authenticate] },
    //
    async (request, reply) => {
      const getCasesQuerySchema = import_zod.z.object({
        search: import_zod.z.string().optional(),
        //
        page: import_zod.z.coerce.number().min(1).default(1),
        //
        pageSize: import_zod.z.coerce.number().min(1).max(100).default(10)
        //
      });
      try {
        const { search, page, pageSize } = getCasesQuerySchema.parse(
          request.query
        );
        let whereClause = buildActiveCaseWhereClause(request.user);
        if (search) {
          whereClause.OR = [
            { nomeCompleto: { contains: search, mode: "insensitive" } },
            //
            { cpf: { contains: search } }
            //
          ];
        }
        const [cases, total] = await Promise.all([
          prisma.case.findMany({
            //
            where: whereClause,
            orderBy: { createdAt: "desc" },
            //
            take: pageSize,
            //
            skip: (page - 1) * pageSize,
            //
            include: {
              agenteAcolhida: { select: { nome: true } },
              //
              especialistaPAEFI: { select: { nome: true } }
              //
            }
          }),
          prisma.case.count({ where: whereClause })
          //
        ]);
        return await reply.status(200).send({
          //
          items: cases,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        });
      } catch (error) {
        return internalError(reply, "Erro interno ao listar casos ativos.", error);
      }
    }
  );
  app.get(
    "/cases/closed",
    { onRequest: [app.authenticate] },
    //
    async (request, reply) => {
      const getCasesQuerySchema = import_zod.z.object({
        search: import_zod.z.string().optional(),
        //
        page: import_zod.z.coerce.number().min(1).default(1),
        //
        pageSize: import_zod.z.coerce.number().min(1).max(100).default(10)
        //
      });
      try {
        const { search, page, pageSize } = getCasesQuerySchema.parse(
          request.query
        );
        let whereClause = buildClosedCaseWhereClause(request.user);
        if (search) {
          whereClause.OR = [
            { nomeCompleto: { contains: search, mode: "insensitive" } },
            //
            { cpf: { contains: search } }
            //
          ];
        }
        const [cases, total] = await Promise.all([
          prisma.case.findMany({
            //
            where: whereClause,
            orderBy: { dataDesligamento: "desc" },
            //
            take: pageSize,
            //
            skip: (page - 1) * pageSize,
            //
            select: {
              //
              id: true,
              nomeCompleto: true,
              cpf: true,
              status: true,
              dataDesligamento: true,
              parecerFinal: true,
              // Adiciona responsáveis para a tabela de fechados
              agenteAcolhida: { select: { nome: true } },
              especialistaPAEFI: { select: { nome: true } }
            }
          }),
          prisma.case.count({ where: whereClause })
          //
        ]);
        return await reply.status(200).send({
          //
          items: cases,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        });
      } catch (error) {
        return internalError(reply, "Erro interno ao listar casos finalizados.", error);
      }
    }
  );
  app.get(
    "/cases/:id",
    { onRequest: [app.authenticate] },
    //
    async (request, reply) => {
      const getCaseParamsSchema = import_zod.z.object({
        id: import_zod.z.string().uuid()
        //
      });
      try {
        const { id } = getCaseParamsSchema.parse(request.params);
        const caseDetail = await prisma.case.findUnique({
          //
          where: { id },
          include: {
            criadoPor: { select: { nome: true } },
            //
            agenteAcolhida: { select: { id: true, nome: true } },
            //
            especialistaPAEFI: { select: { id: true, nome: true } }
            //
          }
        });
        if (!caseDetail) {
          return await reply.status(404).send({ message: "Caso n\xE3o encontrado." });
        }
        return await reply.status(200).send(caseDetail);
      } catch (error) {
        return internalError(reply, "Erro interno ao buscar o caso.", error);
      }
    }
  );
  app.patch(
    "/cases/:id/status",
    { onRequest: [app.authenticate] },
    //
    async (request, reply) => {
      const paramsSchema = import_zod.z.object({ id: import_zod.z.string().uuid() });
      const bodySchema = import_zod.z.object({
        status: import_zod.z.enum([
          //
          "AGUARDANDO_ACOLHIDA",
          "EM_ACOLHIDA",
          "AGUARDANDO_DISTRIBUICAO_PAEFI",
          "EM_ACOMPANHAMENTO_PAEFI",
          "DESLIGADO"
        ])
      });
      try {
        const { id } = paramsSchema.parse(request.params);
        const { status } = bodySchema.parse(request.body);
        const { sub: userId, cargo } = request.user;
        const caseToUpdate = await prisma.case.findUnique({ where: { id } });
        if (!caseToUpdate) {
          return await reply.status(404).send({ message: "Caso n\xE3o encontrado." });
        }
        const isManager = cargo === "Gerente";
        const isResponsibleAgent = caseToUpdate.agenteAcolhidaId === userId;
        const isResponsibleSpecialist = caseToUpdate.especialistaPAEFIId === userId;
        if (caseToUpdate.status === "DESLIGADO" && status !== "DESLIGADO") {
          if (!isManager) {
            return await reply.status(403).send({ message: "Apenas Gerentes podem reabrir um caso." });
          }
        } else if (!isManager && !isResponsibleAgent && !isResponsibleSpecialist) {
          return await reply.status(403).send({ message: "Voc\xEA n\xE3o tem permiss\xE3o para esta a\xE7\xE3o." });
        }
        let data = { status };
        if (caseToUpdate.status === "DESLIGADO" && status !== "DESLIGADO") {
          data = {
            ...data,
            status: "AGUARDANDO_ACOLHIDA",
            // Sempre volta para a triagem inicial
            motivoDesligamento: null,
            //
            dataDesligamento: null,
            //
            parecerFinal: null
            //
          };
        }
        const updatedCase = await prisma.case.update({
          //
          where: { id },
          data
        });
        return await reply.status(200).send(updatedCase);
      } catch (error) {
        if (error instanceof import_zod.z.ZodError) {
          return await reply.status(400).send({
            message: "Dados de status inv\xE1lidos.",
            errors: error.flatten().fieldErrors
            //
          });
        }
        return internalError(reply, "Erro interno ao atualizar o status.", error);
      }
    }
  );
  app.patch(
    "/cases/:id/assign",
    { onRequest: [app.authenticate] },
    //
    async (request, reply) => {
      const paramsSchema = import_zod.z.object({ id: import_zod.z.string().uuid() });
      const bodySchema = import_zod.z.object({
        specialistId: import_zod.z.string().uuid()
        //
      });
      try {
        const { id } = paramsSchema.parse(request.params);
        const { specialistId } = bodySchema.parse(request.body);
        const { cargo } = request.user;
        if (cargo !== "Gerente") {
          return await reply.status(403).send({ message: "Apenas gerentes podem atribuir casos." });
        }
        const updatedCase = await prisma.case.update({
          //
          where: { id },
          data: {
            especialistaPAEFIId: specialistId,
            //
            status: "EM_ACOMPANHAMENTO_PAEFI",
            //
            dataInicioPAEFI: /* @__PURE__ */ new Date()
            //
          }
        });
        return await reply.status(200).send(updatedCase);
      } catch (error) {
        return internalError(reply, "Erro interno ao atribuir especialista.", error);
      }
    }
  );
  app.patch(
    "/cases/:id/close",
    { onRequest: [app.authenticate] },
    //
    async (request, reply) => {
      const paramsSchema = import_zod.z.object({ id: import_zod.z.string().uuid() });
      const bodySchema = import_zod.z.object({
        parecerFinal: import_zod.z.string().min(10, "O parecer final \xE9 muito curto."),
        //
        motivoDesligamento: import_zod.z.string().min(1, "O motivo de desligamento \xE9 obrigat\xF3rio.")
        //
      });
      try {
        const { id } = paramsSchema.parse(request.params);
        const { parecerFinal, motivoDesligamento } = bodySchema.parse(request.body);
        const { sub: userId, cargo } = request.user;
        const caseToClose = await prisma.case.findUnique({ where: { id } });
        if (!caseToClose) {
          return await reply.status(404).send({ message: "Caso n\xE3o encontrado." });
        }
        const isManager = cargo === "Gerente";
        const isResponsibleAgent = caseToClose.agenteAcolhidaId === userId;
        const isResponsibleSpecialist = caseToClose.especialistaPAEFIId === userId;
        if (!isManager && !isResponsibleAgent && !isResponsibleSpecialist) {
          return await reply.status(403).send({ message: "Voc\xEA n\xE3o tem permiss\xE3o para esta a\xE7\xE3o." });
        }
        const updatedCase = await prisma.case.update({
          //
          where: { id },
          data: {
            status: "DESLIGADO",
            //
            parecerFinal,
            //
            motivoDesligamento,
            //
            dataDesligamento: /* @__PURE__ */ new Date()
            //
          }
        });
        return await reply.status(200).send(updatedCase);
      } catch (error) {
        return internalError(reply, "Erro interno ao desligar o caso.", error);
      }
    }
  );
  app.get(
    "/cases/export",
    { onRequest: [app.authenticate] },
    //
    async (request, reply) => {
      if (request.user.cargo !== "Gerente") {
        return await reply.status(403).send({ message: "Acesso negado." });
      }
      try {
        const allCases = await prisma.case.findMany({
          //
          orderBy: { createdAt: "desc" },
          //
          include: {
            criadoPor: true,
            //
            agenteAcolhida: true,
            //
            especialistaPAEFI: true
            //
          }
        });
        reply.header(
          //
          "Content-Disposition",
          `attachment; filename="export_casos_${(0, import_date_fns.format)(
            /* @__PURE__ */ new Date(),
            "yyyy-MM-dd"
          )}.csv"`
          //
        );
        reply.type("text/csv; charset=utf-8");
        const csvStream = (0, import_date_fns.format)({ headers: true });
        csvStream.pipe(reply.raw);
        allCases.forEach((c) => {
          var _a, _b, _c;
          csvStream.write({
            //
            ID: c.id,
            Nome_Completo: c.nomeCompleto,
            //
            CPF: c.cpf,
            //
            Nascimento: formatDateForCsv(c.nascimento),
            //
            Sexo: c.sexo,
            //
            Telefone: c.telefone,
            //
            Endereco: c.endereco,
            //
            Data_Entrada: formatDateForCsv(c.dataEntrada),
            //
            Urgencia: c.urgencia,
            //
            Violacao: c.violacao,
            //
            Categoria: c.categoria,
            //
            Orgao_Demandante: c.orgaoDemandante,
            //
            Numero_SEI: c.numeroSei ?? "N/A",
            //
            Status: c.status,
            //
            Criado_Por: ((_a = c.criadoPor) == null ? void 0 : _a.nome) ?? "Utilizador Removido",
            //
            Agente_Acolhida: ((_b = c.agenteAcolhida) == null ? void 0 : _b.nome) ?? "N\xE3o Atribu\xEDdo",
            //
            Especialista_PAEFI: ((_c = c.especialistaPAEFI) == null ? void 0 : _c.nome) ?? "N\xE3o Atribu\xEDdo",
            //
            Data_Desligamento: formatDateForCsv(c.dataDesligamento),
            //
            Parecer_Final: c.parecerFinal ?? "N/A"
            //
          });
        });
        csvStream.end();
      } catch (error) {
        return internalError(reply, "Erro interno ao exportar dados.", error);
      }
    }
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  caseRoutes
});
