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
var import_fast_csv = require("fast-csv");
var import_date_fns = require("date-fns");
var import_locale = require("date-fns/locale");
var import_client2 = require("@prisma/client");
var calculateUrgencyWeight = (urgencia) => {
  const term = urgencia.trim();
  if (["Convive com agressor", "Idoso 80+", "Primeira inf\xE2ncia", "Risco de morte"].includes(term)) return 4;
  if (["Risco de reincid\xEAncia", "Sofre amea\xE7a", "Risco de desabrigo", "Crian\xE7a/Adolescente"].includes(term)) return 3;
  if (["PCD", "Idoso", "Interna\xE7\xE3o", "Acolhimento", "Gestante/Lactante"].includes(term)) return 2;
  return 1;
};
var formatDateForCsv = (date) => {
  return date && !isNaN(date.getTime()) ? (0, import_date_fns.format)(date, "dd/MM/yyyy", { locale: import_locale.ptBR }) : "N/A";
};
function internalError(reply, message, error) {
  console.error(message, error);
  return reply.status(500).send({ message });
}
function buildActiveCaseWhereClause(user) {
  switch (user.cargo) {
    case import_client2.Cargo.Agente_Social:
      return {
        agenteAcolhidaId: user.sub,
        status: { in: [import_client2.CaseStatus.AGUARDANDO_ACOLHIDA, import_client2.CaseStatus.EM_ACOLHIDA] }
      };
    case import_client2.Cargo.Especialista:
      return {
        especialistaPAEFIId: user.sub,
        status: import_client2.CaseStatus.EM_ACOMPANHAMENTO_PAEFI
      };
    case import_client2.Cargo.Gerente:
      return { status: import_client2.CaseStatus.AGUARDANDO_DISTRIBUICAO_PAEFI };
    default:
      return { id: "-1" };
  }
}
function buildClosedCaseWhereClause(user) {
  const where = { status: import_client2.CaseStatus.DESLIGADO };
  if (user.cargo === import_client2.Cargo.Agente_Social) where.agenteAcolhidaId = user.sub;
  if (user.cargo === import_client2.Cargo.Especialista) where.especialistaPAEFIId = user.sub;
  return where;
}
async function createLog(casoId, autorId, acao, descricao) {
  await prisma.caseLog.create({
    data: { casoId, autorId, acao, descricao }
  });
}
async function caseRoutes(app) {
  app.post("/cases", { onRequest: [app.authenticate] }, async (request, reply) => {
    const schema = import_zod.z.object({
      nomeCompleto: import_zod.z.string(),
      cpf: import_zod.z.string().length(11),
      nascimento: import_zod.z.coerce.date(),
      sexo: import_zod.z.string(),
      telefone: import_zod.z.string(),
      endereco: import_zod.z.string(),
      dataEntrada: import_zod.z.coerce.date(),
      urgencia: import_zod.z.string(),
      violacao: import_zod.z.string(),
      categoria: import_zod.z.string(),
      orgaoDemandante: import_zod.z.string(),
      agenteAcolhidaId: import_zod.z.string().uuid(),
      // [CORREÇÃO] Aceita null (nullable) explicitamente
      numeroSei: import_zod.z.string().nullable().optional(),
      // Link: Aceita URL válida, string vazia OU null
      linkSei: import_zod.z.union([import_zod.z.string().url(), import_zod.z.literal(""), import_zod.z.null()]).optional(),
      observacoes: import_zod.z.string().nullable().optional(),
      beneficios: import_zod.z.array(import_zod.z.string()).optional()
    });
    try {
      const data = schema.parse(request.body);
      const userId = request.user.sub;
      const pesoUrgencia = calculateUrgencyWeight(data.urgencia);
      const novoCaso = await prisma.case.create({
        data: {
          ...data,
          pesoUrgencia,
          // Garante que undefined vire null no banco
          numeroSei: data.numeroSei ?? null,
          linkSei: data.linkSei || null,
          // Se for string vazia, vira null
          observacoes: data.observacoes ?? null,
          beneficios: data.beneficios || []
        }
      });
      await createLog(novoCaso.id, userId, import_client2.LogAction.CRIACAO, "Caso cadastrado no sistema.");
      return reply.status(201).send(novoCaso);
    } catch (error) {
      if (error instanceof import_zod.z.ZodError) {
        console.log("Erro valida\xE7\xE3o POST:", error.flatten());
        return reply.status(400).send({ message: "Dados inv\xE1lidos.", errors: error.flatten().fieldErrors });
      }
      return internalError(reply, "Erro interno ao criar caso.", error);
    }
  });
  app.put("/cases/:id", { onRequest: [app.authenticate] }, async (request, reply) => {
    const paramsSchema = import_zod.z.object({ id: import_zod.z.string().uuid() });
    const bodySchema = import_zod.z.object({
      nomeCompleto: import_zod.z.string(),
      cpf: import_zod.z.string().length(11),
      nascimento: import_zod.z.coerce.date(),
      sexo: import_zod.z.string(),
      telefone: import_zod.z.string(),
      endereco: import_zod.z.string(),
      dataEntrada: import_zod.z.coerce.date(),
      urgencia: import_zod.z.string(),
      violacao: import_zod.z.string(),
      categoria: import_zod.z.string(),
      orgaoDemandante: import_zod.z.string(),
      agenteAcolhidaId: import_zod.z.string().uuid(),
      // [CORREÇÃO] .nullable() adicionado para aceitar null vindo do front
      numeroSei: import_zod.z.string().nullable().optional(),
      // Link: Aceita URL, string vazia ou null
      linkSei: import_zod.z.union([import_zod.z.string().url(), import_zod.z.literal(""), import_zod.z.null()]).optional(),
      observacoes: import_zod.z.string().nullable().optional(),
      beneficios: import_zod.z.array(import_zod.z.string()).optional()
    });
    try {
      const { id } = paramsSchema.parse(request.params);
      const data = bodySchema.parse(request.body);
      const userId = request.user.sub;
      const pesoUrgencia = calculateUrgencyWeight(data.urgencia);
      const updatedCaso = await prisma.case.update({
        where: { id },
        data: {
          ...data,
          pesoUrgencia,
          numeroSei: data.numeroSei ?? null,
          linkSei: data.linkSei || null,
          // String vazia vira null
          observacoes: data.observacoes ?? null,
          beneficios: data.beneficios || []
        }
      });
      await createLog(id, userId, import_client2.LogAction.OUTRO, "Editou dados cadastrais do caso.");
      return reply.send(updatedCaso);
    } catch (error) {
      if (error instanceof import_zod.z.ZodError) {
        console.log("Erro valida\xE7\xE3o PUT:", error.flatten());
        return reply.status(400).send({ message: "Dados inv\xE1lidos na edi\xE7\xE3o.", errors: error.flatten().fieldErrors });
      }
      return internalError(reply, "Erro ao editar caso.", error);
    }
  });
  app.get("/cases", { onRequest: [app.authenticate] }, async (request, reply) => {
    const schema = import_zod.z.object({
      search: import_zod.z.string().optional(),
      page: import_zod.z.coerce.number().min(1).default(1),
      pageSize: import_zod.z.coerce.number().min(1).max(100).default(10),
      status: import_zod.z.nativeEnum(import_client2.CaseStatus).optional(),
      urgencia: import_zod.z.string().optional(),
      violacao: import_zod.z.string().optional()
    });
    try {
      const { search, page, pageSize, status, urgencia, violacao } = schema.parse(request.query);
      let where = buildActiveCaseWhereClause(request.user);
      if (search) {
        where.AND = [
          ...where.AND || [],
          {
            OR: [
              { nomeCompleto: { contains: search, mode: "insensitive" } },
              { cpf: { contains: search } }
            ]
          }
        ];
      }
      if (status) where.status = status;
      if (urgencia && urgencia !== "all") where.urgencia = urgencia;
      if (violacao && violacao !== "all") where.violacao = { equals: violacao };
      const [items, total] = await Promise.all([
        prisma.case.findMany({
          where,
          orderBy: [
            { pesoUrgencia: "desc" },
            { createdAt: "desc" }
          ],
          take: pageSize,
          skip: (page - 1) * pageSize,
          include: {
            agenteAcolhida: { select: { nome: true } },
            especialistaPAEFI: { select: { nome: true } }
          }
        }),
        prisma.case.count({ where })
      ]);
      return reply.send({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
    } catch (error) {
      return internalError(reply, "Erro interno ao listar casos ativos.", error);
    }
  });
  app.get("/cases/closed", { onRequest: [app.authenticate] }, async (request, reply) => {
    const schema = import_zod.z.object({
      search: import_zod.z.string().optional(),
      page: import_zod.z.coerce.number().min(1).default(1),
      pageSize: import_zod.z.coerce.number().min(1).max(100).default(10)
    });
    try {
      const { search, page, pageSize } = schema.parse(request.query);
      let where = buildClosedCaseWhereClause(request.user);
      if (search) {
        where.OR = [
          { nomeCompleto: { contains: search, mode: "insensitive" } },
          { cpf: { contains: search } }
        ];
      }
      const [items, total] = await Promise.all([
        prisma.case.findMany({
          where,
          orderBy: { dataDesligamento: "desc" },
          take: pageSize,
          skip: (page - 1) * pageSize,
          select: {
            id: true,
            nomeCompleto: true,
            cpf: true,
            status: true,
            dataDesligamento: true,
            parecerFinal: true,
            urgencia: true,
            motivoDesligamento: true,
            agenteAcolhida: { select: { nome: true } },
            especialistaPAEFI: { select: { nome: true } }
          }
        }),
        prisma.case.count({ where })
      ]);
      return reply.send({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
    } catch (error) {
      return internalError(reply, "Erro interno ao listar casos finalizados.", error);
    }
  });
  app.get("/cases/:id", { onRequest: [app.authenticate] }, async (request, reply) => {
    try {
      const { id } = import_zod.z.object({ id: import_zod.z.string().uuid() }).parse(request.params);
      const caso = await prisma.case.findUnique({
        where: { id },
        include: {
          criadoPor: { select: { nome: true } },
          agenteAcolhida: { select: { id: true, nome: true } },
          especialistaPAEFI: { select: { id: true, nome: true } },
          logs: { orderBy: { createdAt: "desc" }, take: 20, include: { autor: { select: { nome: true } } } }
        }
      });
      if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
      return reply.send(caso);
    } catch (error) {
      return internalError(reply, "Erro ao buscar detalhes.", error);
    }
  });
  app.patch("/cases/:id/status", { onRequest: [app.authenticate] }, async (request, reply) => {
    const paramsSchema = import_zod.z.object({ id: import_zod.z.string().uuid() });
    const bodySchema = import_zod.z.object({ status: import_zod.z.nativeEnum(import_client2.CaseStatus) });
    try {
      const { id } = paramsSchema.parse(request.params);
      const { status } = bodySchema.parse(request.body);
      const { sub: userId, cargo } = request.user;
      const caso = await prisma.case.findUnique({ where: { id } });
      if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
      let updateData = { status };
      if (caso.status === import_client2.CaseStatus.DESLIGADO && status !== import_client2.CaseStatus.DESLIGADO) {
        updateData = { status: import_client2.CaseStatus.AGUARDANDO_ACOLHIDA, motivoDesligamento: null, dataDesligamento: null, parecerFinal: null };
      }
      const updated = await prisma.case.update({ where: { id }, data: updateData });
      if (caso.status !== status) await createLog(id, userId, import_client2.LogAction.MUDANCA_STATUS, `Alterou status para ${status}`);
      else await createLog(id, userId, import_client2.LogAction.MUDANCA_STATUS, `Reabriu caso.`);
      return reply.send(updated);
    } catch (error) {
      return internalError(reply, "Erro ao alterar status.", error);
    }
  });
  app.patch("/cases/:id/assign", { onRequest: [app.authenticate] }, async (request, reply) => {
    const params = import_zod.z.object({ id: import_zod.z.string().uuid() });
    const body = import_zod.z.object({ specialistId: import_zod.z.string().uuid() });
    try {
      const { id } = params.parse(request.params);
      const { specialistId } = body.parse(request.body);
      const { cargo, sub: userId } = request.user;
      if (cargo !== import_client2.Cargo.Gerente) return reply.status(403).send({ message: "Acesso negado." });
      const spec = await prisma.user.findUnique({ where: { id: specialistId } });
      const updated = await prisma.case.update({ where: { id }, data: { especialistaPAEFIId: specialistId, status: import_client2.CaseStatus.EM_ACOMPANHAMENTO_PAEFI, dataInicioPAEFI: /* @__PURE__ */ new Date() } });
      await createLog(id, userId, import_client2.LogAction.ATRIBUICAO, `Atribuiu a ${(spec == null ? void 0 : spec.nome) || "Desconhecido"}`);
      return reply.send(updated);
    } catch (error) {
      return internalError(reply, "Erro ao atribuir.", error);
    }
  });
  app.patch("/cases/:id/close", { onRequest: [app.authenticate] }, async (request, reply) => {
    const params = import_zod.z.object({ id: import_zod.z.string().uuid() });
    const body = import_zod.z.object({ parecerFinal: import_zod.z.string().min(10), motivoDesligamento: import_zod.z.string().min(1) });
    try {
      const { id } = params.parse(request.params);
      const { parecerFinal, motivoDesligamento } = body.parse(request.body);
      const { sub: userId, cargo } = request.user;
      const caso = await prisma.case.findUnique({ where: { id } });
      if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
      const isManager = cargo === import_client2.Cargo.Gerente;
      if (!isManager && caso.agenteAcolhidaId !== userId && caso.especialistaPAEFIId !== userId) return reply.status(403).send({ message: "Sem permiss\xE3o." });
      const updated = await prisma.case.update({ where: { id }, data: { status: import_client2.CaseStatus.DESLIGADO, parecerFinal, motivoDesligamento, dataDesligamento: /* @__PURE__ */ new Date() } });
      await createLog(id, userId, import_client2.LogAction.DESLIGAMENTO, `Desligou: ${motivoDesligamento}`);
      return reply.send(updated);
    } catch (error) {
      return internalError(reply, "Erro ao desligar.", error);
    }
  });
  app.get("/cases/export", { onRequest: [app.authenticate] }, async (request, reply) => {
    if (request.user.cargo !== import_client2.Cargo.Gerente) return reply.status(403).send({ message: "Acesso negado." });
    try {
      const casos = await prisma.case.findMany({ orderBy: { createdAt: "desc" }, include: { criadoPor: true, agenteAcolhida: true, especialistaPAEFI: true } });
      reply.header("Content-Disposition", `attachment; filename="export_casos_${(0, import_date_fns.format)(/* @__PURE__ */ new Date(), "yyyy-MM-dd")}.csv"`);
      reply.type("text/csv; charset=utf-8");
      const csv = (0, import_fast_csv.format)({ headers: true });
      csv.pipe(reply.raw);
      casos.forEach((c) => {
        var _a, _b;
        csv.write({ ID: c.id, Nome: c.nomeCompleto, CPF: c.cpf, Nascimento: formatDateForCsv(c.nascimento), Sexo: c.sexo, Telefone: c.telefone, Endereco: c.endereco, Entrada: formatDateForCsv(c.dataEntrada), Urgencia: c.urgencia, Violacao: c.violacao, Categoria: c.categoria, Orgao: c.orgaoDemandante, Status: c.status, Agente: ((_a = c.agenteAcolhida) == null ? void 0 : _a.nome) ?? "N/A", Especialista: ((_b = c.especialistaPAEFI) == null ? void 0 : _b.nome) ?? "N/A", Data_Desligamento: formatDateForCsv(c.dataDesligamento), Parecer_Final: c.parecerFinal ?? "N/A" });
      });
      csv.end();
    } catch (error) {
      return internalError(reply, "Erro ao exportar.", error);
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  caseRoutes
});
