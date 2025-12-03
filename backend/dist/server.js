var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/server.ts
var import_fastify = __toESM(require("fastify"));
var import_cors = __toESM(require("@fastify/cors"));
var import_jwt = __toESM(require("@fastify/jwt"));
var import_static = __toESM(require("@fastify/static"));
var import_multipart = __toESM(require("@fastify/multipart"));
var import_path3 = __toESM(require("path"));
var import_fs3 = __toESM(require("fs"));

// src/routes/auth.ts
var import_zod = require("zod");

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var prisma = new import_client.PrismaClient();

// src/routes/auth.ts
var import_bcryptjs = __toESM(require("bcryptjs"));
async function authRoutes(app2) {
  app2.post("/register", async (request, reply) => {
    const registerBodySchema = import_zod.z.object({
      nome: import_zod.z.string(),
      email: import_zod.z.string().email(),
      senha: import_zod.z.string().min(6),
      cargo: import_zod.z.enum(["Gerente", "Agente Social", "Especialista"])
      //
    });
    try {
      const { nome, email, senha, cargo } = registerBodySchema.parse(
        request.body
      );
      const userExists = await prisma.user.findUnique({ where: { email } });
      if (userExists) {
        return await reply.status(409).send({ message: "Email j\xE1 registado." });
      }
      const hashedPassword = await import_bcryptjs.default.hash(senha, 8);
      const user = await prisma.user.create({
        data: {
          nome,
          email,
          senha: hashedPassword,
          cargo,
          ativo: true
          // Garante que o usuário registrado seja ativo
        }
      });
      return await reply.status(201).send({
        //
        message: "Utilizador criado com sucesso!",
        user: { id: user.id, nome: user.nome, email: user.email }
      });
    } catch (error) {
      request.log.error(error, "Erro ao registar utilizador");
      return await reply.status(500).send({ message: "Erro interno do servidor." });
    }
  });
  app2.post("/login", async (request, reply) => {
    const loginBodySchema = import_zod.z.object({
      email: import_zod.z.string().email("Email inv\xE1lido."),
      senha: import_zod.z.string().min(6, "A senha deve ter no m\xEDnimo 6 caracteres.")
      //
    });
    try {
      const { email, senha } = loginBodySchema.parse(request.body);
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return await reply.status(401).send({ message: "Credenciais inv\xE1lidas." });
      }
      if (!user.ativo) {
        return await reply.status(403).send({ message: "Este usu\xE1rio est\xE1 desativado." });
      }
      const isPasswordCorrect = await import_bcryptjs.default.compare(senha, user.senha);
      if (!isPasswordCorrect) {
        return await reply.status(401).send({ message: "Credenciais inv\xE1lidas." });
      }
      const token = app2.jwt.sign(
        {
          // Payload (informações dentro do token)
          nome: user.nome,
          //
          cargo: user.cargo
          //
        },
        {
          // Metadados (informações sobre o token)
          sub: user.id,
          // 'sub' (subject) é o ID do usuário
          expiresIn: "7d"
          // Token expira em 7 dias
        }
      );
      return await reply.status(200).send({ token });
    } catch (error) {
      request.log.error(error, "Erro no processo de login");
      return await reply.status(500).send({ message: "Ocorreu um erro inesperado no servidor." });
    }
  });
  app2.get(
    "/me",
    { onRequest: [app2.authenticate] },
    async (request, reply) => {
      const userId = request.user.sub;
      const user = await prisma.user.findUnique({
        where: { id: userId, ativo: true },
        // Garante que o usuário ainda está ativo
        select: {
          id: true,
          //
          nome: true,
          //
          email: true,
          //
          cargo: true
          //
        }
      });
      if (!user) {
        return await reply.status(404).send({ message: "Utilizador n\xE3o encontrado." });
      }
      return await reply.status(200).send(user);
    }
  );
}

// src/routes/cases.ts
var import_zod2 = require("zod");
var import_fast_csv = require("fast-csv");
var import_date_fns = require("date-fns");
var import_locale = require("date-fns/locale");
var import_client2 = require("@prisma/client");
var stripTime = (date) => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};
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
function detectChanges(oldData, newData) {
  const changes = {};
  const ignoreFields = ["updatedAt", "createdAt", "pesoUrgencia", "numeroSei", "linkSei", "observacoes", "beneficios", "criadoPorId", "id"];
  for (const key in newData) {
    if (ignoreFields.includes(key)) continue;
    let val1 = oldData[key];
    let val2 = newData[key];
    if ((val1 instanceof Date || typeof val1 === "string") && (val2 instanceof Date || typeof val2 === "string")) {
      const d1 = new Date(val1);
      const d2 = new Date(val2);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        const s1 = d1.toISOString().split("T")[0];
        const s2 = d2.toISOString().split("T")[0];
        if (s1 === s2) continue;
      }
    }
    if (val1 !== val2) {
      if (!val1 && !val2) continue;
      changes[key] = { from: val1, to: val2 };
    }
  }
  return changes;
}
async function createLog(casoId2, autorId, acao, descricao, valorAnterior, valorNovo) {
  await prisma.caseLog.create({
    data: { casoId: casoId2, autorId, acao, descricao, valorAnterior, valorNovo }
  });
}
async function caseRoutes(app2) {
  app2.decorate("authenticate", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      await reply.send(err);
    }
  });
  app2.post("/cases", { onRequest: [app2.authenticate] }, async (request, reply) => {
    const schema = import_zod2.z.object({
      nomeCompleto: import_zod2.z.string(),
      cpf: import_zod2.z.string().length(11),
      nascimento: import_zod2.z.coerce.date(),
      sexo: import_zod2.z.string(),
      telefone: import_zod2.z.string(),
      endereco: import_zod2.z.string(),
      dataEntrada: import_zod2.z.coerce.date(),
      urgencia: import_zod2.z.string(),
      violacao: import_zod2.z.string(),
      categoria: import_zod2.z.string(),
      orgaoDemandante: import_zod2.z.string(),
      agenteAcolhidaId: import_zod2.z.string().uuid(),
      numeroSei: import_zod2.z.string().nullable().optional(),
      linkSei: import_zod2.z.string().url().nullable().optional().or(import_zod2.z.literal("")),
      observacoes: import_zod2.z.string().nullable().optional(),
      beneficios: import_zod2.z.array(import_zod2.z.string()).optional()
    });
    try {
      const data = schema.parse(request.body);
      const userId = request.user.sub;
      const pesoUrgencia = calculateUrgencyWeight(data.urgencia);
      const novoCaso = await prisma.case.create({
        data: {
          ...data,
          nascimento: stripTime(data.nascimento),
          dataEntrada: stripTime(data.dataEntrada),
          pesoUrgencia,
          criadoPorId: userId,
          numeroSei: data.numeroSei ?? null,
          linkSei: data.linkSei || null,
          observacoes: data.observacoes ?? null,
          beneficios: data.beneficios || []
        }
      });
      await createLog(novoCaso.id, userId, import_client2.LogAction.CRIACAO, "Caso cadastrado no sistema.");
      return reply.status(201).send(novoCaso);
    } catch (error) {
      if (error instanceof import_zod2.z.ZodError) {
        return reply.status(400).send({ message: "Dados inv\xE1lidos.", errors: error.flatten().fieldErrors });
      }
      return internalError(reply, "Erro interno ao criar caso.", error);
    }
  });
  app2.put("/cases/:id", { onRequest: [app2.authenticate] }, async (request, reply) => {
    var _a;
    const paramsSchema = import_zod2.z.object({ id: import_zod2.z.string().uuid() });
    const bodySchema = import_zod2.z.object({
      nomeCompleto: import_zod2.z.string(),
      cpf: import_zod2.z.string().length(11),
      nascimento: import_zod2.z.coerce.date(),
      sexo: import_zod2.z.string(),
      telefone: import_zod2.z.string(),
      endereco: import_zod2.z.string(),
      dataEntrada: import_zod2.z.coerce.date(),
      urgencia: import_zod2.z.string(),
      violacao: import_zod2.z.string(),
      categoria: import_zod2.z.string(),
      orgaoDemandante: import_zod2.z.string(),
      agenteAcolhidaId: import_zod2.z.string().uuid(),
      numeroSei: import_zod2.z.string().nullable().optional(),
      linkSei: import_zod2.z.string().url().nullable().optional().or(import_zod2.z.literal("")),
      observacoes: import_zod2.z.string().nullable().optional(),
      beneficios: import_zod2.z.array(import_zod2.z.string()).optional()
    });
    try {
      const { id } = paramsSchema.parse(request.params);
      const rawData = bodySchema.parse(request.body);
      const userId = request.user.sub;
      const data = {
        ...rawData,
        nascimento: stripTime(rawData.nascimento),
        dataEntrada: stripTime(rawData.dataEntrada)
      };
      const oldCase = await prisma.case.findUnique({
        where: { id },
        include: { agenteAcolhida: { select: { nome: true } } }
      });
      if (!oldCase) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
      const pesoUrgencia = calculateUrgencyWeight(data.urgencia);
      const updatedCaso = await prisma.case.update({
        where: { id },
        data: {
          ...data,
          pesoUrgencia,
          numeroSei: data.numeroSei ?? null,
          linkSei: data.linkSei || null,
          observacoes: data.observacoes ?? null,
          beneficios: data.beneficios || []
        }
      });
      const changes = detectChanges(oldCase, data);
      if (changes["agenteAcolhidaId"]) {
        const newAgentId = changes["agenteAcolhidaId"].to;
        const newAgent = await prisma.user.findUnique({ where: { id: newAgentId } });
        changes["Agente Respons\xE1vel"] = {
          from: ((_a = oldCase.agenteAcolhida) == null ? void 0 : _a.nome) || "Sem agente",
          to: (newAgent == null ? void 0 : newAgent.nome) || "Desconhecido"
        };
        delete changes["agenteAcolhidaId"];
      }
      const keys = Object.keys(changes);
      if (keys.length > 0) {
        await createLog(
          id,
          userId,
          import_client2.LogAction.OUTRO,
          `Editou ${keys.length} campos: ${keys.join(", ")}`,
          JSON.stringify(changes),
          null
        );
      }
      return reply.send(updatedCaso);
    } catch (error) {
      if (error instanceof import_zod2.z.ZodError) {
        return reply.status(400).send({ message: "Dados inv\xE1lidos na edi\xE7\xE3o.", errors: error.flatten().fieldErrors });
      }
      return internalError(reply, "Erro ao editar caso.", error);
    }
  });
  app2.get("/cases", { onRequest: [app2.authenticate] }, async (request, reply) => {
    const schema = import_zod2.z.object({
      search: import_zod2.z.string().optional(),
      page: import_zod2.z.coerce.number().min(1).default(1),
      pageSize: import_zod2.z.coerce.number().min(1).max(100).default(10),
      status: import_zod2.z.nativeEnum(import_client2.CaseStatus).optional(),
      urgencia: import_zod2.z.string().optional(),
      violacao: import_zod2.z.string().optional(),
      categoria: import_zod2.z.string().optional(),
      sexo: import_zod2.z.string().optional(),
      // [NOVO] Parâmetro para controlar a visão: 'my' (padrão) ou 'all'
      view: import_zod2.z.enum(["my", "all"]).default("my").optional()
    });
    try {
      const { search, page, pageSize, status, urgencia, violacao, categoria, sexo, view } = schema.parse(request.query);
      let where = {};
      if (view === "all") {
        where = {
          status: { not: import_client2.CaseStatus.DESLIGADO }
        };
      } else {
        where = buildActiveCaseWhereClause(request.user);
      }
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
      if (categoria && categoria !== "all") where.categoria = { equals: categoria };
      if (sexo && sexo !== "all") where.sexo = { equals: sexo };
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
  app2.get("/cases/closed", { onRequest: [app2.authenticate] }, async (request, reply) => {
    const schema = import_zod2.z.object({
      search: import_zod2.z.string().optional(),
      page: import_zod2.z.coerce.number().min(1).default(1),
      pageSize: import_zod2.z.coerce.number().min(1).max(100).default(10)
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
  app2.get("/cases/:id", { onRequest: [app2.authenticate] }, async (request, reply) => {
    try {
      const { id } = import_zod2.z.object({ id: import_zod2.z.string().uuid() }).parse(request.params);
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
  app2.patch("/cases/:id/status", { onRequest: [app2.authenticate] }, async (request, reply) => {
    const paramsSchema = import_zod2.z.object({ id: import_zod2.z.string().uuid() });
    const bodySchema = import_zod2.z.object({ status: import_zod2.z.nativeEnum(import_client2.CaseStatus) });
    try {
      const { id } = paramsSchema.parse(request.params);
      const { status } = bodySchema.parse(request.body);
      const { sub: userId } = request.user;
      const caso = await prisma.case.findUnique({ where: { id } });
      if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
      let updateData = { status };
      if (caso.status === import_client2.CaseStatus.DESLIGADO && status !== import_client2.CaseStatus.DESLIGADO) {
        updateData = { status: import_client2.CaseStatus.AGUARDANDO_ACOLHIDA, motivoDesligamento: null, dataDesligamento: null, parecerFinal: null };
      }
      const updated = await prisma.case.update({ where: { id }, data: updateData });
      if (caso.status !== status) await createLog(id, userId, import_client2.LogAction.MUDANCA_STATUS, `Alterou status para ${status}`, caso.status, status);
      else await createLog(id, userId, import_client2.LogAction.MUDANCA_STATUS, `Reabriu caso.`);
      return reply.send(updated);
    } catch (error) {
      return internalError(reply, "Erro ao alterar status.", error);
    }
  });
  app2.patch("/cases/:id/assign", { onRequest: [app2.authenticate] }, async (request, reply) => {
    var _a;
    const params = import_zod2.z.object({ id: import_zod2.z.string().uuid() });
    const body = import_zod2.z.object({ specialistId: import_zod2.z.string().uuid() });
    try {
      const { id } = params.parse(request.params);
      const { specialistId } = body.parse(request.body);
      const { cargo, sub: userId } = request.user;
      if (cargo !== import_client2.Cargo.Gerente) return reply.status(403).send({ message: "Acesso negado." });
      const oldCase = await prisma.case.findUnique({ where: { id }, include: { especialistaPAEFI: true } });
      const spec = await prisma.user.findUnique({ where: { id: specialistId } });
      const updated = await prisma.case.update({ where: { id }, data: { especialistaPAEFIId: specialistId, status: import_client2.CaseStatus.EM_ACOMPANHAMENTO_PAEFI, dataInicioPAEFI: /* @__PURE__ */ new Date() } });
      const oldName = ((_a = oldCase == null ? void 0 : oldCase.especialistaPAEFI) == null ? void 0 : _a.nome) || "Nenhum";
      await createLog(id, userId, import_client2.LogAction.ATRIBUICAO, `Atribuiu a ${(spec == null ? void 0 : spec.nome) || "Desconhecido"}`, oldName, spec == null ? void 0 : spec.nome);
      return reply.send(updated);
    } catch (error) {
      return internalError(reply, "Erro ao atribuir.", error);
    }
  });
  app2.patch("/cases/:id/close", { onRequest: [app2.authenticate] }, async (request, reply) => {
    const params = import_zod2.z.object({ id: import_zod2.z.string().uuid() });
    const body = import_zod2.z.object({ parecerFinal: import_zod2.z.string().min(10), motivoDesligamento: import_zod2.z.string().min(1) });
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
  app2.get("/cases/export", { onRequest: [app2.authenticate] }, async (request, reply) => {
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

// src/routes/users.ts
var import_zod3 = require("zod");
var import_client3 = require("@prisma/client");
async function userRoutes(app2) {
  app2.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      await reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.get("/users", async (request, reply) => {
    const { sub: userId, cargo } = request.user;
    if (cargo !== import_client3.Cargo.Gerente) {
      return reply.status(403).send({ message: "Acesso negado." });
    }
    try {
      const users = await prisma.user.findMany({
        where: {
          id: { not: userId },
          // Não inclui o próprio gerente logado
          ativo: true
        },
        orderBy: { nome: "asc" },
        select: {
          id: true,
          nome: true,
          email: true,
          cargo: true,
          ativo: true
        }
      });
      return reply.status(200).send(users);
    } catch (error) {
      console.error("Erro ao listar usu\xE1rios:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
  app2.get("/users/agents", async (request, reply) => {
    try {
      const agents = await prisma.user.findMany({
        where: {
          cargo: import_client3.Cargo.Agente_Social,
          // [CORREÇÃO] Uso do Enum com underline
          ativo: true
        },
        orderBy: { nome: "asc" },
        select: {
          id: true,
          nome: true
        }
      });
      return reply.status(200).send(agents);
    } catch (error) {
      console.error("Erro ao listar Agentes Sociais:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
  app2.get("/users/specialists", async (request, reply) => {
    try {
      const specialists = await prisma.user.findMany({
        where: {
          cargo: import_client3.Cargo.Especialista,
          // [CORREÇÃO]
          ativo: true
        },
        orderBy: { nome: "asc" },
        select: {
          id: true,
          nome: true
        }
      });
      return reply.status(200).send(specialists);
    } catch (error) {
      console.error("Erro ao listar Especialistas:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
  app2.put("/users/:id", async (request, reply) => {
    const { cargo } = request.user;
    if (cargo !== import_client3.Cargo.Gerente) {
      return reply.status(403).send({ message: "Acesso negado." });
    }
    const paramsSchema = import_zod3.z.object({ id: import_zod3.z.string().uuid() });
    const bodySchema = import_zod3.z.object({
      nome: import_zod3.z.string().min(3),
      email: import_zod3.z.string().email(),
      cargo: import_zod3.z.nativeEnum(import_client3.Cargo)
      // Valida se é "Gerente", "Agente_Social", etc.
    });
    try {
      const { id } = paramsSchema.parse(request.params);
      const rawData = request.body;
      let cargoValue = rawData.cargo;
      if (cargoValue === "Agente Social") cargoValue = import_client3.Cargo.Agente_Social;
      if (cargoValue === "Especialista") cargoValue = import_client3.Cargo.Especialista;
      if (cargoValue === "Gerente") cargoValue = import_client3.Cargo.Gerente;
      const data = bodySchema.parse({ ...rawData, cargo: cargoValue });
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          nome: data.nome,
          email: data.email,
          cargo: data.cargo
        }
      });
      return reply.status(200).send(updatedUser);
    } catch (error) {
      console.error("Erro ao atualizar usu\xE1rio:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
  app2.delete("/users/:id", async (request, reply) => {
    const { cargo } = request.user;
    if (cargo !== import_client3.Cargo.Gerente) {
      return reply.status(403).send({ message: "Acesso negado." });
    }
    const paramsSchema = import_zod3.z.object({ id: import_zod3.z.string().uuid() });
    try {
      const { id } = paramsSchema.parse(request.params);
      await prisma.user.update({
        where: { id },
        data: {
          ativo: false
        }
      });
      return reply.status(204).send();
    } catch (error) {
      console.error("Erro ao desativar usu\xE1rio:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
}

// src/routes/evolutions.ts
var import_zod4 = require("zod");
var import_client4 = require("@prisma/client");
async function evolutionRoutes(app2) {
  app2.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.get("/cases/:caseId/evolutions", async (request, reply) => {
    const { caseId } = import_zod4.z.object({ caseId: import_zod4.z.string().uuid() }).parse(request.params);
    const { sub: userId, cargo } = request.user;
    const evolucoes = await prisma.evolucao.findMany({
      where: { casoId: caseId },
      orderBy: { createdAt: "desc" },
      include: {
        autor: { select: { id: true, nome: true, cargo: true } }
      }
    });
    const filteredEvolucoes = evolucoes.filter((evo) => {
      if (!evo.sigilo) return true;
      if (cargo === import_client4.Cargo.Gerente) return true;
      if (evo.autorId === userId) return true;
      return false;
    });
    return reply.send(filteredEvolucoes);
  });
  app2.post("/cases/:caseId/evolutions", async (request, reply) => {
    const { caseId } = import_zod4.z.object({ caseId: import_zod4.z.string().uuid() }).parse(request.params);
    const bodySchema = import_zod4.z.object({
      conteudo: import_zod4.z.string().min(1),
      sigilo: import_zod4.z.boolean().optional().default(false)
      // [NOVO]
    });
    const { conteudo, sigilo } = bodySchema.parse(request.body);
    const { sub: userId } = request.user;
    const evolucao = await prisma.evolucao.create({
      data: {
        conteudo,
        sigilo,
        casoId: caseId,
        autorId: userId
      },
      include: { autor: true }
    });
    await prisma.caseLog.create({
      data: {
        casoId: caseId,
        autorId: userId,
        acao: import_client4.LogAction.EVOLUCAO_CRIADA,
        // Se for sigiloso, não mostra detalhes no log público
        descricao: sigilo ? "Registrou uma evolu\xE7\xE3o SIGILOSA." : "Adicionou uma nova evolu\xE7\xE3o t\xE9cnica."
      }
    });
    return reply.status(201).send(evolucao);
  });
}

// src/routes/paf.ts
var import_zod5 = require("zod");
var import_client5 = require("@prisma/client");
async function pafRoutes(app2) {
  const pafBodySchema = import_zod5.z.object({
    diagnostico: import_zod5.z.string().min(10, "O diagn\xF3stico deve conter ao menos 10 caracteres."),
    objetivos: import_zod5.z.string().min(10, "Os objetivos devem conter ao menos 10 caracteres."),
    estrategias: import_zod5.z.string().min(10, "As estrat\xE9gias devem conter ao menos 10 caracteres."),
    deadline: import_zod5.z.coerce.date({ required_error: "A data do prazo \xE9 obrigat\xF3ria." })
  });
  const paramsSchema = import_zod5.z.object({
    caseId: import_zod5.z.string().uuid()
  });
  app2.get(
    "/cases/:caseId/paf",
    { onRequest: [app2.authenticate] },
    async (request, reply) => {
      try {
        const { caseId } = paramsSchema.parse(request.params);
        const paf = await prisma.paf.findUnique({
          where: { casoId: caseId },
          include: {
            autor: { select: { id: true, nome: true } }
          }
        });
        return reply.status(200).send(paf);
      } catch (error) {
        console.error("\u274C Erro ao buscar PAF:", error);
        return reply.status(500).send({ message: "Erro interno ao buscar PAF." });
      }
    }
  );
  app2.get(
    "/cases/:caseId/paf/history",
    { onRequest: [app2.authenticate] },
    async (request, reply) => {
      try {
        const { caseId } = paramsSchema.parse(request.params);
        const paf = await prisma.paf.findUnique({ where: { casoId } });
        if (!paf) return reply.status(200).send([]);
        const history = await prisma.pafVersion.findMany({
          where: { pafId: paf.id },
          orderBy: { savedAt: "desc" },
          include: {
            autor: { select: { nome: true } }
          }
        });
        return reply.status(200).send(history);
      } catch (error) {
        console.error("\u274C Erro ao buscar hist\xF3rico do PAF:", error);
        return reply.status(500).send({ message: "Erro ao buscar hist\xF3rico do PAF." });
      }
    }
  );
  app2.post(
    "/cases/:caseId/paf",
    { onRequest: [app2.authenticate] },
    async (request, reply) => {
      try {
        const { caseId } = paramsSchema.parse(request.params);
        const data = pafBodySchema.parse(request.body);
        const { sub: autorId, cargo } = request.user;
        if (cargo !== "Especialista" && cargo !== "Gerente") {
          return reply.status(403).send({ message: "Apenas especialistas podem criar um PAF." });
        }
        const created = await prisma.paf.create({
          data: {
            ...data,
            casoId: caseId,
            autorId,
            versaoAtual: 1
          }
        });
        await prisma.caseLog.create({
          data: {
            casoId,
            autorId,
            acao: import_client5.LogAction.PAF_CRIADO,
            descricao: "Criou o PAF do caso.",
            valorNovo: JSON.stringify(data)
          }
        });
        return reply.status(201).send(created);
      } catch (error) {
        console.error("\u274C Erro ao criar PAF:", error);
        return reply.status(500).send({ message: "Erro interno ao criar PAF." });
      }
    }
  );
  app2.put(
    "/cases/:caseId/paf",
    { onRequest: [app2.authenticate] },
    async (request, reply) => {
      try {
        const { caseId } = paramsSchema.parse(request.params);
        const bodyData = pafBodySchema.partial().parse(request.body);
        const { sub: userId, cargo } = request.user;
        const existing = await prisma.paf.findUnique({ where: { casoId } });
        if (!existing) {
          return reply.status(404).send({ message: "PAF n\xE3o encontrado." });
        }
        if (existing.autorId !== userId && cargo !== "Gerente") {
          return reply.status(403).send({ message: "Sem permiss\xE3o para editar este PAF." });
        }
        const nextVersionNumber = existing.versaoAtual + 1;
        await prisma.pafVersion.create({
          data: {
            pafId: existing.id,
            diagnostico: existing.diagnostico,
            objetivos: existing.objetivos,
            estrategias: existing.estrategias,
            deadline: existing.deadline,
            autorId: existing.autorId,
            versaoNumero: existing.versaoAtual
          }
        });
        const updated = await prisma.paf.update({
          where: { casoId },
          data: {
            ...bodyData,
            autorId: userId,
            versaoAtual: nextVersionNumber,
            updatedAt: /* @__PURE__ */ new Date()
          }
        });
        await prisma.caseLog.create({
          data: {
            casoId,
            autorId: userId,
            acao: import_client5.LogAction.PAF_ATUALIZADO,
            descricao: `Atualizou o PAF para a vers\xE3o ${nextVersionNumber}.`,
            valorAnterior: JSON.stringify(existing),
            valorNovo: JSON.stringify(bodyData)
          }
        });
        return reply.status(200).send(updated);
      } catch (error) {
        console.error("\u274C Erro ao atualizar PAF:", error);
        return reply.status(500).send({ message: "Erro interno ao atualizar PAF." });
      }
    }
  );
}

// src/routes/stats.ts
var import_date_fns2 = require("date-fns");
var import_client6 = require("@prisma/client");
var import_zod6 = require("zod");
async function statsRoutes(app2) {
  app2.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.get("/stats/advanced", async (request, reply) => {
    const { cargo } = request.user;
    const querySchema = import_zod6.z.object({
      months: import_zod6.z.coerce.number().default(12),
      violacao: import_zod6.z.string().optional()
    });
    const { months, violacao } = querySchema.parse(request.query);
    if (cargo !== import_client6.Cargo.Gerente) return reply.status(403).send({ message: "Acesso restrito." });
    try {
      const today = /* @__PURE__ */ new Date();
      const startDate = (0, import_date_fns2.startOfMonth)((0, import_date_fns2.subMonths)(today, months - 1));
      const whereClause = {
        OR: [
          { dataEntrada: { gte: startDate } },
          { dataDesligamento: { gte: startDate } }
        ]
      };
      if (violacao && violacao !== "all") {
        whereClause.violacao = violacao;
      }
      const cases = await prisma.case.findMany({
        where: whereClause,
        select: {
          id: true,
          dataEntrada: true,
          dataDesligamento: true,
          status: true,
          violacao: true
        }
      });
      const monthlyStats = /* @__PURE__ */ new Map();
      for (let i = 0; i < months; i++) {
        const d = (0, import_date_fns2.subMonths)(today, months - 1 - i);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        monthlyStats.set(key, {
          name: d.toLocaleDateString("pt-BR", { month: "short" }).toUpperCase(),
          novos: 0,
          fechados: 0
        });
      }
      const violationCount = {};
      cases.forEach((c) => {
        const inKey = `${c.dataEntrada.getFullYear()}-${c.dataEntrada.getMonth()}`;
        if (monthlyStats.has(inKey)) monthlyStats.get(inKey).novos++;
        if (c.dataDesligamento) {
          const outKey = `${c.dataDesligamento.getFullYear()}-${c.dataDesligamento.getMonth()}`;
          if (monthlyStats.has(outKey)) monthlyStats.get(outKey).fechados++;
        }
        const v = c.violacao || "N\xE3o Informado";
        violationCount[v] = (violationCount[v] || 0) + 1;
      });
      const pieData = Object.entries(violationCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
      const closedCases = cases.filter((c) => c.dataDesligamento);
      const totalDays = closedCases.reduce((acc, c) => {
        return acc + Math.ceil(Math.abs(c.dataDesligamento.getTime() - c.dataEntrada.getTime()) / 864e5);
      }, 0);
      const avgHandlingTime = closedCases.length > 0 ? Math.round(totalDays / closedCases.length) : 0;
      const activeTotal = await prisma.case.count({ where: { status: { not: import_client6.CaseStatus.DESLIGADO } } });
      const insights = [];
      const trendData = Array.from(monthlyStats.values());
      const last = trendData[trendData.length - 1];
      const prev = trendData[trendData.length - 2];
      if (last && prev && prev.novos > 0) {
        const diff = (last.novos - prev.novos) / prev.novos * 100;
        if (diff > 15) insights.push(`\u{1F4C8} Aumento de ${Math.round(diff)}% na demanda.`);
        else if (diff < -15) insights.push(`\u{1F4C9} Queda de ${Math.abs(Math.round(diff))}% na demanda.`);
      }
      if (avgHandlingTime > 120) insights.push(`\u26A0\uFE0F Tempo m\xE9dio alto (${avgHandlingTime} dias).`);
      if (pieData.length > 0) insights.push(`\u{1F50D} Principal demanda: ${pieData[0].name} (${pieData[0].value} casos).`);
      return reply.send({
        trendData,
        avgHandlingTime,
        totalActive: activeTotal,
        insights,
        pieData
      });
    } catch (error) {
      return reply.status(500).send({ message: "Erro interno." });
    }
  });
  app2.get("/stats/productivity", async (request, reply) => {
    try {
      const users = await prisma.user.findMany({
        where: { ativo: true, cargo: { not: import_client6.Cargo.Gerente } },
        select: {
          id: true,
          nome: true,
          cargo: true,
          _count: {
            select: {
              casosDeAcolhida: { where: { status: { in: [import_client6.CaseStatus.AGUARDANDO_ACOLHIDA, import_client6.CaseStatus.EM_ACOLHIDA] } } },
              casosDeAcompanhamento: { where: { status: import_client6.CaseStatus.EM_ACOMPANHAMENTO_PAEFI } }
            }
          }
        }
      });
      const data = users.map((u) => ({
        name: u.nome.split(" ")[0],
        value: u._count.casosDeAcolhida + u._count.casosDeAcompanhamento,
        role: u.cargo
      })).sort((a, b) => b.value - a.value);
      return reply.send(data);
    } catch (error) {
      return reply.status(500).send([]);
    }
  });
  app2.get("/stats/heatmap", async (request, reply) => {
    const querySchema = import_zod6.z.object({ months: import_zod6.z.coerce.number().default(12) });
    const { months } = querySchema.parse(request.query);
    try {
      const startDate = (0, import_date_fns2.subMonths)(/* @__PURE__ */ new Date(), months);
      const logs = await prisma.caseLog.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true }
      });
      const map = /* @__PURE__ */ new Map();
      logs.forEach((l) => {
        const day = (0, import_date_fns2.format)(l.createdAt, "yyyy-MM-dd");
        map.set(day, (map.get(day) || 0) + 1);
      });
      const result = Array.from(map.entries()).map(([date, count]) => ({ date, count }));
      return reply.send(result);
    } catch (error) {
      return reply.status(500).send([]);
    }
  });
  app2.get("/stats", async (request, reply) => {
    const { cargo, sub: userId } = request.user;
    const today = /* @__PURE__ */ new Date();
    const firstDayOfMonth = (0, import_date_fns2.startOfMonth)(today);
    const lastDayOfMonth = (0, import_date_fns2.endOfMonth)(today);
    try {
      if (cargo === import_client6.Cargo.Gerente) {
        const [totalCases, acolhidasCount, acompanhamentosCount, newCases, closedCases] = await Promise.all([
          prisma.case.count(),
          prisma.case.count({ where: { status: { in: [import_client6.CaseStatus.AGUARDANDO_ACOLHIDA, import_client6.CaseStatus.EM_ACOLHIDA] } } }),
          prisma.case.count({ where: { status: import_client6.CaseStatus.EM_ACOMPANHAMENTO_PAEFI } }),
          prisma.case.count({ where: { dataEntrada: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
          prisma.case.count({ where: { status: import_client6.CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } })
        ]);
        const [agentWorkload, specialistWorkload] = await Promise.all([
          prisma.user.findMany({
            where: { cargo: import_client6.Cargo.Agente_Social, ativo: true },
            select: { nome: true, casosDeAcolhida: { where: { status: { in: [import_client6.CaseStatus.AGUARDANDO_ACOLHIDA, import_client6.CaseStatus.EM_ACOLHIDA] } } } }
          }),
          prisma.user.findMany({
            where: { cargo: import_client6.Cargo.Especialista, ativo: true },
            select: { nome: true, casosDeAcompanhamento: { where: { status: import_client6.CaseStatus.EM_ACOMPANHAMENTO_PAEFI } } }
          })
        ]);
        const [urgencyGroups, categoryGroups, violationGroups] = await Promise.all([
          prisma.case.groupBy({ by: ["urgencia"], _count: { _all: true }, where: { status: { not: import_client6.CaseStatus.DESLIGADO } } }),
          prisma.case.groupBy({ by: ["categoria"], _count: { _all: true }, where: { status: { not: import_client6.CaseStatus.DESLIGADO } } }),
          prisma.case.groupBy({ by: ["violacao"], _count: { _all: true }, where: { status: { not: import_client6.CaseStatus.DESLIGADO } } })
        ]);
        return reply.send({
          role: "Gerente",
          totalCases,
          acolhidasCount,
          acompanhamentosCount,
          newCasesThisMonth: newCases,
          closedCasesThisMonth: closedCases,
          workloadByAgent: agentWorkload.map((u) => ({ name: u.nome, value: u.casosDeAcolhida.length })),
          workloadBySpecialist: specialistWorkload.map((u) => ({ name: u.nome, value: u.casosDeAcompanhamento.length })),
          casesByUrgency: urgencyGroups.map((g) => ({ name: g.urgencia, value: g._count._all })),
          casesByCategory: categoryGroups.map((g) => ({ name: g.categoria, value: g._count._all })),
          productivity: [...agentWorkload, ...specialistWorkload].map((u) => {
            var _a, _b;
            return { name: u.nome, value: (((_a = u.casosDeAcolhida) == null ? void 0 : _a.length) || 0) + (((_b = u.casosDeAcompanhamento) == null ? void 0 : _b.length) || 0) };
          })
        });
      }
      if (cargo === import_client6.Cargo.Agente_Social) {
        const [myActive, myClosed, myNew] = await Promise.all([
          prisma.case.count({ where: { agenteAcolhidaId: userId, status: { in: [import_client6.CaseStatus.AGUARDANDO_ACOLHIDA, import_client6.CaseStatus.EM_ACOLHIDA] } } }),
          prisma.case.count({ where: { agenteAcolhidaId: userId, status: import_client6.CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
          prisma.case.count({ where: { agenteAcolhidaId: userId, dataEntrada: { gte: firstDayOfMonth, lte: lastDayOfMonth } } })
        ]);
        return reply.send({ role: "Agente Social", myActiveCases: myActive, myClosedMonth: myClosed, myNewCasesMonth: myNew });
      }
      if (cargo === import_client6.Cargo.Especialista) {
        const [myActive, myClosed, myNew] = await Promise.all([
          prisma.case.count({ where: { especialistaPAEFIId: userId, status: import_client6.CaseStatus.EM_ACOMPANHAMENTO_PAEFI } }),
          prisma.case.count({ where: { especialistaPAEFIId: userId, status: import_client6.CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
          prisma.case.count({ where: { especialistaPAEFIId: userId, dataInicioPAEFI: { gte: firstDayOfMonth, lte: lastDayOfMonth } } })
        ]);
        return reply.send({ role: "Especialista", myActiveCases: myActive, myClosedMonth: myClosed, myNewCasesMonth: myNew });
      }
      return reply.status(200).send({ message: "Sem dados." });
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ message: "Erro no servidor." });
    }
  });
  app2.get("/stats/my-agenda", async (request, reply) => {
    const { sub: userId } = request.user;
    try {
      const start = (0, import_date_fns2.startOfDay)(/* @__PURE__ */ new Date());
      const appointments = await prisma.agendamento.findMany({
        where: {
          responsavelId: userId,
          data: { gte: start }
        },
        orderBy: { data: "asc" },
        take: 5,
        // Pega os 5 próximos
        include: { caso: { select: { id: true, nomeCompleto: true } } }
      });
      return reply.send(appointments);
    } catch {
      return reply.status(500).send({ message: "Erro ao buscar agenda." });
    }
  });
}

// src/routes/appointments.ts
var import_zod7 = require("zod");
var import_client7 = require("@prisma/client");
async function appointmentRoutes(app2) {
  app2.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.get("/appointments", async (request, reply) => {
    const { caseId } = import_zod7.z.object({ caseId: import_zod7.z.string().uuid().optional() }).parse(request.query);
    const where = caseId ? { casoId: caseId } : {};
    const appointments = await prisma.agendamento.findMany({
      where,
      orderBy: { data: "asc" },
      include: {
        responsavel: { select: { nome: true } },
        // [CORREÇÃO]: Incluindo os dados do caso para não quebrar o frontend
        caso: {
          select: {
            id: true,
            nomeCompleto: true
          }
        }
      }
    });
    return reply.send(appointments);
  });
  app2.post("/appointments", async (request, reply) => {
    console.log("\u{1F4E5} Recebido no Backend:", request.body);
    const bodySchema = import_zod7.z.object({
      titulo: import_zod7.z.string().min(3, "O t\xEDtulo deve ter pelo menos 3 letras"),
      data: import_zod7.z.coerce.date(),
      // Converte string ISO para Date
      observacoes: import_zod7.z.any().optional(),
      // Aceita string ou null
      casoId: import_zod7.z.string().uuid("ID do caso inv\xE1lido")
    });
    try {
      const { titulo, data, observacoes, casoId: casoId2 } = bodySchema.parse(request.body);
      const { sub: userId } = request.user;
      const action = import_client7.LogAction.AGENDAMENTO_CRIADO ? import_client7.LogAction.AGENDAMENTO_CRIADO : import_client7.LogAction.OUTRO;
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
      if (error instanceof import_zod7.z.ZodError) {
        console.error("\u274C Erro de Valida\xE7\xE3o Zod:", JSON.stringify(error.format(), null, 2));
        return reply.status(400).send({ message: "Dados inv\xE1lidos", errors: error.format() });
      }
      console.error("\u274C Erro Interno:", error);
      return reply.status(500).send({ message: "Erro interno ao criar agendamento." });
    }
  });
}

// src/routes/reports.ts
var import_zod8 = require("zod");
var import_date_fns3 = require("date-fns");
var import_client8 = require("@prisma/client");
async function reportRoutes(app2) {
  app2.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
      const { cargo } = request.user;
      if (cargo !== import_client8.Cargo.Gerente) {
        return reply.status(403).send({ message: "Acesso negado." });
      }
    } catch (err) {
      await reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.get("/reports/team-overview", async (request, reply) => {
    try {
      const technicians = await prisma.user.findMany({
        where: {
          cargo: { in: [import_client8.Cargo.Agente_Social, import_client8.Cargo.Especialista] },
          ativo: true
        },
        select: { id: true, nome: true, cargo: true },
        orderBy: { cargo: "asc" }
      });
      const activeCases = await prisma.case.findMany({
        where: {
          status: { not: import_client8.CaseStatus.DESLIGADO }
        },
        select: {
          id: true,
          nomeCompleto: true,
          cpf: true,
          // [NOVO]
          sexo: true,
          // [NOVO]
          urgencia: true,
          // [NOVO]
          violacao: true,
          // [NOVO]
          dataEntrada: true,
          // [NOVO]
          status: true,
          agenteAcolhidaId: true,
          especialistaPAEFIId: true,
          agenteAcolhida: { select: { nome: true } },
          // [NOVO] Para exibir nome na tabela
          especialistaPAEFI: { select: { nome: true } }
          // [NOVO] Para exibir nome na tabela
        },
        orderBy: { pesoUrgencia: "desc" }
        // Ordenar por prioridade dentro da equipe
      });
      const overview = technicians.map((tech) => {
        const techCases = activeCases.filter((c) => {
          if (tech.cargo === import_client8.Cargo.Agente_Social) {
            return c.agenteAcolhidaId === tech.id && (c.status === import_client8.CaseStatus.AGUARDANDO_ACOLHIDA || c.status === import_client8.CaseStatus.EM_ACOLHIDA);
          }
          if (tech.cargo === import_client8.Cargo.Especialista) {
            return c.especialistaPAEFIId === tech.id && c.status === import_client8.CaseStatus.EM_ACOMPANHAMENTO_PAEFI;
          }
          return false;
        });
        return {
          nome: tech.nome,
          cargo: tech.cargo === import_client8.Cargo.Agente_Social ? "Agente Social" : "Especialista",
          cases: techCases
          // Agora contém o objeto completo do caso
        };
      });
      return reply.status(200).send(overview);
    } catch (error) {
      console.error("Erro /reports/team-overview:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
  app2.get("/reports/rma", async (request, reply) => {
    const querySchema = import_zod8.z.object({
      month: import_zod8.z.string().regex(/^\d{4}-\d{2}$/, "Formato inv\xE1lido (YYYY-MM).")
    });
    try {
      const { month } = querySchema.parse(request.query);
      const targetMonth = (0, import_date_fns3.parseISO)(month);
      const firstDay = (0, import_date_fns3.startOfMonth)(targetMonth);
      const lastDay = (0, import_date_fns3.endOfMonth)(targetMonth);
      const initialCount = await prisma.case.count({
        where: {
          status: import_client8.CaseStatus.EM_ACOMPANHAMENTO_PAEFI,
          dataInicioPAEFI: { lt: firstDay },
          OR: [
            { dataDesligamento: null },
            { dataDesligamento: { gte: firstDay } }
          ]
        }
      });
      const newEntries = await prisma.case.findMany({
        where: {
          dataInicioPAEFI: { gte: firstDay, lte: lastDay }
        },
        select: { id: true, sexo: true, nascimento: true }
      });
      const closedCases = await prisma.case.count({
        where: {
          status: import_client8.CaseStatus.DESLIGADO,
          dataDesligamento: { gte: firstDay, lte: lastDay }
        }
      });
      const finalCount = initialCount + newEntries.length - closedCases;
      const profileBySex = { masculino: 0, feminino: 0, outro: 0 };
      newEntries.forEach((c) => {
        if (c.sexo === "Masculino") profileBySex.masculino++;
        else if (c.sexo === "Feminino") profileBySex.feminino++;
        else profileBySex.outro++;
      });
      const profileByAgeGroup = {
        "0-6": 0,
        "7-12": 0,
        "13-17": 0,
        "18-29": 0,
        "30-59": 0,
        "60+": 0
      };
      const now = /* @__PURE__ */ new Date();
      newEntries.forEach((c) => {
        const age = now.getFullYear() - new Date(c.nascimento).getFullYear();
        if (age <= 6) profileByAgeGroup["0-6"]++;
        else if (age <= 12) profileByAgeGroup["7-12"]++;
        else if (age <= 17) profileByAgeGroup["13-17"]++;
        else if (age <= 29) profileByAgeGroup["18-29"]++;
        else if (age <= 59) profileByAgeGroup["30-59"]++;
        else profileByAgeGroup["60+"]++;
      });
      return reply.status(200).send({
        initialCount,
        newEntries: newEntries.length,
        closedCases,
        finalCount,
        profileBySex,
        profileByAgeGroup
      });
    } catch (error) {
      console.error("Erro /reports/rma:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
}

// src/routes/alerts.ts
var import_client9 = require("@prisma/client");
var import_date_fns4 = require("date-fns");
async function alertRoutes(app2) {
  app2.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.get("/alerts", async (request, reply) => {
    const { sub: userId, cargo } = request.user;
    const notifications = [];
    const today = (0, import_date_fns4.startOfDay)(/* @__PURE__ */ new Date());
    const tomorrowEnd = (0, import_date_fns4.addDays)(today, 2);
    const agenda = await prisma.agendamento.findMany({
      where: {
        responsavelId: userId,
        data: { gte: today, lt: tomorrowEnd }
      },
      include: { caso: { select: { nomeCompleto: true } } }
    });
    for (const ag of agenda) {
      notifications.push({
        id: `agenda-${ag.id}`,
        title: "Compromisso Pr\xF3ximo",
        description: `${ag.titulo} - ${ag.caso.nomeCompleto}`,
        link: `/dashboard/cases/${ag.casoId}`,
        // Link direto para o caso
        type: "info"
      });
    }
    const dataLimiteInatividade = (0, import_date_fns4.subDays)(/* @__PURE__ */ new Date(), 30);
    const casosInativos = await prisma.case.findMany({
      where: {
        status: import_client9.CaseStatus.EM_ACOMPANHAMENTO_PAEFI,
        // Se for Especialista, filtra pelos dele. Se Gerente, vê todos.
        especialistaPAEFIId: cargo === import_client9.Cargo.Especialista ? userId : void 0,
        // Lógica: Nenhuma evolução criada DEPOIS da data limite
        evolucoes: {
          none: {
            createdAt: { gte: dataLimiteInatividade }
          }
        }
      },
      select: { id: true, nomeCompleto: true }
    });
    for (const caso of casosInativos) {
      notifications.push({
        id: `inativo-${caso.id}`,
        title: "Caso sem Movimenta\xE7\xE3o",
        description: `${caso.nomeCompleto} n\xE3o tem evolu\xE7\xE3o h\xE1 +30 dias.`,
        link: `/dashboard/cases/${caso.id}`,
        type: "critical"
        // Alerta vermelho
      });
    }
    if (cargo === import_client9.Cargo.Gerente) {
      const distCount = await prisma.case.count({
        where: { status: import_client9.CaseStatus.AGUARDANDO_DISTRIBUICAO_PAEFI }
      });
      if (distCount > 0) {
        notifications.push({
          id: "dist-queue",
          title: "Distribui\xE7\xE3o Pendente",
          description: `${distCount} casos aguardam atribui\xE7\xE3o.`,
          link: "/dashboard/cases?status=AGUARDANDO_DISTRIBUICAO_PAEFI",
          type: "critical"
        });
      }
    }
    if (cargo === import_client9.Cargo.Agente_Social) {
      const acolhidaCount = await prisma.case.count({
        where: {
          agenteAcolhidaId: userId,
          status: import_client9.CaseStatus.AGUARDANDO_ACOLHIDA
        }
      });
      if (acolhidaCount > 0) {
        notifications.push({
          id: "acolhida-queue",
          title: "Novos na Acolhida",
          description: `Voc\xEA tem ${acolhidaCount} casos para triagem inicial.`,
          link: "/dashboard/cases?status=AGUARDANDO_ACOLHIDA",
          type: "critical"
        });
      }
    }
    if (cargo === import_client9.Cargo.Especialista) {
      const casesWithoutPaf = await prisma.case.count({
        where: {
          especialistaPAEFIId: userId,
          status: import_client9.CaseStatus.EM_ACOMPANHAMENTO_PAEFI,
          paf: { is: null }
        }
      });
      if (casesWithoutPaf > 0) {
        notifications.push({
          id: "missing-paf",
          title: "Casos sem PAF",
          description: `${casesWithoutPaf} casos precisam do plano inicial.`,
          link: "/dashboard/cases",
          // Idealmente filtrar na lista
          type: "critical"
        });
      }
      const pafDeadline = (0, import_date_fns4.addDays)(/* @__PURE__ */ new Date(), 15);
      const pafsExpiring = await prisma.paf.findMany({
        where: {
          // O PAF pode ter sido criado por outro, mas o alerta vai para o responsável atual do caso
          caso: {
            especialistaPAEFIId: userId,
            status: { not: import_client9.CaseStatus.DESLIGADO }
          },
          deadline: { gte: today, lte: pafDeadline }
        },
        include: { caso: { select: { nomeCompleto: true, id: true } } }
      });
      for (const p of pafsExpiring) {
        notifications.push({
          id: `paf-exp-${p.id}`,
          title: "Reavalia\xE7\xE3o de PAF",
          description: `Prazo pr\xF3ximo: ${p.caso.nomeCompleto}`,
          link: `/dashboard/cases/${p.caso.id}`,
          type: "critical"
        });
      }
    }
    return reply.send(notifications);
  });
}

// src/routes/audit.ts
var import_zod9 = require("zod");
var import_date_fns5 = require("date-fns");
async function auditRoutes(app2) {
  app2.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
      const { cargo } = request.user;
      if (cargo !== "Gerente") {
        return reply.status(403).send({ message: "Acesso restrito \xE0 gest\xE3o." });
      }
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.get("/audit", async (request, reply) => {
    const querySchema = import_zod9.z.object({
      page: import_zod9.z.coerce.number().int().positive().default(1),
      pageSize: import_zod9.z.coerce.number().int().positive().max(100).default(20),
      autorId: import_zod9.z.string().uuid().optional(),
      acao: import_zod9.z.string().optional(),
      // Ex: CRIACAO, DESLIGAMENTO, ATRIBUICAO
      periodo: import_zod9.z.enum(["hoje", "7dias", "30dias", "tudo"]).default("7dias"),
      caseId: import_zod9.z.string().uuid().optional(),
      // 🔥 NOVO FILTRO
      search: import_zod9.z.string().min(2).optional()
      // 🔍 NOVO: Busca textual inteligente
    });
    try {
      const params = querySchema.parse(request.query);
      const { page, pageSize, autorId, acao, periodo, caseId, search } = params;
      const where = {};
      if (search) {
        where.OR = [
          { descricao: { contains: search, mode: "insensitive" } },
          { autor: { nome: { contains: search, mode: "insensitive" } } },
          { caso: { nomeCompleto: { contains: search, mode: "insensitive" } } }
        ];
      }
      if (autorId && autorId !== "all") where.autorId = autorId;
      if (acao && acao !== "all") where.acao = acao;
      if (caseId) where.casoId = caseId;
      const hoje = /* @__PURE__ */ new Date();
      switch (periodo) {
        case "hoje":
          where.createdAt = { gte: (0, import_date_fns5.startOfDay)(hoje), lte: (0, import_date_fns5.endOfDay)(hoje) };
          break;
        case "7dias":
          where.createdAt = { gte: (0, import_date_fns5.startOfDay)((0, import_date_fns5.subDays)(hoje, 7)) };
          break;
        case "30dias":
          where.createdAt = { gte: (0, import_date_fns5.startOfDay)((0, import_date_fns5.subDays)(hoje, 30)) };
          break;
      }
      const [items, total] = await Promise.all([
        prisma.caseLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          include: {
            autor: { select: { nome: true, cargo: true } },
            caso: { select: { nomeCompleto: true } }
          },
          take: pageSize,
          skip: (page - 1) * pageSize
        }),
        prisma.caseLog.count({ where })
      ]);
      return reply.send({
        items,
        total,
        totalPages: Math.ceil(total / pageSize),
        page,
        appliedFilters: params
      });
    } catch (error) {
      console.error("Erro /audit:", error);
      return reply.status(500).send({ message: "Erro ao buscar logs de auditoria." });
    }
  });
}

// src/routes/attachments.ts
var import_zod10 = require("zod");
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_client10 = require("@prisma/client");
async function validateFileSignature(buffer) {
  const bytes = buffer.subarray(0, 4).toString("hex").toUpperCase();
  const signatures = {
    "25504446": ["pdf"],
    // %PDF
    "FFD8FFE0": ["image"],
    // JPEG
    "FFD8FFE1": ["image"],
    // JPEG
    "FFD8FFEE": ["image"],
    // JPEG
    "FFD8FFDB": ["image"],
    // JPEG
    "89504E47": ["image"]
    // PNG
  };
  for (const [sig, types] of Object.entries(signatures)) {
    if (bytes.startsWith(sig)) return types[0];
  }
  return null;
}
async function attachmentRoutes(app2) {
  app2.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.post("/cases/:caseId/attachments", async (request, reply) => {
    const paramsSchema = import_zod10.z.object({ caseId: import_zod10.z.string().uuid() });
    try {
      const { caseId } = paramsSchema.parse(request.params);
      const { sub: userId } = request.user;
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ message: "Nenhum arquivo enviado." });
      }
      const buffer = await data.toBuffer();
      const fileType = await validateFileSignature(buffer);
      if (!fileType) {
        return reply.status(400).send({
          message: "Arquivo inv\xE1lido ou corrompido. Apenas PDF, JPG e PNG reais s\xE3o permitidos."
        });
      }
      const safeFilename = data.filename.replace(/[^a-zA-Z0-9.]/g, "_");
      const fileName = `${Date.now()}-${safeFilename}`;
      const uploadDir2 = import_path.default.resolve(process.cwd(), "uploads");
      if (!import_fs.default.existsSync(uploadDir2)) {
        import_fs.default.mkdirSync(uploadDir2, { recursive: true });
      }
      const uploadPath = import_path.default.join(uploadDir2, fileName);
      import_fs.default.writeFileSync(uploadPath, buffer);
      const anexo = await prisma.anexo.create({
        data: {
          nome: data.filename,
          // Mantém nome original para exibição
          tipo: data.mimetype,
          url: `/uploads/${fileName}`,
          casoId: caseId,
          autorId: userId,
          tamanho: buffer.length
          // Salva o tamanho em bytes
        }
      });
      await prisma.caseLog.create({
        data: {
          casoId: caseId,
          autorId: userId,
          acao: import_client10.LogAction.ANEXO_ADICIONADO,
          descricao: `Anexou documento: ${data.filename}`
        }
      });
      return reply.status(201).send(anexo);
    } catch (error) {
      console.error("\u274C Erro no Upload:", error);
      return reply.status(500).send({ message: "Erro interno ao salvar arquivo." });
    }
  });
  app2.get("/cases/:caseId/attachments", async (request, reply) => {
    const paramsSchema = import_zod10.z.object({ caseId: import_zod10.z.string().uuid() });
    try {
      const { caseId } = paramsSchema.parse(request.params);
      const anexos = await prisma.anexo.findMany({
        where: { casoId: caseId },
        orderBy: { createdAt: "desc" },
        include: { autor: { select: { nome: true } } }
      });
      return reply.send(anexos);
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao listar anexos." });
    }
  });
  app2.delete("/attachments/:id", async (request, reply) => {
    const paramsSchema = import_zod10.z.object({ id: import_zod10.z.string().uuid() });
    try {
      const { id } = paramsSchema.parse(request.params);
      const { sub: userId, cargo } = request.user;
      const anexo = await prisma.anexo.findUnique({ where: { id } });
      if (!anexo) return reply.status(404).send({ message: "Arquivo n\xE3o encontrado." });
      if (anexo.autorId !== userId && cargo !== import_client10.Cargo.Gerente) {
        return reply.status(403).send({ message: "Sem permiss\xE3o para excluir este anexo." });
      }
      await prisma.anexo.delete({ where: { id } });
      try {
        const filePath = import_path.default.resolve(process.cwd(), "uploads", import_path.default.basename(anexo.url));
        if (import_fs.default.existsSync(filePath)) import_fs.default.unlinkSync(filePath);
      } catch (e) {
        console.error("Erro ao apagar arquivo f\xEDsico:", e);
      }
      await prisma.caseLog.create({
        data: {
          casoId: anexo.casoId,
          autorId: userId,
          acao: import_client10.LogAction.OUTRO,
          descricao: `Removeu anexo: ${anexo.nome}`
        }
      });
      return reply.status(204).send();
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao remover anexo." });
    }
  });
}

// src/routes/import.ts
var import_fast_csv2 = require("fast-csv");
var import_fs2 = __toESM(require("fs"));
var import_path2 = __toESM(require("path"));
var import_promises = require("stream/promises");
var import_client11 = require("@prisma/client");
async function importRoutes(app2) {
  app2.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
      const { cargo } = request.user;
      if (cargo !== import_client11.Cargo.Gerente) {
        return reply.status(403).send({ message: "Acesso restrito \xE0 Ger\xEAncia." });
      }
    } catch (err) {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.post("/import/cases", async (request, reply) => {
    const { sub: userId } = request.user;
    const data = await request.file();
    if (!data || data.mimetype !== "text/csv") {
      return reply.status(400).send({ message: "Por favor, envie um ficheiro CSV v\xE1lido." });
    }
    const uploadDir2 = import_path2.default.resolve(__dirname, "../../uploads");
    if (!import_fs2.default.existsSync(uploadDir2)) import_fs2.default.mkdirSync(uploadDir2, { recursive: true });
    const tempFilePath = import_path2.default.join(uploadDir2, `import_${Date.now()}.csv`);
    await (0, import_promises.pipeline)(data.file, import_fs2.default.createWriteStream(tempFilePath));
    const results = [];
    const errors = [];
    let successCount = 0;
    return new Promise((resolve, reject) => {
      import_fs2.default.createReadStream(tempFilePath).pipe((0, import_fast_csv2.parse)({ headers: true, ignoreEmpty: true, delimiter: "," })).on("error", (error) => {
        console.error(error);
        import_fs2.default.unlinkSync(tempFilePath);
        reject(reply.status(500).send({ message: "Erro ao ler o ficheiro CSV." }));
      }).on("data", (row) => results.push(row)).on("end", async () => {
        if (import_fs2.default.existsSync(tempFilePath)) import_fs2.default.unlinkSync(tempFilePath);
        await prisma.$transaction(async (tx) => {
          for (const [index, row] of results.entries()) {
            const rowNum = index + 2;
            if (!row.Nome || !row.CPF) {
              errors.push(`Linha ${rowNum}: Nome ou CPF em falta.`);
              continue;
            }
            const cpfLimpo = row.CPF.replace(/\D/g, "");
            if (cpfLimpo.length !== 11) {
              errors.push(`Linha ${rowNum}: CPF inv\xE1lido (${row.CPF}).`);
              continue;
            }
            const exists = await tx.case.findUnique({ where: { cpf: cpfLimpo } });
            if (exists) {
              errors.push(`Linha ${rowNum}: CPF j\xE1 cadastrado (${row.Nome}).`);
              continue;
            }
            let beneficiosArray = [];
            if (row.Beneficios) {
              beneficiosArray = row.Beneficios.split(";").map((b) => b.trim()).filter((b) => b !== "");
            }
            try {
              await tx.case.create({
                data: {
                  // Obrigatórios
                  nomeCompleto: row.Nome,
                  cpf: cpfLimpo,
                  nascimento: new Date(row.Nascimento || /* @__PURE__ */ new Date()),
                  // Fallback hoje
                  sexo: row.Sexo || "N\xE3o Informado",
                  telefone: row.Telefone || "",
                  endereco: row.Endereco || "",
                  urgencia: row.Urgencia || "Sem risco imediato",
                  violacao: row.Violacao || "Outros",
                  categoria: row.Categoria || "Fam\xEDlia em vulnerabilidade",
                  orgaoDemandante: row.Orgao || "Demanda Espont\xE2nea",
                  // Opcionais (Novos Campos)
                  numeroSei: row.NumeroSEI || null,
                  linkSei: row.LinkSEI || null,
                  observacoes: row.Observacoes || `Importado via CSV em ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`,
                  beneficios: beneficiosArray,
                  // Sistema
                  pesoUrgencia: 1,
                  status: "AGUARDANDO_ACOLHIDA",
                  criadoPorId: userId
                }
              });
              successCount++;
            } catch (err) {
              console.error(err);
              errors.push(`Linha ${rowNum}: Erro ao salvar no banco. Verifique formato de data (AAAA-MM-DD).`);
            }
          }
        });
        resolve(reply.send({
          message: "Processamento conclu\xEDdo.",
          total: results.length,
          success: successCount,
          failed: errors.length,
          errors: errors.slice(0, 50)
        }));
      });
    });
  });
}

// src/routes/filters.ts
var import_zod11 = require("zod");
async function filterRoutes(app2) {
  app2.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.get("/filters", async (request, reply) => {
    const { sub: userId } = request.user;
    try {
      const filters = await prisma.savedFilter.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" }
      });
      return reply.send(filters);
    } catch (error) {
      console.error("\u274C ERRO AO BUSCAR FILTROS:", error);
      return reply.status(500).send({ message: "Erro ao buscar filtros." });
    }
  });
  app2.post("/filters", async (request, reply) => {
    const { sub: userId } = request.user;
    const bodySchema = import_zod11.z.object({
      nome: import_zod11.z.string().min(1, "D\xEA um nome ao filtro"),
      config: import_zod11.z.any()
    });
    try {
      const { nome, config } = bodySchema.parse(request.body);
      const userExists = await prisma.user.findUnique({ where: { id: userId } });
      if (!userExists) {
        return reply.status(401).send({ message: "Sess\xE3o inv\xE1lida. Fa\xE7a login novamente." });
      }
      const count = await prisma.savedFilter.count({ where: { userId } });
      if (count >= 10) {
        return reply.status(400).send({ message: "Limite de 10 filtros atingido." });
      }
      const filter = await prisma.savedFilter.create({
        data: {
          nome,
          config: config ?? {},
          // Garante que não é null
          userId
        }
      });
      return reply.status(201).send(filter);
    } catch (error) {
      console.error("\u274C ERRO NO POST /filters:", error);
      return reply.status(500).send({ message: "Erro ao salvar filtro." });
    }
  });
  app2.delete("/filters/:id", async (request, reply) => {
    const paramsSchema = import_zod11.z.object({ id: import_zod11.z.string().uuid() });
    const { sub: userId } = request.user;
    try {
      const { id } = paramsSchema.parse(request.params);
      const filter = await prisma.savedFilter.findUnique({ where: { id } });
      if (!filter || filter.userId !== userId) {
        return reply.status(403).send({ message: "Sem permiss\xE3o." });
      }
      await prisma.savedFilter.delete({ where: { id } });
      return reply.status(204).send();
    } catch (error) {
      console.error("\u274C ERRO NO DELETE /filters:", error);
      return reply.status(500).send({ message: "Erro ao remover filtro." });
    }
  });
}

// src/routes/referrals.ts
var import_zod12 = require("zod");
var import_client12 = require("@prisma/client");
async function referralRoutes(app2) {
  app2.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.post("/cases/:caseId/referrals", async (req, reply) => {
    const paramsSchema = import_zod12.z.object({
      caseId: import_zod12.z.string().uuid()
    });
    const bodySchema = import_zod12.z.object({
      tipo: import_zod12.z.string().min(3, "O tipo \xE9 obrigat\xF3rio (ex: Sa\xFAde, Educa\xE7\xE3o)"),
      instituicao: import_zod12.z.string().min(3, "Informe o nome da institui\xE7\xE3o"),
      motivo: import_zod12.z.string().min(5, "Descreva o motivo do encaminhamento")
    });
    try {
      const { caseId } = paramsSchema.parse(req.params);
      const { tipo, instituicao, motivo } = bodySchema.parse(req.body);
      const userId = req.user.sub;
      const referral = await prisma.encaminhamento.create({
        data: {
          tipo,
          instituicao,
          motivo,
          // [CORREÇÃO]: Mapeamento explícito. O campo do banco é 'casoId', a variável é 'caseId'
          casoId: caseId,
          autorId: userId,
          status: "PENDENTE"
        }
      });
      await prisma.caseLog.create({
        data: {
          // [CORREÇÃO]: Mapeamento explícito também no log
          casoId: caseId,
          autorId: userId,
          acao: import_client12.LogAction.OUTRO,
          descricao: `Realizou encaminhamento para ${tipo} - ${instituicao}`
        }
      });
      return reply.status(201).send(referral);
    } catch (error) {
      console.error("Erro ao criar encaminhamento:", error);
      return reply.status(500).send({ message: "Erro ao criar encaminhamento." });
    }
  });
  app2.get("/cases/:caseId/referrals", async (req, reply) => {
    const paramsSchema = import_zod12.z.object({ caseId: import_zod12.z.string().uuid() });
    try {
      const { caseId } = paramsSchema.parse(req.params);
      const referrals = await prisma.encaminhamento.findMany({
        // [CORREÇÃO]: Mapeamento explícito aqui também
        where: { casoId: caseId },
        orderBy: { createdAt: "desc" },
        include: {
          autor: { select: { nome: true } }
        }
      });
      return reply.send(referrals);
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao buscar encaminhamentos." });
    }
  });
  app2.patch("/referrals/:id", async (req, reply) => {
    const paramsSchema = import_zod12.z.object({ id: import_zod12.z.string().uuid() });
    const bodySchema = import_zod12.z.object({
      status: import_zod12.z.enum(["PENDENTE", "CONCLUIDO", "NEGADO"]),
      retorno: import_zod12.z.string().optional()
    });
    try {
      const { id } = paramsSchema.parse(req.params);
      const { status, retorno } = bodySchema.parse(req.body);
      const userId = req.user.sub;
      const oldRef = await prisma.encaminhamento.findUnique({ where: { id } });
      if (!oldRef) return reply.status(404).send({ message: "Encaminhamento n\xE3o encontrado." });
      const updated = await prisma.encaminhamento.update({
        where: { id },
        data: {
          status,
          retorno,
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
      await prisma.caseLog.create({
        data: {
          casoId: oldRef.casoId,
          // Aqui usamos o valor que já veio do banco, então está correto
          autorId: userId,
          acao: import_client12.LogAction.OUTRO,
          descricao: `Atualizou encaminhamento (${oldRef.instituicao}) para: ${status}`
        }
      });
      return reply.send(updated);
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao atualizar encaminhamento." });
    }
  });
}

// src/routes/family.ts
var import_zod13 = require("zod");
var import_client13 = require("@prisma/client");
async function familyRoutes(app2) {
  app2.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send();
    }
  });
  app2.post("/cases/:caseId/family", async (req, reply) => {
    const paramsSchema = import_zod13.z.object({ caseId: import_zod13.z.string().uuid() });
    const bodySchema = import_zod13.z.object({
      nome: import_zod13.z.string().min(2),
      parentesco: import_zod13.z.string().min(2),
      idade: import_zod13.z.number().int().nonnegative().optional(),
      // [NOVOS CAMPOS]
      cpf: import_zod13.z.string().optional().nullable(),
      nascimento: import_zod13.z.coerce.date().optional().nullable(),
      telefone: import_zod13.z.string().optional().nullable(),
      ocupacao: import_zod13.z.string().optional(),
      renda: import_zod13.z.number().nonnegative().optional(),
      observacoes: import_zod13.z.string().optional()
    });
    try {
      const { caseId } = paramsSchema.parse(req.params);
      const data = bodySchema.parse(req.body);
      const userId = req.user.sub;
      const cpfLimpo = data.cpf ? data.cpf.replace(/\D/g, "") : null;
      const telefoneLimpo = data.telefone ? data.telefone.replace(/\D/g, "") : null;
      const member = await prisma.membroFamilia.create({
        data: {
          ...data,
          cpf: cpfLimpo,
          telefone: telefoneLimpo,
          // [CORREÇÃO]: Mapeamento explícito (banco: variável)
          casoId: caseId
        }
      });
      await prisma.caseLog.create({
        data: {
          // [CORREÇÃO]: Mapeamento explícito aqui também
          casoId: caseId,
          autorId: userId,
          acao: import_client13.LogAction.MEMBRO_FAMILIA_ADICIONADO,
          descricao: `Adicionou familiar: ${data.nome} (${data.parentesco})`
        }
      });
      return reply.status(201).send(member);
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ message: "Erro ao adicionar familiar." });
    }
  });
  app2.get("/cases/:caseId/family", async (req, reply) => {
    const { caseId } = import_zod13.z.object({ caseId: import_zod13.z.string().uuid() }).parse(req.params);
    const members = await prisma.membroFamilia.findMany({
      // [CORREÇÃO]: Mapeamento explícito
      where: { casoId: caseId },
      orderBy: { createdAt: "asc" }
    });
    return reply.send(members);
  });
  app2.delete("/family/:id", async (req, reply) => {
    const { id } = import_zod13.z.object({ id: import_zod13.z.string().uuid() }).parse(req.params);
    const userId = req.user.sub;
    try {
      const member = await prisma.membroFamilia.findUnique({ where: { id } });
      if (!member) return reply.status(404).send();
      await prisma.membroFamilia.delete({ where: { id } });
      await prisma.caseLog.create({
        data: {
          casoId: member.casoId,
          // Aqui 'member' vem do banco, então já tem 'casoId' correto
          autorId: userId,
          acao: import_client13.LogAction.OUTRO,
          descricao: `Removeu familiar: ${member.nome}`
        }
      });
      return reply.status(204).send();
    } catch (error) {
      return reply.status(500).send();
    }
  });
}

// src/server.ts
var app = (0, import_fastify.default)({
  logger: { transport: { target: "pino-pretty" } }
});
var uploadDir = import_path3.default.join(__dirname, "../uploads");
if (!import_fs3.default.existsSync(uploadDir)) import_fs3.default.mkdirSync(uploadDir, { recursive: true });
app.register(import_multipart.default, { limits: { fileSize: 5 * 1024 * 1024 } });
app.register(import_cors.default, { origin: true, methods: ["GET", "POST", "PUT", "PATCH", "DELETE"] });
app.register(import_jwt.default, { secret: process.env.JWT_SECRET });
app.decorate("authenticate", async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    await reply.send(err);
  }
});
app.register(import_static.default, { root: uploadDir, prefix: "/uploads/", decorateReply: false });
app.register(import_static.default, { root: import_path3.default.join(__dirname, "../../frontend/dist"), prefix: "/", constraints: {} });
app.register(authRoutes);
app.register(caseRoutes);
app.register(userRoutes);
app.register(evolutionRoutes);
app.register(pafRoutes);
app.register(statsRoutes);
app.register(appointmentRoutes);
app.register(reportRoutes);
app.register(alertRoutes);
app.register(auditRoutes);
app.register(attachmentRoutes);
app.register(importRoutes);
app.register(filterRoutes);
app.register(referralRoutes);
app.register(familyRoutes);
app.setNotFoundHandler((req, reply) => {
  if (req.raw.url && (req.raw.url.startsWith("/api") || req.raw.url.startsWith("/uploads"))) {
    return reply.status(404).send({ message: "Recurso n\xE3o encontrado" });
  }
  return reply.sendFile("index.html");
});
app.listen({ port: 3333, host: "0.0.0.0" }).then(() => console.log("\u{1F680} Servidor rodando!"));
