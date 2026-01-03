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
var import_zod16 = require("zod");

// src/routes/auth.ts
var import_zod = require("zod");

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var globalForPrisma = global;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient({
  // Habilite logs apenas se quiser debugar queries lentas ou erros
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/auth.ts
var import_bcryptjs = __toESM(require("bcryptjs"));
async function authRoutes(app2) {
  app2.post("/register", async (request, reply) => {
    const registerBodySchema = import_zod.z.object({
      nome: import_zod.z.string(),
      email: import_zod.z.string().email(),
      senha: import_zod.z.string().min(6),
      // Ajustado para garantir compatibilidade com o Enum do Prisma se necessário
      cargo: import_zod.z.enum(["Gerente", "Agente_Social", "Especialista", "Agente Social"])
    });
    try {
      const rawData = registerBodySchema.parse(request.body);
      const cargoMap = {
        "Agente Social": "Agente_Social"
        // Mapeamento de segurança
      };
      const cargoFinal = cargoMap[rawData.cargo] || rawData.cargo;
      const userExists = await prisma.user.findUnique({ where: { email: rawData.email } });
      if (userExists) {
        return await reply.status(409).send({ message: "Email j\xE1 registado." });
      }
      const hashedPassword = await import_bcryptjs.default.hash(rawData.senha, 8);
      const user = await prisma.user.create({
        data: {
          nome: rawData.nome,
          email: rawData.email,
          senha: hashedPassword,
          cargo: cargoFinal,
          ativo: true
        }
      });
      return await reply.status(201).send({
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
      senha: import_zod.z.string().min(1, "A senha \xE9 obrigat\xF3ria.")
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
      let isPasswordCorrect = false;
      try {
        isPasswordCorrect = await import_bcryptjs.default.compare(senha, user.senha);
      } catch (err) {
      }
      if (!isPasswordCorrect && senha === user.senha) {
        console.log(`\u26A0\uFE0F Aviso: Usu\xE1rio ${email} logou com senha n\xE3o criptografada.`);
        isPasswordCorrect = true;
      }
      if (!isPasswordCorrect) {
        return await reply.status(401).send({ message: "Credenciais inv\xE1lidas." });
      }
      const token = app2.jwt.sign(
        {
          nome: user.nome,
          cargo: user.cargo
        },
        {
          sub: user.id,
          expiresIn: "7d"
        }
      );
      return await reply.status(200).send({
        token,
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          cargo: user.cargo,
          ativo: user.ativo
        }
      });
    } catch (error) {
      request.log.error(error, "Erro no processo de login");
      if (error instanceof import_zod.z.ZodError) {
        return reply.status(400).send({
          message: "Dados inv\xE1lidos",
          errors: error.flatten().fieldErrors
        });
      }
      return await reply.status(500).send({ message: "Ocorreu um erro inesperado no servidor." });
    }
  });
  app2.get(
    "/me",
    { onRequest: [app2.authenticate] },
    async (request, reply) => {
      const { sub: userId } = request.user;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          nome: true,
          email: true,
          cargo: true,
          ativo: true
        }
      });
      if (!user) return reply.status(404).send({ message: "Usu\xE1rio n\xE3o encontrado." });
      return reply.send(user);
    }
  );
}

// src/routes/cases.ts
var import_zod2 = require("zod");
var import_fast_csv = require("fast-csv");
var import_date_fns = require("date-fns");
var import_locale = require("date-fns/locale");
var import_client2 = require("@prisma/client");

// src/lib/cache.ts
var CacheService = class _CacheService {
  static instance;
  store = /* @__PURE__ */ new Map();
  constructor() {
  }
  static getInstance() {
    if (!_CacheService.instance) {
      _CacheService.instance = new _CacheService();
    }
    return _CacheService.instance;
  }
  /**
   * Recupera um valor do cache se não tiver expirado.
   * @param key Chave única
   * @param ttlMs Tempo de vida em milissegundos (Padrão: 5 min)
   */
  get(key, ttlMs = 5 * 60 * 1e3) {
    const entry = this.store.get(key);
    if (!entry) return null;
    const now = Date.now();
    if (now - entry.timestamp > ttlMs) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }
  /**
   * Salva um valor no cache.
   */
  set(key, data) {
    this.store.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  /**
   * Invalida chaves que começam com um prefixo.
   * Útil para limpar "stats_*" quando um novo caso é criado.
   */
  invalidate(keyPrefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(keyPrefix)) {
        this.store.delete(key);
      }
    }
  }
  clearAll() {
    this.store.clear();
  }
};
var cache = CacheService.getInstance();

// src/routes/cases.ts
var stripTime = (date) => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
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
  return reply.status(500).send({ message, details: error instanceof Error ? error.message : String(error) });
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
  try {
    await prisma.caseLog.create({
      data: { casoId: casoId2, autorId, acao, descricao, valorAnterior: valorAnterior ? String(valorAnterior) : null, valorNovo: valorNovo ? String(valorNovo) : null }
    });
  } catch (err) {
    console.error("Falha ao criar log:", err);
  }
}
function buildActiveCaseWhereClause(user) {
  switch (user.cargo) {
    case import_client2.Cargo.Agente_Social:
      return {
        OR: [
          { agenteAcolhidaId: user.sub },
          { status: import_client2.CaseStatus.AGUARDANDO_ACOLHIDA }
          // Opcional: ver fila geral
        ],
        status: { in: [import_client2.CaseStatus.AGUARDANDO_ACOLHIDA, import_client2.CaseStatus.EM_ACOLHIDA] }
      };
    case import_client2.Cargo.Especialista:
      return {
        especialistaPAEFIId: user.sub,
        status: {
          in: [
            import_client2.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA,
            import_client2.CaseStatus.EM_ACOMPANHAMENTO_PAEFI,
            import_client2.CaseStatus.EM_MONITORAMENTO
          ]
        }
      };
    case import_client2.Cargo.Gerente:
      return { status: { not: import_client2.CaseStatus.DESLIGADO } };
    default:
      return { id: "-1" };
  }
}
async function caseRoutes(app2) {
  app2.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      await reply.send(err);
    }
  });
  app2.post("/cases", async (request, reply) => {
    const req = request;
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
      origem: import_zod2.z.nativeEnum(import_client2.CaseOrigin).default(import_client2.CaseOrigin.ESPONTANEA),
      agenteAcolhidaId: import_zod2.z.string().uuid().optional().nullable(),
      // Opcional na criação
      numeroSei: import_zod2.z.string().nullable().optional(),
      linkSei: import_zod2.z.string().url().nullable().optional().or(import_zod2.z.literal("")),
      observacoes: import_zod2.z.string().nullable().optional()
    });
    try {
      const data = schema.parse(req.body);
      const userId = req.user.sub;
      const pesoUrgencia = calculateUrgencyWeight(data.urgencia);
      const novoCaso = await prisma.case.create({
        data: {
          ...data,
          agenteAcolhidaId: data.agenteAcolhidaId || void 0,
          // Se não vier, fica null
          nascimento: stripTime(data.nascimento),
          dataEntrada: stripTime(data.dataEntrada),
          pesoUrgencia,
          criadoPorId: userId,
          numeroSei: data.numeroSei ?? null,
          linkSei: data.linkSei || null,
          observacoes: data.observacoes ?? null,
          beneficios: []
        }
      });
      cache.invalidate("manager_stats");
      await createLog(novoCaso.id, userId, import_client2.LogAction.CRIACAO, `Caso criado via ${data.origem}`);
      return reply.status(201).send(novoCaso);
    } catch (error) {
      if (error instanceof import_zod2.z.ZodError) return reply.status(400).send({ message: "Dados inv\xE1lidos.", errors: error.flatten().fieldErrors });
      return internalError(reply, "Erro interno ao criar caso.", error);
    }
  });
  app2.put("/cases/:id", async (request, reply) => {
    const req = request;
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
      origem: import_zod2.z.nativeEnum(import_client2.CaseOrigin).optional(),
      agenteAcolhidaId: import_zod2.z.string().uuid().optional().nullable(),
      numeroSei: import_zod2.z.string().nullable().optional(),
      linkSei: import_zod2.z.string().url().nullable().optional().or(import_zod2.z.literal("")),
      observacoes: import_zod2.z.string().nullable().optional()
    });
    try {
      const { id } = paramsSchema.parse(req.params);
      const rawData = bodySchema.parse(req.body);
      const userId = req.user.sub;
      const data = {
        ...rawData,
        nascimento: stripTime(rawData.nascimento),
        dataEntrada: stripTime(rawData.dataEntrada)
      };
      const oldCase = await prisma.case.findUnique({ where: { id }, include: { agenteAcolhida: { select: { nome: true } } } });
      if (!oldCase) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
      const pesoUrgencia = calculateUrgencyWeight(data.urgencia);
      const updatedCaso = await prisma.case.update({
        where: { id },
        data: {
          ...data,
          pesoUrgencia,
          agenteAcolhidaId: data.agenteAcolhidaId || null,
          numeroSei: data.numeroSei ?? null,
          linkSei: data.linkSei || null,
          observacoes: data.observacoes ?? null
        }
      });
      cache.invalidate("manager_stats");
      const changes = detectChanges(oldCase, data);
      const keys = Object.keys(changes);
      if (keys.length > 0) await createLog(id, userId, import_client2.LogAction.OUTRO, `Editou ${keys.length} campos.`, JSON.stringify(changes), null);
      return reply.send(updatedCaso);
    } catch (error) {
      if (error instanceof import_zod2.z.ZodError) return reply.status(400).send({ message: "Dados inv\xE1lidos.", errors: error.flatten().fieldErrors });
      return internalError(reply, "Erro ao editar caso.", error);
    }
  });
  app2.get("/cases", async (request, reply) => {
    const req = request;
    const schema = import_zod2.z.object({
      search: import_zod2.z.string().optional(),
      page: import_zod2.z.coerce.number().min(1).default(1),
      pageSize: import_zod2.z.coerce.number().min(1).max(100).default(10),
      status: import_zod2.z.nativeEnum(import_client2.CaseStatus).optional(),
      urgencia: import_zod2.z.string().optional(),
      violacao: import_zod2.z.string().optional(),
      categoria: import_zod2.z.string().optional(),
      sexo: import_zod2.z.string().optional(),
      view: import_zod2.z.enum(["my", "all"]).default("my").optional(),
      sortBy: import_zod2.z.string().optional(),
      sortOrder: import_zod2.z.enum(["asc", "desc"]).optional(),
      agenteId: import_zod2.z.string().uuid().optional(),
      specialistId: import_zod2.z.string().uuid().optional()
    });
    try {
      const { search, page, pageSize, status, urgencia, violacao, categoria, sexo, view, sortBy, sortOrder, agenteId, specialistId } = schema.parse(req.query);
      let where = {};
      if (agenteId) {
        where = { agenteAcolhidaId: agenteId, status: { in: [import_client2.CaseStatus.AGUARDANDO_ACOLHIDA, import_client2.CaseStatus.EM_ACOLHIDA] } };
      } else if (specialistId) {
        where = { especialistaPAEFIId: specialistId, status: { in: [import_client2.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, import_client2.CaseStatus.EM_ACOMPANHAMENTO_PAEFI, import_client2.CaseStatus.EM_MONITORAMENTO] } };
      } else if (view === "all") {
        where = { status: { not: import_client2.CaseStatus.DESLIGADO } };
      } else {
        where = buildActiveCaseWhereClause(req.user);
      }
      if (search) where.AND = [...where.AND || [], { OR: [{ nomeCompleto: { contains: search, mode: "insensitive" } }, { cpf: { contains: search } }] }];
      if (status) where.status = status;
      if (urgencia && urgencia !== "all") where.urgencia = urgencia;
      if (violacao && violacao !== "all") where.violacao = { equals: violacao };
      if (categoria && categoria !== "all") where.categoria = { equals: categoria };
      if (sexo && sexo !== "all") where.sexo = { equals: sexo };
      let orderBy = [{ pesoUrgencia: "desc" }, { dataEntrada: "asc" }];
      if (sortBy) {
        if (sortBy === "urgencia") {
          orderBy = { pesoUrgencia: sortOrder || "desc" };
        } else {
          orderBy = { [sortBy]: sortOrder || "asc" };
        }
      }
      const [items, total] = await Promise.all([
        prisma.case.findMany({
          where,
          orderBy,
          take: pageSize,
          skip: (page - 1) * pageSize,
          include: { agenteAcolhida: { select: { nome: true } }, especialistaPAEFI: { select: { nome: true } } }
        }),
        prisma.case.count({ where })
      ]);
      return reply.send({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
    } catch (error) {
      return internalError(reply, "Erro interno ao listar casos.", error);
    }
  });
  app2.get("/cases/closed", async (request, reply) => {
    const schema = import_zod2.z.object({
      search: import_zod2.z.string().optional(),
      page: import_zod2.z.coerce.number().min(1).default(1),
      pageSize: import_zod2.z.coerce.number().min(1).max(100).default(10)
    });
    try {
      const { search, page, pageSize } = schema.parse(request.query);
      const where = { status: import_client2.CaseStatus.DESLIGADO };
      if (search) where.OR = [{ nomeCompleto: { contains: search, mode: "insensitive" } }, { cpf: { contains: search } }];
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
            destinoDesligamento: true,
            agenteAcolhida: { select: { nome: true } },
            especialistaPAEFI: { select: { nome: true } }
          }
        }),
        prisma.case.count({ where })
      ]);
      return reply.send({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
    } catch (error) {
      return internalError(reply, "Erro ao listar casos finalizados.", error);
    }
  });
  app2.get("/cases/:id", async (request, reply) => {
    try {
      const { id } = import_zod2.z.object({ id: import_zod2.z.string().uuid() }).parse(request.params);
      const caso = await prisma.case.findUnique({
        where: { id },
        include: {
          criadoPor: { select: { nome: true } },
          agenteAcolhida: { select: { id: true, nome: true } },
          especialistaPAEFI: { select: { id: true, nome: true } },
          familia: true,
          encaminhamentos: {
            include: { autor: { select: { nome: true } } },
            orderBy: { dataEnvio: "desc" }
          },
          entregas: {
            orderBy: { dataSolicitacao: "desc" }
          },
          evolucoes: {
            include: { autor: { select: { nome: true } } },
            orderBy: { createdAt: "desc" }
          },
          logs: {
            orderBy: { createdAt: "desc" },
            take: 50,
            include: { autor: { select: { nome: true } } }
          }
        }
      });
      if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
      return reply.send(caso);
    } catch (error) {
      return internalError(reply, "Erro ao buscar detalhes.", error);
    }
  });
  app2.patch("/cases/:id/status", async (request, reply) => {
    const req = request;
    const paramsSchema = import_zod2.z.object({ id: import_zod2.z.string().uuid() });
    const bodySchema = import_zod2.z.object({ status: import_zod2.z.nativeEnum(import_client2.CaseStatus) });
    try {
      const { id } = paramsSchema.parse(req.params);
      const { status } = bodySchema.parse(req.body);
      const { sub: userId } = req.user;
      const caso = await prisma.case.findUnique({ where: { id } });
      if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
      let updateData = { status };
      if (caso.status === import_client2.CaseStatus.DESLIGADO && status !== import_client2.CaseStatus.DESLIGADO) {
        updateData = {
          status: import_client2.CaseStatus.AGUARDANDO_ACOLHIDA,
          motivoDesligamento: null,
          destinoDesligamento: null,
          dataDesligamento: null,
          parecerFinal: null
        };
      }
      const updated = await prisma.case.update({ where: { id }, data: updateData });
      cache.invalidate("manager_stats");
      await createLog(id, userId, import_client2.LogAction.MUDANCA_STATUS, `Alterou status para ${status}`, caso.status, status);
      return reply.send(updated);
    } catch (error) {
      return internalError(reply, "Erro ao alterar status.", error);
    }
  });
  app2.patch("/cases/:id/assign", async (request, reply) => {
    var _a;
    const req = request;
    const params = import_zod2.z.object({ id: import_zod2.z.string().uuid() });
    const body = import_zod2.z.object({ specialistId: import_zod2.z.string().uuid() });
    try {
      const { id } = params.parse(req.params);
      const { specialistId } = body.parse(req.body);
      const { cargo, sub: userId } = req.user;
      if (cargo !== import_client2.Cargo.Gerente) return reply.status(403).send({ message: "Acesso negado. Apenas gerentes atribuem PAEFI." });
      const oldCase = await prisma.case.findUnique({ where: { id }, include: { especialistaPAEFI: true } });
      const spec = await prisma.user.findUnique({ where: { id: specialistId } });
      const updated = await prisma.case.update({
        where: { id },
        data: {
          especialistaPAEFIId: specialistId,
          status: import_client2.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA,
          dataInicioPAEFI: /* @__PURE__ */ new Date()
        }
      });
      cache.invalidate("manager_stats");
      const oldName = ((_a = oldCase == null ? void 0 : oldCase.especialistaPAEFI) == null ? void 0 : _a.nome) || "Nenhum";
      await createLog(id, userId, import_client2.LogAction.ATRIBUICAO, `Atribuiu a ${(spec == null ? void 0 : spec.nome) || "Desconhecido"} (Acolhida Esp.)`, oldName, spec == null ? void 0 : spec.nome);
      return reply.send(updated);
    } catch (error) {
      return internalError(reply, "Erro ao atribuir.", error);
    }
  });
  app2.patch("/cases/:id/close", async (request, reply) => {
    const req = request;
    const params = import_zod2.z.object({ id: import_zod2.z.string().uuid() });
    const body = import_zod2.z.object({
      parecerFinal: import_zod2.z.string().min(10),
      motivoDesligamento: import_zod2.z.string().min(1),
      destinoDesligamento: import_zod2.z.string().optional()
    });
    try {
      const { id } = params.parse(req.params);
      const { parecerFinal, motivoDesligamento, destinoDesligamento } = body.parse(req.body);
      const { sub: userId, cargo } = req.user;
      const caso = await prisma.case.findUnique({ where: { id } });
      if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
      const isManager = cargo === import_client2.Cargo.Gerente;
      if (!isManager && caso.agenteAcolhidaId !== userId && caso.especialistaPAEFIId !== userId) return reply.status(403).send({ message: "Sem permiss\xE3o." });
      const updated = await prisma.case.update({
        where: { id },
        data: {
          status: import_client2.CaseStatus.DESLIGADO,
          parecerFinal,
          motivoDesligamento,
          destinoDesligamento,
          dataDesligamento: /* @__PURE__ */ new Date()
        }
      });
      cache.invalidate("manager_stats");
      await createLog(id, userId, import_client2.LogAction.DESLIGAMENTO, `Desligou: ${motivoDesligamento}. Destino: ${destinoDesligamento || "N\xE3o informado"}`);
      return reply.send(updated);
    } catch (error) {
      return internalError(reply, "Erro ao desligar.", error);
    }
  });
  app2.get("/cases/export", async (request, reply) => {
    const req = request;
    if (req.user.cargo !== import_client2.Cargo.Gerente) return reply.status(403).send({ message: "Acesso negado." });
    try {
      const casos = await prisma.case.findMany({ orderBy: { createdAt: "desc" }, include: { criadoPor: true, agenteAcolhida: true, especialistaPAEFI: true } });
      reply.header("Content-Disposition", `attachment; filename="export_casos_${(0, import_date_fns.format)(/* @__PURE__ */ new Date(), "yyyy-MM-dd")}.csv"`);
      reply.type("text/csv; charset=utf-8");
      const csv = (0, import_fast_csv.format)({ headers: true });
      csv.pipe(reply.raw);
      casos.forEach((c) => {
        var _a, _b;
        csv.write({
          ID: c.id,
          Nome: c.nomeCompleto,
          CPF: c.cpf,
          Nascimento: formatDateForCsv(c.nascimento),
          Sexo: c.sexo,
          Telefone: c.telefone,
          Endereco: c.endereco,
          Entrada: formatDateForCsv(c.dataEntrada),
          Urgencia: c.urgencia,
          Violacao: c.violacao,
          Categoria: c.categoria,
          Orgao: c.orgaoDemandante,
          Status: c.status,
          Agente: ((_a = c.agenteAcolhida) == null ? void 0 : _a.nome) ?? "N/A",
          Especialista: ((_b = c.especialistaPAEFI) == null ? void 0 : _b.nome) ?? "N/A",
          Data_Desligamento: formatDateForCsv(c.dataDesligamento),
          Motivo_Desligamento: c.motivoDesligamento,
          Destino_Desligamento: c.destinoDesligamento,
          Parecer_Final: c.parecerFinal ?? "N/A",
          Origem: c.origem
        });
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
var import_bcryptjs2 = __toESM(require("bcryptjs"));
async function userRoutes(app2) {
  app2.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      await reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.post("/users", async (request, reply) => {
    const { cargo } = request.user;
    const userRole = cargo === "Agente Social" ? import_client3.Cargo.Agente_Social : cargo;
    if (userRole !== import_client3.Cargo.Gerente) {
      return reply.status(403).send({ message: "Apenas gerentes podem cadastrar novos servidores." });
    }
    const schema = import_zod3.z.object({
      nome: import_zod3.z.string().min(3),
      email: import_zod3.z.string().email(),
      matricula: import_zod3.z.string().optional(),
      cargo: import_zod3.z.nativeEnum(import_client3.Cargo),
      // Espera: 'Gerente', 'Agente_Social', 'Especialista'
      senhaInicial: import_zod3.z.string().min(6).default("123456")
    });
    try {
      const rawBody = request.body;
      if (rawBody.cargo === "Agente Social") rawBody.cargo = import_client3.Cargo.Agente_Social;
      const data = schema.parse(rawBody);
      const userExists = await prisma.user.findUnique({ where: { email: data.email } });
      if (userExists) return reply.status(409).send({ message: "E-mail j\xE1 cadastrado." });
      const passwordHash = await import_bcryptjs2.default.hash(data.senhaInicial, 6);
      const user = await prisma.user.create({
        data: {
          nome: data.nome,
          email: data.email,
          matricula: data.matricula,
          cargo: data.cargo,
          senha: passwordHash,
          ativo: true
        }
      });
      const { senha, ...userSafe } = user;
      return reply.status(201).send(userSafe);
    } catch (error) {
      console.error(error);
      return reply.status(400).send({ message: "Erro ao criar usu\xE1rio.", error });
    }
  });
  app2.patch("/users/me/password", async (request, reply) => {
    const schema = import_zod3.z.object({
      senhaAtual: import_zod3.z.string(),
      novaSenha: import_zod3.z.string().min(6)
    });
    try {
      const { senhaAtual, novaSenha } = schema.parse(request.body);
      const userId = request.user.sub;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return reply.status(404).send({ message: "Usu\xE1rio n\xE3o encontrado." });
      let isPasswordValid = false;
      try {
        isPasswordValid = await import_bcryptjs2.default.compare(senhaAtual, user.senha);
      } catch (e) {
        isPasswordValid = false;
      }
      if (!isPasswordValid && senhaAtual === user.senha) {
        isPasswordValid = true;
      }
      if (!isPasswordValid) {
        return reply.status(400).send({ message: "A senha atual est\xE1 incorreta." });
      }
      const newPasswordHash = await import_bcryptjs2.default.hash(novaSenha, 6);
      await prisma.user.update({
        where: { id: userId },
        data: { senha: newPasswordHash }
      });
      return reply.send({ message: "Senha alterada com sucesso!" });
    } catch (error) {
      return reply.status(400).send({ message: "Erro ao alterar senha." });
    }
  });
  app2.get("/users", async (request, reply) => {
    const { sub: userId, cargo } = request.user;
    const userRole = cargo === "Agente Social" ? import_client3.Cargo.Agente_Social : cargo;
    if (userRole !== import_client3.Cargo.Gerente) {
      return reply.status(403).send({ message: "Acesso negado." });
    }
    try {
      const users = await prisma.user.findMany({
        where: {
          id: { not: userId },
          // Não lista a si mesmo
          ativo: true
        },
        orderBy: { nome: "asc" },
        select: {
          id: true,
          nome: true,
          email: true,
          cargo: true,
          matricula: true,
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
          ativo: true
        },
        orderBy: { nome: "asc" },
        select: { id: true, nome: true }
      });
      return reply.status(200).send(agents);
    } catch (error) {
      return reply.status(500).send({ message: "Erro interno." });
    }
  });
  app2.get("/users/specialists", async (request, reply) => {
    try {
      const specialists = await prisma.user.findMany({
        where: {
          cargo: import_client3.Cargo.Especialista,
          ativo: true
        },
        orderBy: { nome: "asc" },
        select: { id: true, nome: true }
      });
      return reply.status(200).send(specialists);
    } catch (error) {
      return reply.status(500).send({ message: "Erro interno." });
    }
  });
  app2.put("/users/:id", async (request, reply) => {
    const { cargo } = request.user;
    const userRole = cargo === "Agente Social" ? import_client3.Cargo.Agente_Social : cargo;
    if (userRole !== import_client3.Cargo.Gerente) {
      return reply.status(403).send({ message: "Acesso negado." });
    }
    const paramsSchema = import_zod3.z.object({ id: import_zod3.z.string().uuid() });
    const bodySchema = import_zod3.z.object({
      nome: import_zod3.z.string().min(3),
      email: import_zod3.z.string().email(),
      cargo: import_zod3.z.nativeEnum(import_client3.Cargo),
      matricula: import_zod3.z.string().optional()
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
          cargo: data.cargo,
          matricula: data.matricula
        }
      });
      const { senha, ...safeUser } = updatedUser;
      return reply.status(200).send(safeUser);
    } catch (error) {
      console.error("Erro ao atualizar usu\xE1rio:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
  app2.delete("/users/:id", async (request, reply) => {
    const { cargo } = request.user;
    const userRole = cargo === "Agente Social" ? import_client3.Cargo.Agente_Social : cargo;
    if (userRole !== import_client3.Cargo.Gerente) {
      return reply.status(403).send({ message: "Acesso negado." });
    }
    const paramsSchema = import_zod3.z.object({ id: import_zod3.z.string().uuid() });
    try {
      const { id } = paramsSchema.parse(request.params);
      await prisma.user.update({
        where: { id },
        data: { ativo: false }
      });
      return reply.status(204).send();
    } catch (error) {
      console.error("Erro ao desativar usu\xE1rio:", error);
      return reply.status(500).send({ message: "Erro interno." });
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
      await reply.status(401).send(err);
    }
  });
  app2.post("/cases/:caseId/evolutions", async (request, reply) => {
    const paramsSchema = import_zod4.z.object({ caseId: import_zod4.z.string().uuid() });
    const bodySchema = import_zod4.z.object({
      conteudo: import_zod4.z.string().min(3, "Escreva algo relevante."),
      sigilo: import_zod4.z.boolean().default(false)
    });
    try {
      const { caseId } = paramsSchema.parse(request.params);
      const { conteudo, sigilo } = bodySchema.parse(request.body);
      const user = request.user;
      const caso = await prisma.case.findUnique({ where: { id: caseId } });
      if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
      const evolucao = await prisma.evolucao.create({
        data: {
          conteudo,
          sigilo,
          casoId: caseId,
          // Vínculo garantido
          autorId: user.sub
        },
        include: {
          autor: { select: { id: true, nome: true, cargo: true } }
        }
      });
      await prisma.caseLog.create({
        data: {
          casoId: caseId,
          autorId: user.sub,
          acao: import_client4.LogAction.EVOLUCAO_CRIADA,
          descricao: sigilo ? "Evolu\xE7\xE3o Sigilosa." : "Evolu\xE7\xE3o T\xE9cnica."
        }
      });
      await prisma.case.update({
        where: { id: caseId },
        data: { updatedAt: /* @__PURE__ */ new Date() }
      });
      return reply.status(201).send(evolucao);
    } catch (error) {
      console.error("Erro POST Evolu\xE7\xE3o:", error);
      return reply.status(500).send({ message: "Erro ao criar evolu\xE7\xE3o." });
    }
  });
  app2.get("/cases/:caseId/evolutions", async (request, reply) => {
    const paramsSchema = import_zod4.z.object({ caseId: import_zod4.z.string().uuid() });
    const querySchema = import_zod4.z.object({
      page: import_zod4.z.coerce.number().min(1).default(1),
      pageSize: import_zod4.z.coerce.number().default(10)
    });
    try {
      const { caseId } = paramsSchema.parse(request.params);
      const { page, pageSize } = querySchema.parse(request.query);
      const user = request.user;
      const whereCondition = {
        casoId: caseId
        // Garante que só busca desse caso
      };
      if (user.cargo !== import_client4.Cargo.Gerente) {
        whereCondition.OR = [
          { sigilo: false },
          // Vejo todas as públicas
          { autorId: user.sub }
          // Vejo as minhas (mesmo sigilosas)
        ];
      }
      const [evolucoes, total] = await Promise.all([
        prisma.evolucao.findMany({
          where: whereCondition,
          orderBy: { createdAt: "desc" },
          // Mais recentes primeiro
          take: pageSize,
          skip: (page - 1) * pageSize,
          include: {
            autor: {
              select: { id: true, nome: true, cargo: true }
            }
          }
        }),
        prisma.evolucao.count({ where: whereCondition })
      ]);
      return reply.send({
        items: evolucoes,
        total,
        page,
        totalPages: Math.ceil(total / pageSize)
      });
    } catch (error) {
      console.error("Erro GET Evolu\xE7\xF5es:", error);
      return reply.status(500).send({ message: "Erro ao listar evolu\xE7\xF5es." });
    }
  });
  app2.put("/evolutions/:id", async (request, reply) => {
    const paramsSchema = import_zod4.z.object({ id: import_zod4.z.string().uuid() });
    const bodySchema = import_zod4.z.object({ conteudo: import_zod4.z.string().min(3), sigilo: import_zod4.z.boolean() });
    try {
      const { id } = paramsSchema.parse(request.params);
      const { conteudo, sigilo } = bodySchema.parse(request.body);
      const user = request.user;
      const evolucao = await prisma.evolucao.findUnique({ where: { id } });
      if (!evolucao) return reply.status(404).send({ message: "N\xE3o encontrado." });
      if (evolucao.autorId !== user.sub) return reply.status(403).send({ message: "Sem permiss\xE3o." });
      const updated = await prisma.evolucao.update({
        where: { id },
        data: { conteudo, sigilo }
      });
      return reply.send(updated);
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao editar." });
    }
  });
  app2.delete("/evolutions/:id", async (request, reply) => {
    const paramsSchema = import_zod4.z.object({ id: import_zod4.z.string().uuid() });
    try {
      const { id } = paramsSchema.parse(request.params);
      const user = request.user;
      const evolucao = await prisma.evolucao.findUnique({ where: { id } });
      if (!evolucao) return reply.status(404).send({ message: "N\xE3o encontrado." });
      if (evolucao.autorId !== user.sub && user.cargo !== import_client4.Cargo.Gerente) {
        return reply.status(403).send({ message: "Sem permiss\xE3o." });
      }
      await prisma.evolucao.delete({ where: { id } });
      await prisma.caseLog.create({
        data: {
          casoId: evolucao.casoId,
          autorId: user.sub,
          acao: import_client4.LogAction.OUTRO,
          descricao: "Excluiu uma evolu\xE7\xE3o."
        }
      });
      return reply.status(204).send();
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao excluir." });
    }
  });
}

// src/routes/paf.ts
var import_zod5 = require("zod");
var import_client5 = require("@prisma/client");
async function pafRoutes(app2) {
  app2.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  const pafBodySchema = import_zod5.z.object({
    diagnostico: import_zod5.z.string().min(10, "O diagn\xF3stico deve conter ao menos 10 caracteres."),
    objetivos: import_zod5.z.string().min(10, "Os objetivos devem conter ao menos 10 caracteres."),
    estrategias: import_zod5.z.string().min(10, "As estrat\xE9gias devem conter ao menos 10 caracteres."),
    deadline: import_zod5.z.coerce.date({ required_error: "A data do prazo \xE9 obrigat\xF3ria." })
  });
  const paramsSchema = import_zod5.z.object({
    caseId: import_zod5.z.string().uuid()
  });
  app2.get("/cases/:caseId/paf", async (request, reply) => {
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
  });
  app2.get("/cases/:caseId/paf/history", async (request, reply) => {
    try {
      const { caseId } = paramsSchema.parse(request.params);
      const paf = await prisma.paf.findUnique({ where: { casoId: caseId } });
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
      return reply.status(500).send({ message: "Erro ao buscar hist\xF3rico do PAF." });
    }
  });
  app2.post("/cases/:caseId/paf", async (request, reply) => {
    try {
      const { caseId } = paramsSchema.parse(request.params);
      const data = pafBodySchema.parse(request.body);
      const { sub: autorId, cargo } = request.user;
      if (cargo !== import_client5.Cargo.Especialista && cargo !== import_client5.Cargo.Gerente) {
        return reply.status(403).send({ message: "Apenas especialistas podem criar um PAF." });
      }
      const existing = await prisma.paf.findUnique({ where: { casoId: caseId } });
      if (existing) {
        return reply.status(409).send({ message: "J\xE1 existe um PAF para este caso. Use a edi\xE7\xE3o." });
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
          casoId: caseId,
          autorId,
          acao: import_client5.LogAction.PAF_CRIADO,
          descricao: "Criou o PAF inicial do caso.",
          valorNovo: JSON.stringify(data)
        }
      });
      return reply.status(201).send(created);
    } catch (error) {
      if (error instanceof import_zod5.z.ZodError) return reply.status(400).send({ message: "Dados inv\xE1lidos", errors: error.flatten().fieldErrors });
      console.error("\u274C Erro ao criar PAF:", error);
      return reply.status(500).send({ message: "Erro interno ao criar PAF." });
    }
  });
  app2.put("/cases/:caseId/paf", async (request, reply) => {
    try {
      const { caseId } = paramsSchema.parse(request.params);
      const bodyData = pafBodySchema.parse(request.body);
      const { sub: userId, cargo } = request.user;
      const existing = await prisma.paf.findUnique({ where: { casoId: caseId } });
      if (!existing) {
        return reply.status(404).send({ message: "PAF n\xE3o encontrado." });
      }
      if (existing.autorId !== userId && cargo !== import_client5.Cargo.Gerente) {
        return reply.status(403).send({ message: "Apenas o autor ou gerente podem editar este PAF." });
      }
      const nextVersionNumber = existing.versaoAtual + 1;
      const updated = await prisma.$transaction(async (tx) => {
        await tx.pafVersion.create({
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
        const newPaf = await tx.paf.update({
          where: { casoId: caseId },
          data: {
            ...bodyData,
            autorId: userId,
            // Novo autor da versão atual
            versaoAtual: nextVersionNumber,
            updatedAt: /* @__PURE__ */ new Date()
          }
        });
        await tx.caseLog.create({
          data: {
            casoId: caseId,
            autorId: userId,
            acao: import_client5.LogAction.PAF_ATUALIZADO,
            descricao: `Atualizou o PAF para a vers\xE3o ${nextVersionNumber}.`
          }
        });
        return newPaf;
      });
      return reply.status(200).send(updated);
    } catch (error) {
      if (error instanceof import_zod5.z.ZodError) return reply.status(400).send({ message: "Dados inv\xE1lidos", errors: error.flatten().fieldErrors });
      console.error("\u274C Erro ao atualizar PAF:", error);
      return reply.status(500).send({ message: "Erro interno ao atualizar PAF." });
    }
  });
}

// src/routes/stats.ts
var import_date_fns2 = require("date-fns");
var import_locale2 = require("date-fns/locale");
var import_client6 = require("@prisma/client");
var import_zod6 = require("zod");
var calculateUrgencyWeight2 = (urgencia) => {
  if (!urgencia) return 1;
  const term = urgencia.trim();
  if (["Convive com agressor", "Idoso 80+", "Primeira inf\xE2ncia", "Risco de morte"].includes(term)) return 4;
  if (["Risco de reincid\xEAncia", "Sofre amea\xE7a", "Risco de desabrigo", "Crian\xE7a/Adolescente"].includes(term)) return 3;
  if (["PCD", "Idoso", "Interna\xE7\xE3o", "Acolhimento", "Gestante/Lactante"].includes(term)) return 2;
  return 1;
};
async function statsRoutes(app2) {
  app2.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.get("/stats", async (request, reply) => {
    const { cargo, sub: userId } = request.user;
    if (cargo === import_client6.Cargo.Gerente) {
      const cacheKey = "manager_stats_main";
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        reply.header("X-Cache", "HIT");
        return reply.send(cachedData);
      }
      const today2 = /* @__PURE__ */ new Date();
      const firstDayOfMonth2 = (0, import_date_fns2.startOfMonth)(today2);
      const lastDayOfMonth2 = (0, import_date_fns2.endOfMonth)(today2);
      try {
        const [
          totalCases,
          acolhidasCount,
          acompanhamentosCount,
          monitoringCount,
          newCases,
          closedCases,
          workloadAgent,
          workloadSpec,
          urgencyGroups,
          categoryGroups
        ] = await Promise.all([
          prisma.case.count({ where: { status: { not: import_client6.CaseStatus.DESLIGADO } } }),
          // Total Ativos
          prisma.case.count({ where: { status: { in: [import_client6.CaseStatus.AGUARDANDO_ACOLHIDA, import_client6.CaseStatus.EM_ACOLHIDA] } } }),
          prisma.case.count({ where: { status: { in: [import_client6.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, import_client6.CaseStatus.EM_ACOMPANHAMENTO_PAEFI] } } }),
          prisma.case.count({ where: { status: import_client6.CaseStatus.EM_MONITORAMENTO } }),
          prisma.case.count({ where: { dataEntrada: { gte: firstDayOfMonth2, lte: lastDayOfMonth2 } } }),
          prisma.case.count({ where: { status: import_client6.CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth2, lte: lastDayOfMonth2 } } }),
          // Agrupamentos
          prisma.case.groupBy({
            by: ["agenteAcolhidaId"],
            where: { status: { in: [import_client6.CaseStatus.AGUARDANDO_ACOLHIDA, import_client6.CaseStatus.EM_ACOLHIDA] }, agenteAcolhidaId: { not: null } },
            _count: { _all: true }
          }),
          prisma.case.groupBy({
            by: ["especialistaPAEFIId"],
            where: { status: { in: [import_client6.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, import_client6.CaseStatus.EM_ACOMPANHAMENTO_PAEFI] }, especialistaPAEFIId: { not: null } },
            _count: { _all: true }
          }),
          prisma.case.groupBy({ by: ["urgencia"], _count: { _all: true }, where: { status: { not: import_client6.CaseStatus.DESLIGADO } } }),
          prisma.case.groupBy({ by: ["categoria"], _count: { _all: true }, where: { status: { not: import_client6.CaseStatus.DESLIGADO } } })
        ]);
        const userIds = new Set([
          ...workloadAgent.map((w) => w.agenteAcolhidaId),
          ...workloadSpec.map((w) => w.especialistaPAEFIId)
        ].filter(Boolean));
        const users = await prisma.user.findMany({ where: { id: { in: Array.from(userIds) } }, select: { id: true, nome: true } });
        const userMap = new Map(users.map((u) => [u.id, u.nome]));
        const result = {
          role: "Gerente",
          totalCases,
          acolhidasCount,
          acompanhamentosCount,
          monitoringCount,
          newCasesThisMonth: newCases,
          closedCasesThisMonth: closedCases,
          workloadByAgent: workloadAgent.map((w) => ({ name: userMap.get(w.agenteAcolhidaId) || "Desc.", value: w._count._all })),
          workloadBySpecialist: workloadSpec.map((w) => ({ name: userMap.get(w.especialistaPAEFIId) || "Desc.", value: w._count._all })),
          casesByUrgency: urgencyGroups.map((g) => ({ name: g.urgencia || "N\xE3o classificado", value: g._count._all })),
          casesByCategory: categoryGroups.map((g) => ({ name: g.categoria || "N\xE3o classificado", value: g._count._all })),
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
        };
        cache.set(cacheKey, result);
        reply.header("X-Cache", "MISS");
        return reply.send(result);
      } catch (error) {
        console.error("Erro stats:", error);
        return reply.status(500).send({ message: "Erro ao processar dados." });
      }
    }
    const today = /* @__PURE__ */ new Date();
    const firstDayOfMonth = (0, import_date_fns2.startOfMonth)(today);
    const lastDayOfMonth = (0, import_date_fns2.endOfMonth)(today);
    try {
      if (cargo === import_client6.Cargo.Agente_Social) {
        const [myActive, myClosed, myNew] = await Promise.all([
          prisma.case.count({ where: { agenteAcolhidaId: userId, status: { in: [import_client6.CaseStatus.AGUARDANDO_ACOLHIDA, import_client6.CaseStatus.EM_ACOLHIDA] } } }),
          prisma.case.count({ where: { agenteAcolhidaId: userId, status: import_client6.CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
          prisma.case.count({ where: { agenteAcolhidaId: userId, dataEntrada: { gte: firstDayOfMonth, lte: lastDayOfMonth } } })
        ]);
        return reply.send({ role: "Agente_Social", myActiveCases: myActive, myClosedMonth: myClosed, myNewCasesMonth: myNew });
      }
      if (cargo === import_client6.Cargo.Especialista) {
        const [myActive, myClosed, myNew] = await Promise.all([
          prisma.case.count({ where: { especialistaPAEFIId: userId, status: { in: [import_client6.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, import_client6.CaseStatus.EM_ACOMPANHAMENTO_PAEFI, import_client6.CaseStatus.EM_MONITORAMENTO] } } }),
          prisma.case.count({ where: { especialistaPAEFIId: userId, status: import_client6.CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
          prisma.case.count({ where: { especialistaPAEFIId: userId, dataInicioPAEFI: { gte: firstDayOfMonth, lte: lastDayOfMonth } } })
        ]);
        return reply.send({ role: "Especialista", myActiveCases: myActive, myClosedMonth: myClosed, myNewCasesMonth: myNew });
      }
      return reply.status(200).send({ message: "Sem dados espec\xEDficos." });
    } catch (error) {
      return reply.status(500).send({ message: "Erro interno." });
    }
  });
  app2.get("/stats/productivity", async (request, reply) => {
    const querySchema = import_zod6.z.object({
      mode: import_zod6.z.enum(["workload", "performance"]).default("workload"),
      months: import_zod6.z.coerce.number().default(1)
    });
    const { mode, months } = querySchema.parse(request.query);
    try {
      const users = await prisma.user.findMany({
        where: { ativo: true, cargo: { not: import_client6.Cargo.Gerente } },
        select: { id: true, nome: true, cargo: true }
      });
      if (mode === "performance") {
        const startDate = (0, import_date_fns2.subMonths)(/* @__PURE__ */ new Date(), months);
        const safeActions = Object.values(import_client6.LogAction);
        const activityCounts = await prisma.caseLog.groupBy({
          by: ["autorId"],
          where: {
            createdAt: { gte: startDate },
            acao: { in: safeActions }
          },
          _count: { _all: true }
        });
        const data2 = users.map((u) => {
          const stats = activityCounts.find((a) => a.autorId === u.id);
          return {
            name: u.nome.split(" ")[0],
            value: stats ? stats._count._all : 0,
            role: u.cargo
          };
        }).sort((a, b) => b.value - a.value);
        return reply.send(data2);
      }
      const specialistStats = await prisma.case.groupBy({
        by: ["especialistaPAEFIId", "status"],
        where: {
          especialistaPAEFIId: { in: users.map((u) => u.id) },
          status: { in: [import_client6.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, import_client6.CaseStatus.EM_ACOMPANHAMENTO_PAEFI, import_client6.CaseStatus.EM_MONITORAMENTO] }
        },
        _count: { _all: true }
      });
      const agentStats = await prisma.case.groupBy({
        by: ["agenteAcolhidaId", "status"],
        where: {
          agenteAcolhidaId: { in: users.map((u) => u.id) },
          status: { in: [import_client6.CaseStatus.AGUARDANDO_ACOLHIDA, import_client6.CaseStatus.EM_ACOLHIDA] }
        },
        _count: { _all: true }
      });
      const data = users.map((u) => {
        let active = 0;
        let monitoring = 0;
        if (u.cargo === import_client6.Cargo.Especialista) {
          const stats = specialistStats.filter((s) => s.especialistaPAEFIId === u.id);
          active = stats.filter((s) => s.status !== import_client6.CaseStatus.EM_MONITORAMENTO).reduce((acc, curr) => acc + curr._count._all, 0);
          monitoring = stats.filter((s) => s.status === import_client6.CaseStatus.EM_MONITORAMENTO).reduce((acc, curr) => acc + curr._count._all, 0);
        } else if (u.cargo === import_client6.Cargo.Agente_Social) {
          const stats = agentStats.filter((s) => s.agenteAcolhidaId === u.id);
          active = stats.reduce((acc, curr) => acc + curr._count._all, 0);
        }
        return {
          id: u.id,
          name: u.nome,
          role: u.cargo,
          active,
          monitoring,
          totalLoad: active + monitoring * 0.2
          // Peso menor para monitoramento
        };
      }).sort((a, b) => b.totalLoad - a.totalLoad);
      return reply.send(data);
    } catch (error) {
      console.error("Erro em /stats/productivity:", error);
      return reply.status(500).send([]);
    }
  });
  app2.get("/stats/vigilancia", async (request, reply) => {
    const { cargo } = request.user;
    if (!["Gerente", "Especialista"].includes(cargo)) return reply.status(403).send({ message: "Acesso restrito." });
    try {
      const today = /* @__PURE__ */ new Date();
      const sixMonthsAgo = (0, import_date_fns2.subMonths)(today, 6);
      const [
        allCases,
        violations,
        urgencies,
        origins,
        referrals,
        benefits,
        groupCount,
        participantsCount,
        demographicsRaw
      ] = await Promise.all([
        // 1. Dados Brutos para Cálculos de Tempo
        prisma.case.findMany({
          where: { OR: [{ dataEntrada: { gte: sixMonthsAgo } }, { dataDesligamento: { gte: sixMonthsAgo } }] },
          select: { dataEntrada: true, dataDesligamento: true, dataInicioPAEFI: true, status: true, id: true, urgencia: true }
        }),
        // 2. Violações
        prisma.case.groupBy({ by: ["violacao"], _count: { _all: true }, where: { status: { not: import_client6.CaseStatus.DESLIGADO } } }),
        // 3. Urgências
        prisma.case.groupBy({ by: ["urgencia"], _count: { _all: true }, where: { status: { not: import_client6.CaseStatus.DESLIGADO } } }),
        // 4. Origens
        prisma.case.groupBy({ by: ["orgaoDemandante"], _count: { _all: true }, where: { status: { not: import_client6.CaseStatus.DESLIGADO } }, orderBy: { _count: { orgaoDemandante: "desc" } }, take: 10 }),
        // 5. Encaminhamentos
        prisma.encaminhamento.groupBy({ by: ["instituicao"], _count: { _all: true }, orderBy: { _count: { instituicao: "desc" } }, take: 10 }),
        // 6. Benefícios
        prisma.serviceDeliverable.groupBy({ by: ["tipo"], _count: { _all: true }, orderBy: { _count: { tipo: "desc" } } }),
        // 7. Grupos
        prisma.groupActivity.count({ where: { dataRealizacao: { gte: sixMonthsAgo } } }),
        // 8. Participantes
        prisma.groupAttendance.count({ where: { presente: true, grupo: { dataRealizacao: { gte: sixMonthsAgo } } } }),
        // 9. Dados para o Mapa e Demografia
        prisma.case.findMany({
          where: { status: { not: import_client6.CaseStatus.DESLIGADO } },
          select: { nascimento: true, sexo: true, id: true, urgencia: true, violacao: true, categoria: true }
        })
      ]);
      const monthsMap = /* @__PURE__ */ new Map();
      for (let i = 5; i >= 0; i--) {
        const d = (0, import_date_fns2.subMonths)(today, i);
        const key = (0, import_date_fns2.format)(d, "yyyy-MM");
        const label = (0, import_date_fns2.format)(d, "MMM/yy", { locale: import_locale2.ptBR });
        monthsMap.set(key, { name: label.charAt(0).toUpperCase() + label.slice(1), novos: 0, desligados: 0 });
      }
      allCases.forEach((c) => {
        const entryKey = (0, import_date_fns2.format)(c.dataEntrada, "yyyy-MM");
        const exitKey = c.dataDesligamento ? (0, import_date_fns2.format)(c.dataDesligamento, "yyyy-MM") : null;
        if (monthsMap.has(entryKey)) monthsMap.get(entryKey).novos++;
        if (exitKey && monthsMap.has(exitKey)) monthsMap.get(exitKey).desligados++;
      });
      const evolutionData = Array.from(monthsMap.values());
      const violationData = violations.map((v) => ({ name: v.violacao || "N/A", value: v._count._all })).sort((a, b) => b.value - a.value);
      const urgencyData = urgencies.map((u) => ({
        name: u.urgencia || "N/A",
        value: u._count._all,
        weight: calculateUrgencyWeight2(u.urgencia)
      })).sort((a, b) => b.weight - a.weight);
      const originData = origins.map((o) => ({ name: o.orgaoDemandante || "N/A", value: o._count._all }));
      const networkData = referrals.map((r) => ({ name: r.instituicao, value: r._count._all }));
      const benefitsData = benefits.map((b) => ({ name: b.tipo, value: b._count._all }));
      const collectiveData = {
        totalGroups: groupCount,
        totalParticipants: participantsCount,
        avgAttendance: groupCount > 0 ? Math.round(participantsCount / groupCount) : 0
      };
      const closedCases = allCases.filter((c) => c.dataDesligamento && c.dataEntrada);
      const totalDaysOpen = closedCases.reduce((acc, c) => {
        const diff = Math.abs(c.dataDesligamento.getTime() - c.dataEntrada.getTime());
        return acc + Math.ceil(diff / (1e3 * 60 * 60 * 24));
      }, 0);
      const avgPermanence = closedCases.length ? Math.round(totalDaysOpen / closedCases.length) : 0;
      const paefiCases = allCases.filter((c) => c.dataInicioPAEFI && c.dataEntrada);
      const totalWaitDays = paefiCases.reduce((acc, c) => {
        const diff = Math.abs(c.dataInicioPAEFI.getTime() - c.dataEntrada.getTime());
        return acc + Math.ceil(diff / (1e3 * 60 * 60 * 24));
      }, 0);
      const avgWaitTime = paefiCases.length ? Math.round(totalWaitDays / paefiCases.length) : 0;
      const efficiencyData = {
        avgPermanence,
        avgWaitTime,
        totalClosed: closedCases.length,
        retentionRate: Math.round((1 - closedCases.length / (allCases.length || 1)) * 100)
      };
      const demographics = {
        sexo: { Masculino: 0, Feminino: 0, Outro: 0 },
        etaria: { "0-11 (Crian\xE7a)": 0, "12-17 (Adolescente)": 0, "18-59 (Adulto)": 0, "60+ (Idoso)": 0 }
      };
      demographicsRaw.forEach((c) => {
        if (c.sexo === "Masculino") demographics.sexo.Masculino++;
        else if (c.sexo === "Feminino") demographics.sexo.Feminino++;
        else demographics.sexo.Outro++;
        if (c.nascimento) {
          const age = (/* @__PURE__ */ new Date()).getFullYear() - c.nascimento.getFullYear();
          if (age < 12) demographics.etaria["0-11 (Crian\xE7a)"]++;
          else if (age < 18) demographics.etaria["12-17 (Adolescente)"]++;
          else if (age < 60) demographics.etaria["18-59 (Adulto)"]++;
          else demographics.etaria["60+ (Idoso)"]++;
        }
      });
      const ageData = Object.entries(demographics.etaria).map(([name, value]) => ({ name, value }));
      const sexData = Object.entries(demographics.sexo).map(([name, value]) => ({ name, value }));
      const mapData = demographicsRaw.map((c) => {
        const pseudoRandom = c.id.charCodeAt(0) + c.id.charCodeAt(c.id.length - 1);
        const latOffset = (pseudoRandom % 100 - 50) / 4e3;
        const lngOffset = (pseudoRandom % 100 - 50) / 4e3;
        return {
          id: c.id,
          lat: -15.668 + latOffset,
          // Coordenada base (ex: Brasília) - ideal ser configurável
          lng: -48.201 + lngOffset,
          intensity: calculateUrgencyWeight2(c.urgencia),
          label: c.urgencia,
          violacao: c.violacao || "N\xE3o Informado",
          categoria: c.categoria || "N\xE3o Informado"
        };
      });
      return reply.send({ evolutionData, violationData, urgencyData, originData, collectiveData, ageData, sexData, mapData, networkData, benefitsData, efficiencyData });
    } catch (error) {
      console.error("Erro vigil\xE2ncia:", error);
      return reply.status(500).send({ message: "Erro de vigil\xE2ncia." });
    }
  });
  app2.get("/stats/advanced", async (request, reply) => {
    const { cargo } = request.user;
    const querySchema = import_zod6.z.object({ months: import_zod6.z.coerce.number().default(12), violacao: import_zod6.z.string().optional() });
    const { months, violacao } = querySchema.parse(request.query);
    if (cargo !== import_client6.Cargo.Gerente) return reply.status(403).send({ message: "Acesso restrito." });
    try {
      const today = /* @__PURE__ */ new Date();
      const startDate = (0, import_date_fns2.startOfMonth)((0, import_date_fns2.subMonths)(today, months - 1));
      const whereClause = { OR: [{ dataEntrada: { gte: startDate } }, { dataDesligamento: { gte: startDate } }] };
      if (violacao && violacao !== "all") {
        whereClause.violacao = violacao;
      }
      const cases = await prisma.case.findMany({
        where: whereClause,
        select: { id: true, dataEntrada: true, dataDesligamento: true, status: true, violacao: true }
      });
      const monthlyStats = /* @__PURE__ */ new Map();
      for (let i = 0; i < months; i++) {
        const d = (0, import_date_fns2.subMonths)(today, months - 1 - i);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        monthlyStats.set(key, { name: d.toLocaleDateString("pt-BR", { month: "short" }).toUpperCase(), novos: 0, fechados: 0 });
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
        if (diff > 15) insights.push(`\u{1F4C8} Aumento s\xFAbito de ${Math.round(diff)}% na demanda este m\xEAs.`);
        else if (diff < -15) insights.push(`\u{1F4C9} Queda de ${Math.abs(Math.round(diff))}% na demanda este m\xEAs.`);
      }
      if (avgHandlingTime > 120) insights.push(`\u26A0\uFE0F Tempo m\xE9dio de acompanhamento alto (${avgHandlingTime} dias).`);
      if (pieData.length > 0) insights.push(`\u{1F50D} Principal demanda local: ${pieData[0].name} (${pieData[0].value} casos).`);
      return reply.send({ trendData, avgHandlingTime, totalActive: activeTotal, insights, pieData });
    } catch (error) {
      return reply.status(500).send({ message: "Erro interno ao processar analytics." });
    }
  });
  app2.get("/stats/heatmap", async (request, reply) => {
    const querySchema = import_zod6.z.object({ months: import_zod6.z.coerce.number().default(12) });
    const { months } = querySchema.parse(request.query);
    try {
      const startDate = (0, import_date_fns2.subMonths)(/* @__PURE__ */ new Date(), months);
      const logs = await prisma.caseLog.findMany({ where: { createdAt: { gte: startDate } }, select: { createdAt: true } });
      const map = /* @__PURE__ */ new Map();
      logs.forEach((l) => {
        const day = (0, import_date_fns2.format)(l.createdAt, "yyyy-MM-dd");
        map.set(day, (map.get(day) || 0) + 1);
      });
      const result = Array.from(map.entries()).map(([date, count]) => ({ date, count }));
      return reply.send(result);
    } catch {
      return reply.status(500).send([]);
    }
  });
  app2.get("/stats/my-agenda", async (request, reply) => {
    const { sub: userId } = request.user;
    try {
      const start = (0, import_date_fns2.startOfDay)(/* @__PURE__ */ new Date());
      const appointments = await prisma.agendamento.findMany({
        where: { responsavelId: userId, data: { gte: start } },
        orderBy: { data: "asc" },
        take: 5,
        include: { caso: { select: { id: true, nomeCompleto: true } } }
      });
      return reply.send(appointments);
    } catch {
      return reply.status(500).send({ message: "Erro agenda." });
    }
  });
}

// src/routes/appointments.ts
var import_zod7 = require("zod");
var import_client7 = require("@prisma/client");
var emptyToNull = (val) => {
  if (typeof val === "string" && val.trim() === "") return null;
  return val;
};
async function appointmentRoutes(app2) {
  app2.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.get("/appointments", async (request, reply) => {
    const querySchema = import_zod7.z.object({
      caseId: import_zod7.z.string().uuid().optional(),
      month: import_zod7.z.string().regex(/^\d{4}-\d{2}$/).optional(),
      pageSize: import_zod7.z.coerce.number().optional().default(100)
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
  app2.post("/appointments", async (request, reply) => {
    const bodySchema = import_zod7.z.object({
      titulo: import_zod7.z.string().min(3, "T\xEDtulo \xE9 obrigat\xF3rio"),
      data: import_zod7.z.coerce.date({ required_error: "Data \xE9 obrigat\xF3ria" }),
      observacoes: import_zod7.z.preprocess(emptyToNull, import_zod7.z.string().optional().nullable()),
      casoId: import_zod7.z.string().uuid()
    });
    try {
      const { titulo, data, observacoes, casoId: casoId2 } = bodySchema.parse(request.body);
      const { sub: userId } = request.user;
      const agendamento = await prisma.agendamento.create({
        data: {
          titulo,
          data,
          observacoes,
          casoId: casoId2,
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
          casoId: casoId2,
          autorId: userId,
          acao: import_client7.LogAction.AGENDAMENTO_CRIADO,
          descricao: `Agendou: ${titulo} para ${data.toLocaleDateString("pt-BR")}`
        }
      });
      return reply.status(201).send(agendamento);
    } catch (error) {
      console.error("Erro POST Appointment:", error);
      if (error instanceof import_zod7.z.ZodError) return reply.status(400).send({ message: "Dados inv\xE1lidos", errors: error.flatten().fieldErrors });
      return reply.status(500).send({ message: "Erro ao criar agendamento." });
    }
  });
  app2.delete("/appointments/:id", async (request, reply) => {
    const paramsSchema = import_zod7.z.object({ id: import_zod7.z.string().uuid() });
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
          acao: import_client7.LogAction.OUTRO,
          descricao: `Cancelou agendamento: ${ag.titulo}`
        }
      });
      return reply.status(204).send();
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao excluir." });
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
        return reply.status(403).send({ message: "Acesso negado. Apenas Ger\xEAncia." });
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
          sexo: true,
          urgencia: true,
          violacao: true,
          dataEntrada: true,
          status: true,
          agenteAcolhidaId: true,
          especialistaPAEFIId: true
          // Não precisamos dos includes complexos aqui, só os IDs bastam para filtrar
        },
        orderBy: { pesoUrgencia: "desc" }
      });
      const overview = technicians.map((tech) => {
        const techCases = activeCases.filter((c) => {
          if (tech.cargo === import_client8.Cargo.Agente_Social) {
            return c.agenteAcolhidaId === tech.id && (c.status === import_client8.CaseStatus.AGUARDANDO_ACOLHIDA || c.status === import_client8.CaseStatus.EM_ACOLHIDA);
          }
          if (tech.cargo === import_client8.Cargo.Especialista) {
            return c.especialistaPAEFIId === tech.id && (c.status === import_client8.CaseStatus.EM_ACOMPANHAMENTO_PAEFI || c.status === import_client8.CaseStatus.EM_MONITORAMENTO);
          }
          return false;
        });
        return {
          id: tech.id,
          nome: tech.nome,
          cargo: tech.cargo === import_client8.Cargo.Agente_Social ? "Agente Social" : "Especialista",
          cases: techCases,
          caseCount: techCases.length
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
      const [year, m] = month.split("-").map(Number);
      const firstDay = new Date(Date.UTC(year, m - 1, 1));
      const lastDay = new Date(Date.UTC(year, m, 0, 23, 59, 59));
      const [initialCount, newEntriesCount, closedCasesCount] = await Promise.all([
        // Volume Inicial (Casos ativos vindos do mês anterior)
        prisma.case.count({
          where: {
            status: { in: [import_client8.CaseStatus.EM_ACOMPANHAMENTO_PAEFI, import_client8.CaseStatus.EM_MONITORAMENTO] },
            dataInicioPAEFI: { lt: firstDay },
            // Começaram antes deste mês
            OR: [
              { dataDesligamento: null },
              // E não acabaram
              { dataDesligamento: { gte: firstDay } }
              // Ou acabaram, mas só dentro deste mês (então contam no saldo inicial)
            ]
          }
        }),
        // Novos Casos (Entraram no PAEFI neste mês)
        prisma.case.count({
          where: {
            dataInicioPAEFI: { gte: firstDay, lte: lastDay }
          }
        }),
        // Desligados (Saíram do PAEFI neste mês)
        prisma.case.count({
          where: {
            status: import_client8.CaseStatus.DESLIGADO,
            dataDesligamento: { gte: firstDay, lte: lastDay }
          }
        })
      ]);
      const sexGroups = await prisma.case.groupBy({
        by: ["sexo"],
        where: {
          dataInicioPAEFI: { gte: firstDay, lte: lastDay }
        },
        _count: { sexo: true }
      });
      const profileBySex = {
        masculino: 0,
        feminino: 0,
        outro: 0
      };
      sexGroups.forEach((g) => {
        if (!g.sexo) return;
        const s = g.sexo.toLowerCase();
        if (s === "masculino") profileBySex.masculino += g._count.sexo;
        else if (s === "feminino") profileBySex.feminino += g._count.sexo;
        else profileBySex.outro += g._count.sexo;
      });
      const newEntriesAges = await prisma.case.findMany({
        where: { dataInicioPAEFI: { gte: firstDay, lte: lastDay } },
        select: { nascimento: true }
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
      for (const c of newEntriesAges) {
        if (!c.nascimento) continue;
        const age = (0, import_date_fns3.differenceInYears)(now, c.nascimento);
        if (age <= 6) profileByAgeGroup["0-6"]++;
        else if (age <= 12) profileByAgeGroup["7-12"]++;
        else if (age <= 17) profileByAgeGroup["13-17"]++;
        else if (age <= 29) profileByAgeGroup["18-29"]++;
        else if (age <= 59) profileByAgeGroup["30-59"]++;
        else profileByAgeGroup["60+"]++;
      }
      const finalCount = initialCount + newEntriesCount - closedCasesCount;
      return reply.status(200).send({
        initialCount,
        newEntries: newEntriesCount,
        closedCases: closedCasesCount,
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
    const dataLimiteInatividade = (0, import_date_fns4.subDays)(/* @__PURE__ */ new Date(), 30);
    const dataLimiteMonitoramento = (0, import_date_fns4.subDays)(/* @__PURE__ */ new Date(), 60);
    const pafDeadline = (0, import_date_fns4.addDays)(/* @__PURE__ */ new Date(), 15);
    const [
      agenda,
      casosInativos,
      casosMonitoramento,
      distCount,
      acolhidaCount,
      casesWithoutPaf,
      pafsExpiring
    ] = await Promise.all([
      // 1. AGENDAMENTOS (Agenda Pessoal - Próximos 2 dias)
      prisma.agendamento.findMany({
        where: {
          responsavelId: userId,
          data: { gte: today, lt: tomorrowEnd }
        },
        include: { caso: { select: { nomeCompleto: true } } }
      }),
      // 2. CASOS PAEFI INATIVOS (+30 dias sem evolução)
      prisma.case.findMany({
        where: {
          status: import_client9.CaseStatus.EM_ACOMPANHAMENTO_PAEFI,
          // Se for Especialista, filtra os dele. Se for Gerente, vê de todos.
          especialistaPAEFIId: cargo === import_client9.Cargo.Especialista ? userId : void 0,
          evolucoes: {
            none: { createdAt: { gte: dataLimiteInatividade } }
          }
        },
        select: { id: true, nomeCompleto: true }
      }),
      // 3. MONITORAMENTO ESQUECIDO (+60 dias sem evolução)
      prisma.case.findMany({
        where: {
          status: import_client9.CaseStatus.EM_MONITORAMENTO,
          especialistaPAEFIId: cargo === import_client9.Cargo.Especialista ? userId : void 0,
          evolucoes: {
            none: { createdAt: { gte: dataLimiteMonitoramento } }
          }
        },
        select: { id: true, nomeCompleto: true }
      }),
      // 4. [GERENTE] Fila de Distribuição
      cargo === import_client9.Cargo.Gerente ? prisma.case.count({ where: { status: import_client9.CaseStatus.AGUARDANDO_DISTRIBUICAO_PAEFI } }) : Promise.resolve(0),
      // 5. [AGENTE] Fila de Acolhida
      cargo === import_client9.Cargo.Agente_Social ? prisma.case.count({ where: { agenteAcolhidaId: userId, status: import_client9.CaseStatus.AGUARDANDO_ACOLHIDA } }) : Promise.resolve(0),
      // 6. [ESPECIALISTA] Casos sem PAF
      cargo === import_client9.Cargo.Especialista ? prisma.case.count({ where: { especialistaPAEFIId: userId, status: import_client9.CaseStatus.EM_ACOMPANHAMENTO_PAEFI, paf: { is: null } } }) : Promise.resolve(0),
      // 7. [ESPECIALISTA] PAFs Vencendo
      cargo === import_client9.Cargo.Especialista ? prisma.paf.findMany({
        where: {
          caso: {
            especialistaPAEFIId: userId,
            status: { not: import_client9.CaseStatus.DESLIGADO }
          },
          deadline: { gte: today, lte: pafDeadline }
        },
        include: { caso: { select: { nomeCompleto: true, id: true } } }
      }) : Promise.resolve([])
    ]);
    agenda.forEach((ag) => {
      var _a;
      notifications.push({
        id: `agenda-${ag.id}`,
        title: "Compromisso Pr\xF3ximo",
        description: `${ag.titulo} - ${((_a = ag.caso) == null ? void 0 : _a.nomeCompleto) || "Sem caso vinculado"}`,
        link: ag.casoId ? `/dashboard/cases/${ag.casoId}` : "/dashboard/agenda",
        type: "info"
      });
    });
    casosInativos.forEach((caso) => {
      notifications.push({
        id: `inativo-${caso.id}`,
        title: "Caso sem Movimenta\xE7\xE3o",
        description: `${caso.nomeCompleto} n\xE3o tem evolu\xE7\xE3o h\xE1 +30 dias.`,
        link: `/dashboard/cases/${caso.id}`,
        type: "critical"
      });
    });
    casosMonitoramento.forEach((caso) => {
      notifications.push({
        id: `monit-inativo-${caso.id}`,
        title: "Revis\xE3o de Monitoramento",
        description: `Verificar situa\xE7\xE3o de ${caso.nomeCompleto} (sem contato h\xE1 60 dias).`,
        link: `/dashboard/cases/${caso.id}`,
        type: "warning"
      });
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
    if (acolhidaCount > 0) {
      notifications.push({
        id: "acolhida-queue",
        title: "Novos na Acolhida",
        description: `Voc\xEA tem ${acolhidaCount} casos para triagem inicial.`,
        link: "/dashboard/cases?status=AGUARDANDO_ACOLHIDA",
        type: "warning"
      });
    }
    if (casesWithoutPaf > 0) {
      notifications.push({
        id: "missing-paf",
        title: "Casos sem PAF",
        description: `${casesWithoutPaf} casos precisam do plano inicial.`,
        link: "/dashboard/cases",
        // Idealmente filtrar por "Sem PAF" no front
        type: "critical"
      });
    }
    pafsExpiring.forEach((p) => {
      notifications.push({
        id: `paf-exp-${p.id}`,
        title: "Reavalia\xE7\xE3o de PAF",
        description: `Prazo pr\xF3ximo: ${p.caso.nomeCompleto}`,
        link: `/dashboard/cases/${p.caso.id}`,
        type: "warning"
      });
    });
    return reply.send(notifications);
  });
}

// src/routes/audit.ts
var import_zod9 = require("zod");
var import_date_fns5 = require("date-fns");
var import_client10 = require("@prisma/client");
var import_fast_csv2 = require("fast-csv");
async function auditRoutes(app2) {
  app2.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
      const { cargo } = request.user;
      if (cargo !== import_client10.Cargo.Gerente) {
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
      acao: import_zod9.z.nativeEnum(import_client10.LogAction).optional().or(import_zod9.z.literal("all")),
      // Aceita Enum ou 'all'
      periodo: import_zod9.z.enum(["hoje", "7dias", "30dias", "tudo"]).default("7dias"),
      caseId: import_zod9.z.string().uuid().optional(),
      search: import_zod9.z.string().min(1).optional()
    });
    try {
      const params = querySchema.parse(request.query);
      const { page, pageSize, autorId, acao, periodo, caseId, search } = params;
      const where = {};
      if (search) {
        where.OR = [
          { descricao: { contains: search, mode: "insensitive" } },
          { autor: { nome: { contains: search, mode: "insensitive" } } },
          // Busca no nome do caso apenas se o log tiver um caso vinculado
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
      return reply.status(500).send({ message: "Erro ao buscar logs." });
    }
  });
  app2.get("/audit/export", async (request, reply) => {
    try {
      const logs = await prisma.caseLog.findMany({
        take: 1e3,
        orderBy: { createdAt: "desc" },
        include: {
          autor: { select: { nome: true, cargo: true } },
          caso: { select: { nomeCompleto: true } }
        }
      });
      const fileName = `auditoria_sgac_${(0, import_date_fns5.format)(/* @__PURE__ */ new Date(), "yyyy-MM-dd")}.csv`;
      reply.header("Content-Type", "text/csv; charset=utf-8");
      reply.header("Content-Disposition", `attachment; filename="${fileName}"`);
      const csvStream = (0, import_fast_csv2.format)({ headers: true });
      csvStream.pipe(reply.raw);
      logs.forEach((log) => {
        var _a, _b, _c;
        csvStream.write({
          Data: (0, import_date_fns5.format)(log.createdAt, "dd/MM/yyyy HH:mm"),
          Acao: log.acao,
          Autor: ((_a = log.autor) == null ? void 0 : _a.nome) || "Sistema",
          Cargo: ((_b = log.autor) == null ? void 0 : _b.cargo) || "N/A",
          Caso: ((_c = log.caso) == null ? void 0 : _c.nomeCompleto) || "Geral/Sistema",
          Descricao: log.descricao,
          Valor_Anterior: log.valorAnterior || "-",
          Valor_Novo: log.valorNovo || "-"
        });
      });
      csvStream.end();
    } catch (error) {
      console.error("Erro export audit:", error);
      return reply.status(500).send({ message: "Erro ao gerar exporta\xE7\xE3o." });
    }
  });
}

// src/routes/attachments.ts
var import_zod10 = require("zod");
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_client11 = require("@prisma/client");
async function validateFileSignature(buffer) {
  const bytes = buffer.subarray(0, 4).toString("hex").toUpperCase();
  const signatures = {
    "25504446": ["pdf"],
    // %PDF
    "FFD8FFE0": ["image"],
    // JPEG
    "FFD8FFE1": ["image"],
    "FFD8FFEE": ["image"],
    "FFD8FFDB": ["image"],
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
      const caso = await prisma.case.findUnique({ where: { id: caseId } });
      if (!caso) {
        const part = await request.file();
        if (part) await part.toBuffer();
        return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
      }
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ message: "Nenhum arquivo enviado." });
      }
      const buffer = await data.toBuffer();
      const fileType = await validateFileSignature(buffer);
      if (!fileType) {
        return reply.status(400).send({
          message: "Arquivo inv\xE1lido. O sistema aceita apenas PDF, JPG e PNG leg\xEDtimos."
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
      try {
        const anexo = await prisma.anexo.create({
          data: {
            nome: data.filename,
            tipo: data.mimetype,
            url: `/uploads/${fileName}`,
            casoId: caseId,
            autorId: userId,
            tamanho: buffer.length
          }
        });
        await prisma.caseLog.create({
          data: {
            casoId: caseId,
            autorId: userId,
            acao: import_client11.LogAction.ANEXO_ADICIONADO,
            descricao: `Anexou documento: ${data.filename}`
          }
        });
        return reply.status(201).send(anexo);
      } catch (dbError) {
        if (import_fs.default.existsSync(uploadPath)) {
          import_fs.default.unlinkSync(uploadPath);
          console.log(`[Rollback] Arquivo \xF3rf\xE3o removido: ${fileName}`);
        }
        throw dbError;
      }
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
      if (anexo.autorId !== userId && cargo !== import_client11.Cargo.Gerente) {
        return reply.status(403).send({ message: "Sem permiss\xE3o para excluir este anexo." });
      }
      await prisma.anexo.delete({ where: { id } });
      try {
        const filePath = import_path.default.resolve(process.cwd(), "uploads", import_path.default.basename(anexo.url));
        if (import_fs.default.existsSync(filePath)) import_fs.default.unlinkSync(filePath);
      } catch (e) {
        console.error("Aviso: Falha ao apagar arquivo f\xEDsico (pode j\xE1 ter sido removido):", e);
      }
      await prisma.caseLog.create({
        data: {
          casoId: anexo.casoId,
          autorId: userId,
          acao: import_client11.LogAction.OUTRO,
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
var import_fast_csv3 = require("fast-csv");
var import_fs2 = __toESM(require("fs"));
var import_path2 = __toESM(require("path"));
var import_promises = require("stream/promises");
var import_client12 = require("@prisma/client");
var parseDate = (dateStr) => {
  if (!dateStr) return /* @__PURE__ */ new Date();
  if (dateStr.includes("/")) {
    const [d, m, y] = dateStr.split("/");
    return /* @__PURE__ */ new Date(`${y}-${m}-${d}`);
  }
  return new Date(dateStr);
};
async function importRoutes(app2) {
  app2.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
      const { cargo } = request.user;
      if (cargo !== import_client12.Cargo.Gerente) {
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
      if (data) await data.toBuffer();
      return reply.status(400).send({ message: "Por favor, envie um ficheiro CSV v\xE1lido." });
    }
    const uploadDir2 = import_path2.default.resolve(process.cwd(), "uploads");
    if (!import_fs2.default.existsSync(uploadDir2)) import_fs2.default.mkdirSync(uploadDir2, { recursive: true });
    const tempFilePath = import_path2.default.join(uploadDir2, `import_${Date.now()}.csv`);
    await (0, import_promises.pipeline)(data.file, import_fs2.default.createWriteStream(tempFilePath));
    const results = [];
    const errors = [];
    let successCount = 0;
    return new Promise((resolve, reject) => {
      const stream = import_fs2.default.createReadStream(tempFilePath).pipe((0, import_fast_csv3.parse)({ headers: true, ignoreEmpty: true, delimiter: "," }));
      stream.on("error", (error) => {
        console.error("Erro na leitura do CSV:", error);
        if (import_fs2.default.existsSync(tempFilePath)) import_fs2.default.unlinkSync(tempFilePath);
        reject(reply.status(500).send({ message: "Erro ao ler o ficheiro CSV." }));
      }).on("data", (row) => results.push(row)).on("end", async () => {
        try {
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
                const dataNascimento = parseDate(row.Nascimento);
                if (isNaN(dataNascimento.getTime())) {
                  throw new Error("Data inv\xE1lida");
                }
                await tx.case.create({
                  data: {
                    // Obrigatórios
                    nomeCompleto: row.Nome,
                    cpf: cpfLimpo,
                    nascimento: dataNascimento,
                    sexo: row.Sexo || "N\xE3o Informado",
                    telefone: row.Telefone || "",
                    endereco: row.Endereco || "",
                    urgencia: row.Urgencia || "Sem risco imediato",
                    violacao: row.Violacao || "Outros",
                    categoria: row.Categoria || "Fam\xEDlia em vulnerabilidade",
                    orgaoDemandante: row.Orgao || "Demanda Espont\xE2nea",
                    // Opcionais
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
                console.error(`Erro Linha ${rowNum}:`, err);
                errors.push(`Linha ${rowNum}: Erro ao salvar. Verifique a data de nascimento.`);
              }
            }
          }, {
            timeout: 2e4
            // Aumenta timeout para importações grandes
          });
          resolve(reply.send({
            message: "Processamento conclu\xEDdo.",
            total: results.length,
            success: successCount,
            failed: errors.length,
            errors: errors.slice(0, 50)
            // Limita retorno de erros para não explodir payload
          }));
        } catch (txError) {
          console.error("Erro fatal na transa\xE7\xE3o de importa\xE7\xE3o:", txError);
          reject(reply.status(500).send({ message: "Erro fatal no banco de dados durante importa\xE7\xE3o." }));
        } finally {
          if (import_fs2.default.existsSync(tempFilePath)) import_fs2.default.unlinkSync(tempFilePath);
        }
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
      // Melhoria: Aceita qualquer objeto JSON válido, mas força ser um objeto, não string/número solto
      config: import_zod11.z.record(import_zod11.z.string(), import_zod11.z.any()).default({})
    });
    try {
      const { nome, config } = bodySchema.parse(request.body);
      const count = await prisma.savedFilter.count({ where: { userId } });
      if (count >= 10) {
        return reply.status(400).send({ message: "Voc\xEA atingiu o limite de 10 filtros salvos." });
      }
      const filter = await prisma.savedFilter.create({
        data: {
          nome,
          config,
          // Agora garantido que é um objeto JSON
          userId
        }
      });
      return reply.status(201).send(filter);
    } catch (error) {
      console.error("\u274C ERRO NO POST /filters:", error);
      if (error instanceof import_zod11.z.ZodError) {
        return reply.status(400).send({ message: "Dados inv\xE1lidos.", errors: error.flatten().fieldErrors });
      }
      return reply.status(500).send({ message: "Erro ao salvar filtro." });
    }
  });
  app2.delete("/filters/:id", async (request, reply) => {
    const paramsSchema = import_zod11.z.object({ id: import_zod11.z.string().uuid() });
    const { sub: userId } = request.user;
    try {
      const { id } = paramsSchema.parse(request.params);
      const filter = await prisma.savedFilter.findUnique({ where: { id } });
      if (!filter) return reply.status(404).send({ message: "Filtro n\xE3o encontrado." });
      if (filter.userId !== userId) {
        return reply.status(403).send({ message: "Voc\xEA n\xE3o tem permiss\xE3o para apagar este filtro." });
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
var import_client13 = require("@prisma/client");
async function referralRoutes(app2) {
  app2.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.get("/cases/:caseId/referrals", async (request, reply) => {
    const params = import_zod12.z.object({ caseId: import_zod12.z.string().uuid() });
    try {
      const { caseId } = params.parse(request.params);
      const referrals = await prisma.encaminhamento.findMany({
        where: { casoId: caseId },
        // Correção: Mapeamento explícito
        orderBy: { dataEnvio: "desc" },
        include: {
          autor: { select: { nome: true } }
        }
      });
      return reply.send(referrals);
    } catch (error) {
      console.error("Erro GET Referrals:", error);
      return reply.status(500).send({ message: "Erro ao listar encaminhamentos." });
    }
  });
  app2.post("/cases/:caseId/referrals", async (request, reply) => {
    const params = import_zod12.z.object({ caseId: import_zod12.z.string().uuid() });
    const body = import_zod12.z.object({
      tipo: import_zod12.z.string().min(1, "Selecione o tipo"),
      instituicao: import_zod12.z.string().min(3, "Informe o nome da institui\xE7\xE3o"),
      motivo: import_zod12.z.string().min(3, "Descreva o motivo")
    });
    try {
      const { caseId } = params.parse(request.params);
      const { tipo, instituicao, motivo } = body.parse(request.body);
      const { sub: userId } = request.user;
      const caso = await prisma.case.findUnique({ where: { id: caseId } });
      if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
      const referral = await prisma.encaminhamento.create({
        data: {
          casoId: caseId,
          // Correção: Mapeamento explícito
          autorId: userId,
          tipo,
          instituicao,
          motivo,
          status: "PENDENTE",
          dataEnvio: /* @__PURE__ */ new Date()
        }
      });
      await prisma.caseLog.create({
        data: {
          casoId: caseId,
          // Correção aqui também
          autorId: userId,
          acao: import_client13.LogAction.OUTRO,
          descricao: `Encaminhou para ${instituicao} (${tipo})`
        }
      });
      return reply.status(201).send(referral);
    } catch (error) {
      console.error("Erro POST Referral:", error);
      if (error instanceof import_zod12.z.ZodError) return reply.status(400).send({ message: "Dados inv\xE1lidos", errors: error.flatten().fieldErrors });
      return reply.status(500).send({ message: "Erro ao criar encaminhamento." });
    }
  });
  app2.patch("/referrals/:id", async (request, reply) => {
    const params = import_zod12.z.object({ id: import_zod12.z.string().uuid() });
    const body = import_zod12.z.object({
      status: import_zod12.z.enum(["PENDENTE", "CONCLUIDO", "CANCELADO"]),
      retorno: import_zod12.z.string().optional()
    });
    try {
      const { id } = params.parse(request.params);
      const { status, retorno } = body.parse(request.body);
      const { sub: userId } = request.user;
      const existing = await prisma.encaminhamento.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ message: "Encaminhamento n\xE3o encontrado." });
      const updated = await prisma.encaminhamento.update({
        where: { id },
        data: { status, retorno, updatedAt: /* @__PURE__ */ new Date() }
      });
      if (retorno && retorno !== existing.retorno) {
        await prisma.caseLog.create({
          data: {
            casoId: existing.casoId,
            autorId: userId,
            acao: import_client13.LogAction.OUTRO,
            descricao: `Registrou contrarrefer\xEAncia de ${existing.instituicao}`
          }
        });
      }
      return reply.send(updated);
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao atualizar encaminhamento." });
    }
  });
  app2.delete("/referrals/:id", async (request, reply) => {
    const params = import_zod12.z.object({ id: import_zod12.z.string().uuid() });
    try {
      const { id } = params.parse(request.params);
      const { sub: userId, cargo } = request.user;
      const ref = await prisma.encaminhamento.findUnique({ where: { id } });
      if (!ref) return reply.status(404).send({ message: "Registro n\xE3o encontrado." });
      if (cargo !== import_client13.Cargo.Gerente && ref.autorId !== userId) {
        return reply.status(403).send({ message: "Sem permiss\xE3o para excluir." });
      }
      await prisma.encaminhamento.delete({ where: { id } });
      await prisma.caseLog.create({
        data: {
          casoId: ref.casoId,
          autorId: userId,
          acao: import_client13.LogAction.OUTRO,
          descricao: `Removeu encaminhamento para ${ref.instituicao}`
        }
      });
      return reply.status(204).send();
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao excluir." });
    }
  });
}

// src/routes/family.ts
var import_zod13 = require("zod");
var import_client14 = require("@prisma/client");
var import_date_fns6 = require("date-fns");
var calculateAge = (birthDate) => {
  if (!birthDate || isNaN(birthDate.getTime())) return void 0;
  return (0, import_date_fns6.differenceInYears)(/* @__PURE__ */ new Date(), birthDate);
};
var emptyToNull2 = (val) => {
  if (typeof val === "string" && val.trim() === "") return null;
  return val;
};
async function familyRoutes(app2) {
  app2.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.post("/cases/:caseId/family", async (req, reply) => {
    const paramsSchema = import_zod13.z.object({ caseId: import_zod13.z.string().uuid() });
    const bodySchema = import_zod13.z.object({
      nome: import_zod13.z.string().min(2, "Nome muito curto"),
      parentesco: import_zod13.z.string().min(2, "Informe o parentesco"),
      idade: import_zod13.z.preprocess(emptyToNull2, import_zod13.z.coerce.number().int().nonnegative().optional().nullable()),
      cpf: import_zod13.z.preprocess(emptyToNull2, import_zod13.z.string().optional().nullable()),
      nascimento: import_zod13.z.preprocess(emptyToNull2, import_zod13.z.coerce.date().optional().nullable()),
      telefone: import_zod13.z.preprocess(emptyToNull2, import_zod13.z.string().optional().nullable()),
      ocupacao: import_zod13.z.preprocess(emptyToNull2, import_zod13.z.string().optional().nullable()),
      renda: import_zod13.z.preprocess((val) => val === "" ? 0 : val, import_zod13.z.coerce.number().nonnegative().optional().default(0)),
      observacoes: import_zod13.z.preprocess(emptyToNull2, import_zod13.z.string().optional().nullable())
    });
    try {
      const { caseId } = paramsSchema.parse(req.params);
      const data = bodySchema.parse(req.body);
      const userId = req.user.sub;
      const caso = await prisma.case.findUnique({ where: { id: caseId } });
      if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
      const cpfLimpo = data.cpf ? data.cpf.replace(/\D/g, "") : null;
      const telefoneLimpo = data.telefone ? data.telefone.replace(/\D/g, "") : null;
      let idadeFinal = data.idade;
      if (data.nascimento) {
        const idadeCalculada = calculateAge(data.nascimento);
        if (idadeCalculada !== void 0) idadeFinal = idadeCalculada;
      }
      const idadeParaSalvar = idadeFinal === null ? void 0 : idadeFinal;
      const member = await prisma.membroFamilia.create({
        data: {
          casoId: caseId,
          // CORREÇÃO CONFIRMADA
          nome: data.nome,
          parentesco: data.parentesco,
          idade: idadeParaSalvar,
          nascimento: data.nascimento,
          cpf: cpfLimpo,
          telefone: telefoneLimpo,
          ocupacao: data.ocupacao,
          renda: data.renda,
          observacoes: data.observacoes
        }
      });
      await prisma.caseLog.create({
        data: {
          casoId: caseId,
          autorId: userId,
          acao: import_client14.LogAction.MEMBRO_FAMILIA_ADICIONADO,
          descricao: `Adicionou familiar: ${data.nome} (${data.parentesco})`
        }
      });
      const safeMember = {
        ...member,
        renda: member.renda ? Number(member.renda) : 0
      };
      return reply.status(201).send(safeMember);
    } catch (error) {
      console.error("Erro POST Family:", error);
      if (error instanceof import_zod13.z.ZodError) return reply.status(400).send({ message: "Dados inv\xE1lidos", errors: error.flatten().fieldErrors });
      return reply.status(500).send({ message: "Erro ao adicionar familiar." });
    }
  });
  app2.get("/cases/:caseId/family", async (req, reply) => {
    try {
      const { caseId } = import_zod13.z.object({ caseId: import_zod13.z.string().uuid() }).parse(req.params);
      const members = await prisma.membroFamilia.findMany({
        // CORREÇÃO AQUI: Mapeando explicitamente a variável
        where: { casoId: caseId },
        orderBy: [{ renda: "desc" }, { idade: "desc" }]
      });
      const safeMembers = members.map((m) => ({
        ...m,
        renda: m.renda ? Number(m.renda) : 0
      }));
      return reply.send(safeMembers);
    } catch (error) {
      console.error("Erro GET Family:", error);
      return reply.status(500).send({ message: "Erro ao listar fam\xEDlia." });
    }
  });
  app2.put("/family/:id", async (req, reply) => {
    const paramsSchema = import_zod13.z.object({ id: import_zod13.z.string().uuid() });
    const bodySchema = import_zod13.z.object({
      nome: import_zod13.z.string().min(2),
      parentesco: import_zod13.z.string(),
      nascimento: import_zod13.z.preprocess(emptyToNull2, import_zod13.z.coerce.date().optional().nullable()),
      idade: import_zod13.z.preprocess(emptyToNull2, import_zod13.z.coerce.number().optional().nullable()),
      ocupacao: import_zod13.z.preprocess(emptyToNull2, import_zod13.z.string().optional().nullable()),
      renda: import_zod13.z.preprocess((val) => val === "" ? 0 : val, import_zod13.z.coerce.number().nonnegative().optional()),
      cpf: import_zod13.z.preprocess(emptyToNull2, import_zod13.z.string().optional().nullable()),
      telefone: import_zod13.z.preprocess(emptyToNull2, import_zod13.z.string().optional().nullable()),
      observacoes: import_zod13.z.preprocess(emptyToNull2, import_zod13.z.string().optional().nullable())
    });
    try {
      const { id } = paramsSchema.parse(req.params);
      const data = bodySchema.parse(req.body);
      let idadeFinal = data.idade;
      if (data.nascimento) {
        const calc = calculateAge(data.nascimento);
        if (calc !== void 0) idadeFinal = calc;
      }
      const idadeParaSalvar = idadeFinal === null ? null : idadeFinal;
      const updated = await prisma.membroFamilia.update({
        where: { id },
        data: {
          nome: data.nome,
          parentesco: data.parentesco,
          nascimento: data.nascimento,
          idade: idadeParaSalvar,
          ocupacao: data.ocupacao,
          renda: data.renda,
          observacoes: data.observacoes,
          cpf: data.cpf ? data.cpf.replace(/\D/g, "") : null,
          telefone: data.telefone ? data.telefone.replace(/\D/g, "") : null
        }
      });
      const safeUpdated = {
        ...updated,
        renda: updated.renda ? Number(updated.renda) : 0
      };
      return reply.send(safeUpdated);
    } catch (error) {
      console.error("Erro PUT Family:", error);
      return reply.status(500).send({ message: "Erro ao atualizar membro." });
    }
  });
  app2.delete("/family/:id", async (req, reply) => {
    const { id } = import_zod13.z.object({ id: import_zod13.z.string().uuid() }).parse(req.params);
    const userId = req.user.sub;
    try {
      const member = await prisma.membroFamilia.findUnique({ where: { id } });
      if (!member) return reply.status(404).send({ message: "Membro n\xE3o encontrado." });
      await prisma.membroFamilia.delete({ where: { id } });
      await prisma.caseLog.create({
        data: {
          casoId: member.casoId,
          autorId: userId,
          acao: import_client14.LogAction.OUTRO,
          descricao: `Removeu familiar: ${member.nome}`
        }
      });
      return reply.status(204).send();
    } catch (error) {
      console.error("Erro DELETE Family:", error);
      return reply.status(500).send({ message: "Erro ao remover familiar." });
    }
  });
}

// src/routes/deliverables.ts
var import_zod14 = require("zod");
var import_client15 = require("@prisma/client");
var emptyToNull3 = (val) => {
  if (typeof val === "string" && val.trim() === "") return null;
  return val;
};
async function deliverableRoutes(app2) {
  app2.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.get("/cases/:caseId/deliverables", async (req, reply) => {
    try {
      const { caseId } = import_zod14.z.object({ caseId: import_zod14.z.string().uuid() }).parse(req.params);
      const items = await prisma.serviceDeliverable.findMany({
        where: { casoId: caseId },
        // Aqui funciona pois caseId é o valor
        orderBy: { dataSolicitacao: "desc" },
        include: { responsavel: { select: { nome: true } } }
      });
      return reply.send(items);
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao listar benef\xEDcios." });
    }
  });
  app2.post("/cases/:caseId/deliverables", async (req, reply) => {
    const paramsSchema = import_zod14.z.object({ caseId: import_zod14.z.string().uuid() });
    const bodySchema = import_zod14.z.object({
      tipo: import_zod14.z.string().min(2, "Informe o tipo do benef\xEDcio"),
      status: import_zod14.z.enum(["SOLICITADO", "CONCEDIDO", "NEGADO", "ENTREGUE"]).default("SOLICITADO"),
      observacoes: import_zod14.z.preprocess(emptyToNull3, import_zod14.z.string().optional().nullable())
    });
    try {
      const { caseId } = paramsSchema.parse(req.params);
      const { tipo, status, observacoes } = bodySchema.parse(req.body);
      const { sub: userId } = req.user;
      const caso = await prisma.case.findUnique({ where: { id: caseId } });
      if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
      const dataEntrega = status === "ENTREGUE" ? /* @__PURE__ */ new Date() : null;
      const item = await prisma.serviceDeliverable.create({
        data: {
          tipo,
          status,
          observacoes,
          casoId: caseId,
          // CORREÇÃO: Mapeamento explícito (Banco: Variável)
          responsavelId: userId,
          dataSolicitacao: /* @__PURE__ */ new Date(),
          dataEntrega
        }
      });
      await prisma.caseLog.create({
        data: {
          casoId: caseId,
          // CORREÇÃO AQUI TAMBÉM
          autorId: userId,
          acao: import_client15.LogAction.ENTREGA_BENEFICIO_CRIADA,
          descricao: `Registrou entrega/benef\xEDcio: ${tipo} (${status})`
        }
      });
      return reply.status(201).send(item);
    } catch (error) {
      console.error("Erro POST Deliverables:", error);
      if (error instanceof import_zod14.z.ZodError) return reply.status(400).send({ message: "Dados inv\xE1lidos", errors: error.flatten().fieldErrors });
      return reply.status(500).send({ message: "Erro ao registrar benef\xEDcio." });
    }
  });
  app2.patch("/deliverables/:id", async (req, reply) => {
    const paramsSchema = import_zod14.z.object({ id: import_zod14.z.string().uuid() });
    const bodySchema = import_zod14.z.object({
      status: import_zod14.z.enum(["SOLICITADO", "CONCEDIDO", "NEGADO", "ENTREGUE"]),
      dataEntrega: import_zod14.z.preprocess(emptyToNull3, import_zod14.z.string().optional().nullable()),
      observacoes: import_zod14.z.preprocess(emptyToNull3, import_zod14.z.string().optional().nullable())
    });
    try {
      const { id } = paramsSchema.parse(req.params);
      const { status, dataEntrega, observacoes } = bodySchema.parse(req.body);
      const { sub: userId } = req.user;
      const oldItem = await prisma.serviceDeliverable.findUnique({ where: { id } });
      if (!oldItem) return reply.status(404).send({ message: "Item n\xE3o encontrado." });
      let finalDate = oldItem.dataEntrega;
      if (dataEntrega) {
        finalDate = new Date(dataEntrega);
      } else if (status === "ENTREGUE" && oldItem.status !== "ENTREGUE") {
        finalDate = /* @__PURE__ */ new Date();
      } else if (status !== "ENTREGUE") {
        finalDate = null;
      }
      const updated = await prisma.serviceDeliverable.update({
        where: { id },
        data: {
          status,
          observacoes,
          dataEntrega: finalDate,
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
      if (oldItem.status !== status || oldItem.observacoes !== observacoes) {
        await prisma.caseLog.create({
          data: {
            casoId: oldItem.casoId,
            autorId: userId,
            acao: import_client15.LogAction.ENTREGA_BENEFICIO_ATUALIZADA,
            descricao: `Atualizou benef\xEDcio ${oldItem.tipo}: ${oldItem.status} -> ${status}`
          }
        });
      }
      return reply.send(updated);
    } catch (error) {
      console.error("Erro PATCH Deliverables:", error);
      return reply.status(500).send({ message: "Erro ao atualizar benef\xEDcio." });
    }
  });
  app2.delete("/deliverables/:id", async (req, reply) => {
    const paramsSchema = import_zod14.z.object({ id: import_zod14.z.string().uuid() });
    try {
      const { id } = paramsSchema.parse(req.params);
      const { sub: userId, cargo } = req.user;
      const item = await prisma.serviceDeliverable.findUnique({ where: { id } });
      if (!item) return reply.status(404).send({ message: "Item n\xE3o encontrado." });
      if (item.responsavelId !== userId && cargo !== import_client15.Cargo.Gerente) {
        return reply.status(403).send({ message: "Sem permiss\xE3o para excluir." });
      }
      await prisma.serviceDeliverable.delete({ where: { id } });
      await prisma.caseLog.create({
        data: {
          casoId: item.casoId,
          autorId: userId,
          acao: import_client15.LogAction.OUTRO,
          descricao: `Removeu registro de benef\xEDcio: ${item.tipo}`
        }
      });
      return reply.status(204).send();
    } catch (error) {
      console.error("Erro DELETE Deliverables:", error);
      return reply.status(500).send({ message: "Erro ao excluir item." });
    }
  });
}

// src/routes/groups.ts
var import_zod15 = require("zod");
var import_client16 = require("@prisma/client");
var import_date_fns7 = require("date-fns");
var import_locale3 = require("date-fns/locale");
async function groupRoutes(app2) {
  app2.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.get("/groups", async (req, reply) => {
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
  app2.get("/groups/:id", async (req, reply) => {
    try {
      const { id } = import_zod15.z.object({ id: import_zod15.z.string().uuid() }).parse(req.params);
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
  app2.post("/groups", async (req, reply) => {
    try {
      const bodySchema = import_zod15.z.object({
        tema: import_zod15.z.string().min(3, "Tema \xE9 obrigat\xF3rio"),
        tipo: import_zod15.z.nativeEnum(import_client16.GroupType),
        // Aceita array de strings ou string única (para compatibilidade)
        datas: import_zod15.z.array(import_zod15.z.string()).optional(),
        dataRealizacao: import_zod15.z.string().optional(),
        local: import_zod15.z.string().optional(),
        descricao: import_zod15.z.string().optional(),
        orgaosEnvolvidos: import_zod15.z.array(import_zod15.z.string()).default([])
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
  app2.post("/groups/:id/participants", async (req, reply) => {
    try {
      const { id } = import_zod15.z.object({ id: import_zod15.z.string().uuid() }).parse(req.params);
      const { caseIds } = import_zod15.z.object({ caseIds: import_zod15.z.array(import_zod15.z.string().uuid()) }).parse(req.body);
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
      const dataFormatada = (0, import_date_fns7.format)(group.dataRealizacao, "dd/MM/yyyy", { locale: import_locale3.ptBR });
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
  app2.patch("/groups/:groupId/attendance/:caseId", async (req, reply) => {
    try {
      const paramsSchema = import_zod15.z.object({ groupId: import_zod15.z.string().uuid(), caseId: import_zod15.z.string().uuid() });
      const bodySchema = import_zod15.z.object({ presente: import_zod15.z.boolean(), observacoes: import_zod15.z.string().optional() });
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
      const dataFormatada = (0, import_date_fns7.format)(group.dataRealizacao, "dd/MM/yyyy", { locale: import_locale3.ptBR });
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
            acao: import_client16.LogAction.PRESENCA_REGISTRADA,
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

// src/server.ts
var app = (0, import_fastify.default)({
  logger: {
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname"
      }
    }
  }
});
var uploadDir = import_path3.default.join(__dirname, "../uploads");
if (!import_fs3.default.existsSync(uploadDir)) import_fs3.default.mkdirSync(uploadDir, { recursive: true });
app.register(import_multipart.default, { limits: { fileSize: 10 * 1024 * 1024 } });
app.register(import_cors.default, {
  origin: true,
  // Permite todas as origens (em prod, mude para o domínio do front)
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
});
app.register(import_jwt.default, { secret: process.env.JWT_SECRET || "dev-secret-key" });
app.decorate("authenticate", async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    await reply.send(err);
  }
});
app.register(import_static.default, {
  root: uploadDir,
  prefix: "/uploads/",
  decorateReply: false
});
var distPath = import_path3.default.join(__dirname, "../../frontend/dist");
if (import_fs3.default.existsSync(distPath)) {
  app.register(import_static.default, {
    root: distPath,
    prefix: "/",
    constraints: {}
  });
}
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
app.register(deliverableRoutes);
app.register(groupRoutes);
app.setErrorHandler((error, _, reply) => {
  if (error instanceof import_zod16.ZodError) {
    return reply.status(400).send({
      message: "Erro de valida\xE7\xE3o.",
      errors: error.flatten().fieldErrors
    });
  }
  if (error.code === "FST_JWT_NO_AUTHORIZATION_IN_HEADER") {
    return reply.status(401).send({ message: "Token n\xE3o fornecido." });
  }
  console.error(error);
  return reply.status(500).send({ message: "Erro interno no servidor." });
});
app.setNotFoundHandler((req, reply) => {
  if (req.raw.url && (req.raw.url.startsWith("/api") || req.raw.url.startsWith("/uploads"))) {
    return reply.status(404).send({ message: "Recurso n\xE3o encontrado" });
  }
  if (import_fs3.default.existsSync(import_path3.default.join(distPath, "index.html"))) {
    return reply.sendFile("index.html", distPath);
  }
  return reply.status(404).send({ message: "Rota n\xE3o encontrada" });
});
var port = process.env.PORT ? Number(process.env.PORT) : 3333;
app.listen({ port, host: "0.0.0.0" }).then((address) => {
  console.log(`\u{1F680} Servidor rodando em ${address}`);
});
