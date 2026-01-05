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
var globalForPrisma = global;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient({
  log: ["error"]
  // Reduzi logs para limpar o terminal, use ['query'] para debug
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/auth.ts
var import_bcryptjs = __toESM(require("bcryptjs"));
var import_client2 = require("@prisma/client");
async function authRoutes(app2) {
  app2.post("/register", async (request2, reply) => {
    const registerBodySchema = import_zod.z.object({
      nome: import_zod.z.string().min(3),
      email: import_zod.z.string().email(),
      senha: import_zod.z.string().min(6),
      cargo: import_zod.z.string().transform((val) => {
        if (val === "Agente Social") return import_client2.Cargo.Agente_Social;
        return val;
      }),
      matricula: import_zod.z.string().optional()
    });
    try {
      const { nome, email, senha, cargo, matricula } = registerBodySchema.parse(request2.body);
      const userExists = await prisma.user.findUnique({ where: { email } });
      if (userExists) return reply.status(409).send({ message: "Email j\xE1 registrado." });
      const hashedPassword = await import_bcryptjs.default.hash(senha, 8);
      const user = await prisma.user.create({
        data: { nome, email, senha: hashedPassword, cargo, matricula, ativo: true }
      });
      const { senha: _, ...userSafe } = user;
      return reply.status(201).send(userSafe);
    } catch (error) {
      return reply.status(400).send({ message: "Erro no registro", error });
    }
  });
  app2.post("/login", async (request2, reply) => {
    const loginBodySchema = import_zod.z.object({ email: import_zod.z.string().email(), senha: import_zod.z.string() });
    try {
      const { email, senha } = loginBodySchema.parse(request2.body);
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return reply.status(401).send({ message: "Credenciais inv\xE1lidas." });
      if (!user.ativo) return reply.status(401).send({ message: "Usu\xE1rio desativado." });
      const isPasswordCorrect = await import_bcryptjs.default.compare(senha, user.senha);
      if (!isPasswordCorrect) return reply.status(401).send({ message: "Credenciais inv\xE1lidas." });
      const token = app2.jwt.sign(
        { nome: user.nome, cargo: user.cargo, email: user.email },
        { sub: user.id, expiresIn: "7d" }
      );
      return reply.status(200).send({ token });
    } catch (error) {
      return reply.status(500).send({ message: "Erro interno no login." });
    }
  });
  app2.get("/me", { onRequest: [app2.authenticate] }, async (request2, reply) => {
    const userId = request2.user.sub;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nome: true,
        email: true,
        cargo: true,
        matricula: true,
        ativo: true
        // Selecionamos o campo para checar depois
      }
    });
    if (!user) return reply.status(404).send({ message: "Usu\xE1rio n\xE3o encontrado." });
    if (!user.ativo) return reply.status(401).send({ message: "Usu\xE1rio desativado." });
    return reply.send(user);
  });
}

// src/routes/cases.ts
var import_zod2 = require("zod");
var import_fast_csv = require("fast-csv");
var import_date_fns = require("date-fns");
var import_locale = require("date-fns/locale");
var import_client3 = require("@prisma/client");

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
  request.log.error(message, error);
  return reply.status(500).send({ message });
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
async function createLog(casoId, autorId, acao, descricao, valorAnterior, valorNovo) {
  await prisma.caseLog.create({ data: { casoId, autorId, acao, descricao, valorAnterior, valorNovo } });
}
function buildActiveCaseWhereClause(user) {
  const cargo = user.cargo;
  if (cargo === "Gerente" || cargo === import_client3.Cargo.Gerente) {
    return { status: import_client3.CaseStatus.AGUARDANDO_DISTRIBUICAO_PAEFI };
  }
  if (cargo === "Agente_Social" || cargo === import_client3.Cargo.Agente_Social || cargo === "Agente Social") {
    return {
      agenteAcolhidaId: user.sub,
      status: { in: [import_client3.CaseStatus.AGUARDANDO_ACOLHIDA, import_client3.CaseStatus.EM_ACOLHIDA] }
    };
  }
  if (cargo === "Especialista" || cargo === import_client3.Cargo.Especialista) {
    return {
      especialistaPAEFIId: user.sub,
      status: {
        in: [
          import_client3.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA,
          import_client3.CaseStatus.EM_ACOMPANHAMENTO_PAEFI,
          import_client3.CaseStatus.EM_MONITORAMENTO
        ]
      }
    };
  }
  return {};
}
async function caseRoutes(app2) {
  app2.decorate("authenticate", async (request2, reply) => {
    try {
      await request2.jwtVerify();
    } catch (err) {
      await reply.send(err);
    }
  });
  app2.post("/cases", { onRequest: [app2.authenticate] }, async (request2, reply) => {
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
      origem: import_zod2.z.nativeEnum(import_client3.CaseOrigin).default(import_client3.CaseOrigin.ESPONTANEA),
      agenteAcolhidaId: import_zod2.z.string().uuid(),
      numeroSei: import_zod2.z.string().nullable().optional(),
      linkSei: import_zod2.z.string().url().nullable().optional().or(import_zod2.z.literal("")),
      observacoes: import_zod2.z.string().nullable().optional()
    });
    try {
      const data = schema.parse(request2.body);
      const userId = request2.user.sub;
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
          beneficios: []
        }
      });
      cache.invalidate("manager_stats");
      await createLog(novoCaso.id, userId, import_client3.LogAction.CRIACAO, `Caso criado via ${data.origem}`);
      return reply.status(201).send(novoCaso);
    } catch (error) {
      if (error instanceof import_zod2.z.ZodError) return reply.status(400).send({ message: "Dados inv\xE1lidos.", errors: error.flatten().fieldErrors });
      return internalError(reply, "Erro interno ao criar caso.", error);
    }
  });
  app2.put("/cases/:id", { onRequest: [app2.authenticate] }, async (request2, reply) => {
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
      origem: import_zod2.z.nativeEnum(import_client3.CaseOrigin).optional(),
      agenteAcolhidaId: import_zod2.z.string().uuid(),
      numeroSei: import_zod2.z.string().nullable().optional(),
      linkSei: import_zod2.z.string().url().nullable().optional().or(import_zod2.z.literal("")),
      observacoes: import_zod2.z.string().nullable().optional()
    });
    try {
      const { id } = paramsSchema.parse(request2.params);
      const rawData = bodySchema.parse(request2.body);
      const userId = request2.user.sub;
      const data = { ...rawData, nascimento: stripTime(rawData.nascimento), dataEntrada: stripTime(rawData.dataEntrada) };
      const oldCase = await prisma.case.findUnique({ where: { id }, include: { agenteAcolhida: { select: { nome: true } } } });
      if (!oldCase) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
      const pesoUrgencia = calculateUrgencyWeight(data.urgencia);
      const updatedCaso = await prisma.case.update({
        where: { id },
        data: {
          ...data,
          pesoUrgencia,
          numeroSei: data.numeroSei ?? null,
          linkSei: data.linkSei || null,
          observacoes: data.observacoes ?? null
        }
      });
      cache.invalidate("manager_stats");
      const changes = detectChanges(oldCase, data);
      const keys = Object.keys(changes);
      if (keys.length > 0) await createLog(id, userId, import_client3.LogAction.OUTRO, `Editou ${keys.length} campos.`, JSON.stringify(changes), null);
      return reply.send(updatedCaso);
    } catch (error) {
      if (error instanceof import_zod2.z.ZodError) return reply.status(400).send({ message: "Dados inv\xE1lidos.", errors: error.flatten().fieldErrors });
      return internalError(reply, "Erro ao editar caso.", error);
    }
  });
  app2.get("/cases", { onRequest: [app2.authenticate] }, async (request2, reply) => {
    const schema = import_zod2.z.object({
      search: import_zod2.z.string().optional(),
      page: import_zod2.z.coerce.number().min(1).default(1),
      pageSize: import_zod2.z.coerce.number().min(1).max(100).default(10),
      // [ATUALIZAÇÃO] Aceita status único ou separados por vírgula
      status: import_zod2.z.string().optional(),
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
      const query = schema.parse(request2.query);
      const { search, page, pageSize, view, sortBy, sortOrder, agenteId, specialistId } = query;
      let where = {};
      if (agenteId) {
        where = { agenteAcolhidaId: agenteId, status: { in: [import_client3.CaseStatus.AGUARDANDO_ACOLHIDA, import_client3.CaseStatus.EM_ACOLHIDA] } };
      } else if (specialistId) {
        where = { especialistaPAEFIId: specialistId, status: { in: [import_client3.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, import_client3.CaseStatus.EM_ACOMPANHAMENTO_PAEFI, import_client3.CaseStatus.EM_MONITORAMENTO] } };
      } else if (view === "all") {
        where = { status: { not: import_client3.CaseStatus.DESLIGADO } };
      } else {
        const defaultFilters = buildActiveCaseWhereClause(request2.user);
        where = { ...where, ...defaultFilters };
      }
      if (search) {
        where.AND = [
          ...where.AND || [],
          {
            OR: [
              { nomeCompleto: { contains: search, mode: "insensitive" } },
              { cpf: { contains: search } },
              // [NOVO] Essencial para filtros territoriais (ex: "Veredas")
              { endereco: { contains: search, mode: "insensitive" } }
            ]
          }
        ];
      }
      if (query.status && query.status !== "all") {
        const statusList = query.status.split(",").map((s) => s.trim());
        const validStatuses = statusList.filter((s) => Object.values(import_client3.CaseStatus).includes(s));
        if (validStatuses.length > 0) {
          where.status = { in: validStatuses };
        }
      }
      if (query.urgencia && query.urgencia !== "all") where.urgencia = query.urgencia;
      if (query.violacao && query.violacao !== "all") where.violacao = { equals: query.violacao };
      if (query.categoria && query.categoria !== "all") where.categoria = { equals: query.categoria };
      if (query.sexo && query.sexo !== "all") where.sexo = { equals: query.sexo };
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
          include: {
            agenteAcolhida: { select: { nome: true } },
            especialistaPAEFI: { select: { nome: true } }
          }
        }),
        prisma.case.count({ where })
      ]);
      return reply.send({ data: items, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } });
    } catch (error) {
      return internalError(reply, "Erro interno ao listar casos.", error);
    }
  });
  app2.get("/cases/closed", { onRequest: [app2.authenticate] }, async (request2, reply) => {
    const schema = import_zod2.z.object({
      search: import_zod2.z.string().optional(),
      page: import_zod2.z.coerce.number().min(1).default(1),
      pageSize: import_zod2.z.coerce.number().min(1).max(100).default(10)
    });
    try {
      const { search, page, pageSize } = schema.parse(request2.query);
      const where = { status: import_client3.CaseStatus.DESLIGADO };
      if (search) {
        where.OR = [
          { nomeCompleto: { contains: search, mode: "insensitive" } },
          { cpf: { contains: search } },
          { endereco: { contains: search, mode: "insensitive" } }
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
            destinoDesligamento: true,
            agenteAcolhida: { select: { nome: true } },
            especialistaPAEFI: { select: { nome: true } }
          }
        }),
        prisma.case.count({ where })
      ]);
      return reply.send({ data: items, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } });
    } catch (error) {
      return internalError(reply, "Erro ao listar casos finalizados.", error);
    }
  });
  app2.get("/cases/:id", { onRequest: [app2.authenticate] }, async (request2, reply) => {
    try {
      const { id } = import_zod2.z.object({ id: import_zod2.z.string().uuid() }).parse(request2.params);
      const caso = await prisma.case.findUnique({
        where: { id },
        include: {
          criadoPor: { select: { nome: true } },
          agenteAcolhida: { select: { id: true, nome: true } },
          especialistaPAEFI: { select: { id: true, nome: true } },
          familia: true,
          encaminhamentos: { include: { autor: { select: { nome: true } } }, orderBy: { dataEnvio: "desc" } },
          entregas: { include: { responsavel: { select: { nome: true } } }, orderBy: { dataSolicitacao: "desc" } },
          // Include responsavel
          evolucoes: { include: { autor: { select: { nome: true, cargo: true } } }, orderBy: { createdAt: "desc" } },
          logs: { orderBy: { createdAt: "desc" }, take: 50, include: { autor: { select: { nome: true } } } }
        }
      });
      if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
      return reply.send(caso);
    } catch (error) {
      return internalError(reply, "Erro ao buscar detalhes.", error);
    }
  });
  app2.patch("/cases/:id/status", { onRequest: [app2.authenticate] }, async (request2, reply) => {
    const paramsSchema = import_zod2.z.object({ id: import_zod2.z.string().uuid() });
    const bodySchema = import_zod2.z.object({ status: import_zod2.z.nativeEnum(import_client3.CaseStatus) });
    try {
      const { id } = paramsSchema.parse(request2.params);
      const { status } = bodySchema.parse(request2.body);
      const { sub: userId } = request2.user;
      const caso = await prisma.case.findUnique({ where: { id } });
      if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
      let updateData = { status };
      if (caso.status === import_client3.CaseStatus.DESLIGADO && status !== import_client3.CaseStatus.DESLIGADO) {
        updateData = { status: import_client3.CaseStatus.AGUARDANDO_ACOLHIDA, motivoDesligamento: null, destinoDesligamento: null, dataDesligamento: null, parecerFinal: null };
      }
      const updated = await prisma.case.update({ where: { id }, data: updateData });
      cache.invalidate("manager_stats");
      await createLog(id, userId, import_client3.LogAction.MUDANCA_STATUS, `Alterou status para ${status}`, caso.status, status);
      return reply.send(updated);
    } catch (error) {
      return internalError(reply, "Erro ao alterar status.", error);
    }
  });
  app2.patch("/cases/:id/assign", { onRequest: [app2.authenticate] }, async (request2, reply) => {
    var _a;
    const params = import_zod2.z.object({ id: import_zod2.z.string().uuid() });
    const body = import_zod2.z.object({ specialistId: import_zod2.z.string().uuid() });
    try {
      const { id } = params.parse(request2.params);
      const { specialistId } = body.parse(request2.body);
      const { cargo, sub: userId } = request2.user;
      if (cargo !== "Gerente" && cargo !== import_client3.Cargo.Gerente) return reply.status(403).send({ message: "Acesso negado." });
      const oldCase = await prisma.case.findUnique({ where: { id }, include: { especialistaPAEFI: true } });
      const spec = await prisma.user.findUnique({ where: { id: specialistId } });
      const updated = await prisma.case.update({
        where: { id },
        data: {
          especialistaPAEFIId: specialistId,
          status: import_client3.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA,
          dataInicioPAEFI: /* @__PURE__ */ new Date()
        }
      });
      cache.invalidate("manager_stats");
      const oldName = ((_a = oldCase == null ? void 0 : oldCase.especialistaPAEFI) == null ? void 0 : _a.nome) || "Nenhum";
      await createLog(id, userId, import_client3.LogAction.ATRIBUICAO, `Atribuiu a ${(spec == null ? void 0 : spec.nome) || "Desconhecido"} (Acolhida Esp.)`, oldName, spec == null ? void 0 : spec.nome);
      return reply.send(updated);
    } catch (error) {
      return internalError(reply, "Erro ao atribuir.", error);
    }
  });
  app2.patch("/cases/:id/close", { onRequest: [app2.authenticate] }, async (request2, reply) => {
    const params = import_zod2.z.object({ id: import_zod2.z.string().uuid() });
    const body = import_zod2.z.object({
      parecerFinal: import_zod2.z.string().min(10),
      motivoDesligamento: import_zod2.z.string().min(1),
      destinoDesligamento: import_zod2.z.string().optional()
    });
    try {
      const { id } = params.parse(request2.params);
      const { parecerFinal, motivoDesligamento, destinoDesligamento } = body.parse(request2.body);
      const { sub: userId, cargo } = request2.user;
      const caso = await prisma.case.findUnique({ where: { id } });
      if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
      const isManager = cargo === "Gerente" || cargo === import_client3.Cargo.Gerente;
      if (!isManager && caso.agenteAcolhidaId !== userId && caso.especialistaPAEFIId !== userId) return reply.status(403).send({ message: "Sem permiss\xE3o." });
      const updated = await prisma.case.update({
        where: { id },
        data: {
          status: import_client3.CaseStatus.DESLIGADO,
          parecerFinal,
          motivoDesligamento,
          destinoDesligamento,
          dataDesligamento: /* @__PURE__ */ new Date()
        }
      });
      cache.invalidate("manager_stats");
      await createLog(id, userId, import_client3.LogAction.DESLIGAMENTO, `Desligou: ${motivoDesligamento}. Destino: ${destinoDesligamento || "N\xE3o informado"}`);
      return reply.send(updated);
    } catch (error) {
      return internalError(reply, "Erro ao desligar.", error);
    }
  });
  app2.get("/cases/export", { onRequest: [app2.authenticate] }, async (request2, reply) => {
    const { cargo } = request2.user;
    if (cargo !== "Gerente" && cargo !== import_client3.Cargo.Gerente) return reply.status(403).send({ message: "Acesso negado." });
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
var import_client4 = require("@prisma/client");
var import_bcryptjs2 = __toESM(require("bcryptjs"));
async function userRoutes(app2) {
  app2.addHook("onRequest", async (request2, reply) => {
    try {
      await request2.jwtVerify();
    } catch (err) {
      await reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.post("/users", async (request2, reply) => {
    const { cargo } = request2.user;
    if (cargo !== import_client4.Cargo.Gerente) {
      return reply.status(403).send({ message: "Apenas gerentes podem cadastrar novos servidores." });
    }
    const schema = import_zod3.z.object({
      nome: import_zod3.z.string().min(3),
      email: import_zod3.z.string().email(),
      matricula: import_zod3.z.string().optional(),
      cargo: import_zod3.z.nativeEnum(import_client4.Cargo),
      // 'Gerente', 'Agente_Social', 'Especialista'
      senhaInicial: import_zod3.z.string().min(6).default("123456")
    });
    try {
      const data = schema.parse(request2.body);
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
  app2.patch("/users/me/password", async (request2, reply) => {
    const schema = import_zod3.z.object({
      senhaAtual: import_zod3.z.string(),
      novaSenha: import_zod3.z.string().min(6)
    });
    try {
      const { senhaAtual, novaSenha } = schema.parse(request2.body);
      const userId = request2.user.sub;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return reply.status(404).send({ message: "Usu\xE1rio n\xE3o encontrado." });
      const isPasswordValid = await import_bcryptjs2.default.compare(senhaAtual, user.senha);
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
  app2.get("/users", async (request2, reply) => {
    const { sub: userId, cargo } = request2.user;
    if (cargo !== import_client4.Cargo.Gerente) {
      return reply.status(403).send({ message: "Acesso negado." });
    }
    try {
      const users = await prisma.user.findMany({
        where: {
          id: { not: userId },
          ativo: true
        },
        orderBy: { nome: "asc" },
        select: {
          id: true,
          nome: true,
          email: true,
          cargo: true,
          matricula: true,
          // Adicionado matricula
          ativo: true
        }
      });
      return reply.status(200).send(users);
    } catch (error) {
      console.error("Erro ao listar usu\xE1rios:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
  app2.get("/users/agents", async (request2, reply) => {
    try {
      const agents = await prisma.user.findMany({
        where: {
          cargo: import_client4.Cargo.Agente_Social,
          ativo: true
        },
        orderBy: { nome: "asc" },
        select: { id: true, nome: true }
      });
      return reply.status(200).send(agents);
    } catch (error) {
      console.error("Erro ao listar Agentes:", error);
      return reply.status(500).send({ message: "Erro interno." });
    }
  });
  app2.get("/users/specialists", async (request2, reply) => {
    try {
      const specialists = await prisma.user.findMany({
        where: {
          cargo: import_client4.Cargo.Especialista,
          ativo: true
        },
        orderBy: { nome: "asc" },
        select: { id: true, nome: true }
      });
      return reply.status(200).send(specialists);
    } catch (error) {
      console.error("Erro ao listar Especialistas:", error);
      return reply.status(500).send({ message: "Erro interno." });
    }
  });
  app2.put("/users/:id", async (request2, reply) => {
    const { cargo } = request2.user;
    if (cargo !== import_client4.Cargo.Gerente) {
      return reply.status(403).send({ message: "Acesso negado." });
    }
    const paramsSchema = import_zod3.z.object({ id: import_zod3.z.string().uuid() });
    const bodySchema = import_zod3.z.object({
      nome: import_zod3.z.string().min(3),
      email: import_zod3.z.string().email(),
      cargo: import_zod3.z.nativeEnum(import_client4.Cargo),
      matricula: import_zod3.z.string().optional()
      // Adicionado suporte a matricula
    });
    try {
      const { id } = paramsSchema.parse(request2.params);
      const rawData = request2.body;
      let cargoValue = rawData.cargo;
      if (cargoValue === "Agente Social") cargoValue = import_client4.Cargo.Agente_Social;
      if (cargoValue === "Especialista") cargoValue = import_client4.Cargo.Especialista;
      if (cargoValue === "Gerente") cargoValue = import_client4.Cargo.Gerente;
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
  app2.delete("/users/:id", async (request2, reply) => {
    const { cargo } = request2.user;
    if (cargo !== import_client4.Cargo.Gerente) {
      return reply.status(403).send({ message: "Acesso negado." });
    }
    const paramsSchema = import_zod3.z.object({ id: import_zod3.z.string().uuid() });
    try {
      const { id } = paramsSchema.parse(request2.params);
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
var import_client5 = require("@prisma/client");
async function evolutionRoutes(app2) {
  app2.addHook("onRequest", async (request2, reply) => {
    try {
      await request2.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.get("/cases/:caseId/evolutions", async (request2, reply) => {
    const paramsSchema = import_zod4.z.object({
      caseId: import_zod4.z.string().uuid()
    });
    const querySchema = import_zod4.z.object({
      page: import_zod4.z.coerce.number().min(1).default(1),
      pageSize: import_zod4.z.coerce.number().min(1).max(50).default(10)
    });
    const { caseId } = paramsSchema.parse(request2.params);
    const { page, pageSize } = querySchema.parse(request2.query);
    const { sub: userId, cargo } = request2.user;
    const caso = await prisma.case.findUnique({
      where: { id: caseId },
      select: {
        agenteAcolhidaId: true,
        especialistaPAEFIId: true,
        status: true
      }
    });
    if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
    const isGerente = cargo === import_client5.Cargo.Gerente;
    const isResponsavelAtual = caso.agenteAcolhidaId === userId || caso.especialistaPAEFIId === userId;
    const canViewSigilo = isGerente || isResponsavelAtual;
    const whereCondition = {
      casoId: caseId
    };
    if (!canViewSigilo) {
      whereCondition.OR = [
        { sigilo: false },
        { autorId: userId }
      ];
    }
    const [evolucoes, total] = await Promise.all([
      prisma.evolucao.findMany({
        where: whereCondition,
        orderBy: { createdAt: "desc" },
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
  });
  app2.post("/cases/:caseId/evolutions", async (request2, reply) => {
    const { caseId } = import_zod4.z.object({ caseId: import_zod4.z.string().uuid() }).parse(request2.params);
    const bodySchema = import_zod4.z.object({
      conteudo: import_zod4.z.string().min(5, "A evolu\xE7\xE3o deve ter conte\xFAdo relevante."),
      sigilo: import_zod4.z.boolean().optional().default(false)
    });
    const { conteudo, sigilo } = bodySchema.parse(request2.body);
    const { sub: userId } = request2.user;
    const evolucao = await prisma.evolucao.create({
      data: {
        conteudo,
        sigilo,
        casoId: caseId,
        autorId: userId
      },
      include: { autor: { select: { id: true, nome: true, cargo: true } } }
    });
    await prisma.caseLog.create({
      data: {
        casoId: caseId,
        autorId: userId,
        acao: import_client5.LogAction.EVOLUCAO_CRIADA,
        descricao: sigilo ? "Registrou uma evolu\xE7\xE3o t\xE9cnica (SIGILOSA)." : "Registrou uma evolu\xE7\xE3o t\xE9cnica p\xFAblica."
      }
    });
    return reply.status(201).send(evolucao);
  });
  app2.patch("/evolutions/:id", async (request2, reply) => {
    const paramsSchema = import_zod4.z.object({ id: import_zod4.z.string().uuid() });
    const bodySchema = import_zod4.z.object({
      conteudo: import_zod4.z.string().min(5, "Conte\xFAdo muito curto.").optional(),
      sigilo: import_zod4.z.boolean().optional()
    });
    const { id } = paramsSchema.parse(request2.params);
    const { conteudo, sigilo } = bodySchema.parse(request2.body);
    const { sub: userId } = request2.user;
    const existingEvolucao = await prisma.evolucao.findUnique({
      where: { id }
    });
    if (!existingEvolucao) return reply.status(404).send({ message: "Evolu\xE7\xE3o n\xE3o encontrada." });
    if (existingEvolucao.autorId !== userId) {
      return reply.status(403).send({ message: "Voc\xEA s\xF3 pode editar evolu\xE7\xF5es criadas por voc\xEA." });
    }
    const updated = await prisma.evolucao.update({
      where: { id },
      data: {
        conteudo,
        sigilo
      },
      include: { autor: { select: { id: true, nome: true, cargo: true } } }
    });
    return reply.send(updated);
  });
  app2.delete("/evolutions/:id", async (request2, reply) => {
    const { id } = import_zod4.z.object({ id: import_zod4.z.string().uuid() }).parse(request2.params);
    const { sub: userId } = request2.user;
    const existingEvolucao = await prisma.evolucao.findUnique({ where: { id } });
    if (!existingEvolucao) return reply.status(404).send({ message: "Evolu\xE7\xE3o n\xE3o encontrada." });
    if (existingEvolucao.autorId !== userId) {
      return reply.status(403).send({ message: "Voc\xEA s\xF3 pode excluir evolu\xE7\xF5es criadas por voc\xEA." });
    }
    await prisma.evolucao.delete({ where: { id } });
    return reply.status(204).send();
  });
}

// src/routes/paf.ts
var import_zod5 = require("zod");
var import_client6 = require("@prisma/client");
var stripTime2 = (date) => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};
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
    deadline: import_zod5.z.coerce.date({ required_error: "O prazo \xE9 obrigat\xF3rio." })
  });
  const paramsSchema = import_zod5.z.object({
    caseId: import_zod5.z.string().uuid()
  });
  app2.get("/cases/:caseId/paf", async (request2, reply) => {
    try {
      const { caseId } = paramsSchema.parse(request2.params);
      const paf = await prisma.paf.findUnique({
        where: { casoId: caseId },
        // Mapeamento correto
        include: { autor: { select: { id: true, nome: true } } }
      });
      return reply.send(paf);
    } catch (error) {
      console.error("\u274C Erro GET /paf:", error);
      return reply.status(500).send({ message: "Erro ao buscar PAF." });
    }
  });
  app2.get("/cases/:caseId/paf/history", async (request2, reply) => {
    try {
      const { caseId } = paramsSchema.parse(request2.params);
      const paf = await prisma.paf.findUnique({ where: { casoId: caseId } });
      if (!paf) return reply.send([]);
      const history = await prisma.pafVersion.findMany({
        where: { pafId: paf.id },
        orderBy: { savedAt: "desc" },
        include: { autor: { select: { nome: true } } }
      });
      return reply.send(history);
    } catch (error) {
      console.error("\u274C Erro GET /paf/history:", error);
      return reply.status(500).send({ message: "Erro ao buscar hist\xF3rico." });
    }
  });
  app2.post("/cases/:caseId/paf", async (request2, reply) => {
    try {
      const { caseId } = paramsSchema.parse(request2.params);
      const data = pafBodySchema.parse(request2.body);
      const { sub: autorId, cargo } = request2.user;
      if (cargo !== "Especialista" && cargo !== "Gerente") {
        return reply.status(403).send({ message: "Apenas especialistas/gerentes criam PAF." });
      }
      const created = await prisma.paf.create({
        data: {
          ...data,
          deadline: stripTime2(data.deadline),
          casoId: caseId,
          // Campo do banco: Variável
          autorId,
          versaoAtual: 1
        }
      });
      await prisma.caseLog.create({
        data: {
          casoId: caseId,
          autorId,
          acao: import_client6.LogAction.PAF_CRIADO,
          descricao: "Elaborou o Plano de Acompanhamento Familiar (PAF)."
        }
      });
      return reply.status(201).send(created);
    } catch (error) {
      console.error("\u274C Erro POST /paf:", error);
      if (error instanceof import_zod5.z.ZodError) {
        return reply.status(400).send({ message: "Dados inv\xE1lidos.", errors: error.flatten().fieldErrors });
      }
      return reply.status(500).send({ message: "Erro interno ao criar PAF." });
    }
  });
  app2.put("/cases/:caseId/paf", async (request2, reply) => {
    try {
      const { caseId } = paramsSchema.parse(request2.params);
      const bodyData = pafBodySchema.partial().parse(request2.body);
      const { sub: userId, cargo } = request2.user;
      const existing = await prisma.paf.findUnique({ where: { casoId: caseId } });
      if (!existing) return reply.status(404).send({ message: "PAF n\xE3o encontrado." });
      if (existing.autorId !== userId && cargo !== "Gerente") {
        return reply.status(403).send({ message: "Sem permiss\xE3o para editar este PAF." });
      }
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
      const nextVersion = existing.versaoAtual + 1;
      const updated = await prisma.paf.update({
        where: { casoId: caseId },
        // CORREÇÃO AQUI TAMBÉM
        data: {
          ...bodyData,
          deadline: bodyData.deadline ? stripTime2(bodyData.deadline) : void 0,
          autorId: userId,
          versaoAtual: nextVersion,
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
      await prisma.caseLog.create({
        data: {
          casoId: caseId,
          // CORREÇÃO
          autorId: userId,
          acao: import_client6.LogAction.PAF_ATUALIZADO,
          descricao: `Atualizou PAF para vers\xE3o ${nextVersion}.`
        }
      });
      return reply.send(updated);
    } catch (error) {
      console.error("\u274C Erro PUT /paf:", error);
      if (error instanceof import_zod5.z.ZodError) {
        return reply.status(400).send({ message: "Dados inv\xE1lidos.", errors: error.flatten().fieldErrors });
      }
      if (error.code === "P2021") {
        return reply.status(500).send({ message: "Erro de banco: Tabela PafVersion n\xE3o encontrada. Rode 'npx prisma migrate dev'." });
      }
      return reply.status(500).send({ message: "Erro interno ao atualizar PAF." });
    }
  });
}

// src/routes/stats.ts
var import_date_fns2 = require("date-fns");
var import_locale2 = require("date-fns/locale");
var import_client7 = require("@prisma/client");
var import_zod6 = require("zod");
var calculateUrgencyWeight2 = (urgencia) => {
  const term = urgencia ? urgencia.trim() : "";
  if (["Convive com agressor", "Idoso 80+", "Primeira inf\xE2ncia", "Risco de morte"].includes(term)) return 4;
  if (["Risco de reincid\xEAncia", "Sofre amea\xE7a", "Risco de desabrigo", "Crian\xE7a/Adolescente"].includes(term)) return 3;
  if (["PCD", "Idoso", "Interna\xE7\xE3o", "Acolhimento", "Gestante/Lactante"].includes(term)) return 2;
  return 1;
};
async function statsRoutes(app2) {
  app2.addHook("onRequest", async (request2, reply) => {
    try {
      await request2.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.get("/stats", async (request2, reply) => {
    const { cargo, sub: userId } = request2.user;
    if (cargo === import_client7.Cargo.Gerente) {
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
          prisma.case.count(),
          prisma.case.count({ where: { status: { in: [import_client7.CaseStatus.AGUARDANDO_ACOLHIDA, import_client7.CaseStatus.EM_ACOLHIDA] } } }),
          prisma.case.count({ where: { status: { in: [import_client7.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, import_client7.CaseStatus.EM_ACOMPANHAMENTO_PAEFI] } } }),
          prisma.case.count({ where: { status: import_client7.CaseStatus.EM_MONITORAMENTO } }),
          prisma.case.count({ where: { dataEntrada: { gte: firstDayOfMonth2, lte: lastDayOfMonth2 } } }),
          prisma.case.count({ where: { status: import_client7.CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth2, lte: lastDayOfMonth2 } } }),
          prisma.case.groupBy({
            by: ["agenteAcolhidaId"],
            where: { status: { in: [import_client7.CaseStatus.AGUARDANDO_ACOLHIDA, import_client7.CaseStatus.EM_ACOLHIDA] }, agenteAcolhidaId: { not: null } },
            _count: { _all: true }
          }),
          prisma.case.groupBy({
            by: ["especialistaPAEFIId"],
            where: { status: { in: [import_client7.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, import_client7.CaseStatus.EM_ACOMPANHAMENTO_PAEFI] }, especialistaPAEFIId: { not: null } },
            _count: { _all: true }
          }),
          prisma.case.groupBy({ by: ["urgencia"], _count: { _all: true }, where: { status: { not: import_client7.CaseStatus.DESLIGADO } } }),
          prisma.case.groupBy({ by: ["categoria"], _count: { _all: true }, where: { status: { not: import_client7.CaseStatus.DESLIGADO } } })
        ]);
        const userIds = [
          .../* @__PURE__ */ new Set([
            ...workloadAgent.map((w) => w.agenteAcolhidaId),
            ...workloadSpec.map((w) => w.especialistaPAEFIId)
          ])
        ].filter((id) => id !== null);
        const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, nome: true } });
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
          casesByUrgency: urgencyGroups.map((g) => ({ name: g.urgencia, value: g._count._all })),
          casesByCategory: categoryGroups.map((g) => ({ name: g.categoria, value: g._count._all })),
          productivity: [],
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
      if (cargo === import_client7.Cargo.Agente_Social) {
        const [myActive, myClosed, myNew] = await Promise.all([
          prisma.case.count({ where: { agenteAcolhidaId: userId, status: { in: [import_client7.CaseStatus.AGUARDANDO_ACOLHIDA, import_client7.CaseStatus.EM_ACOLHIDA] } } }),
          prisma.case.count({ where: { agenteAcolhidaId: userId, status: import_client7.CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
          prisma.case.count({ where: { agenteAcolhidaId: userId, dataEntrada: { gte: firstDayOfMonth, lte: lastDayOfMonth } } })
        ]);
        return reply.send({ role: "Agente_Social", myActiveCases: myActive, myClosedMonth: myClosed, myNewCasesMonth: myNew });
      }
      if (cargo === import_client7.Cargo.Especialista) {
        const [myActive, myClosed, myNew] = await Promise.all([
          prisma.case.count({ where: { especialistaPAEFIId: userId, status: { in: [import_client7.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, import_client7.CaseStatus.EM_ACOMPANHAMENTO_PAEFI, import_client7.CaseStatus.EM_MONITORAMENTO] } } }),
          prisma.case.count({ where: { especialistaPAEFIId: userId, status: import_client7.CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
          prisma.case.count({ where: { especialistaPAEFIId: userId, dataInicioPAEFI: { gte: firstDayOfMonth, lte: lastDayOfMonth } } })
        ]);
        return reply.send({ role: "Especialista", myActiveCases: myActive, myClosedMonth: myClosed, myNewCasesMonth: myNew });
      }
      return reply.status(200).send({ message: "Sem dados." });
    } catch (error) {
      return reply.status(500).send({ message: "Erro interno." });
    }
  });
  app2.get("/stats/productivity", async (request2, reply) => {
    const querySchema = import_zod6.z.object({
      mode: import_zod6.z.enum(["workload", "performance"]).default("workload"),
      months: import_zod6.z.coerce.number().default(1)
    });
    const { mode, months } = querySchema.parse(request2.query);
    try {
      const users = await prisma.user.findMany({
        where: { ativo: true, cargo: { not: import_client7.Cargo.Gerente } },
        select: { id: true, nome: true, cargo: true }
      });
      if (mode === "performance") {
        const startDate = (0, import_date_fns2.subMonths)(/* @__PURE__ */ new Date(), months);
        const safeActions = [
          import_client7.LogAction.CRIACAO,
          import_client7.LogAction.MUDANCA_STATUS,
          import_client7.LogAction.DESLIGAMENTO,
          import_client7.LogAction.EVOLUCAO,
          import_client7.LogAction.OUTRO,
          // @ts-ignore - Ignora erro de TS se ATRIBUICAO não existir no types ainda
          import_client7.LogAction.ATRIBUICAO
        ].filter(Boolean);
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
          status: { in: [import_client7.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, import_client7.CaseStatus.EM_ACOMPANHAMENTO_PAEFI, import_client7.CaseStatus.EM_MONITORAMENTO] }
        },
        _count: { _all: true }
      });
      const agentStats = await prisma.case.groupBy({
        by: ["agenteAcolhidaId", "status"],
        where: {
          agenteAcolhidaId: { in: users.map((u) => u.id) },
          status: { in: [import_client7.CaseStatus.AGUARDANDO_ACOLHIDA, import_client7.CaseStatus.EM_ACOLHIDA] }
        },
        _count: { _all: true }
      });
      const data = users.map((u) => {
        let active = 0;
        let monitoring = 0;
        if (u.cargo === import_client7.Cargo.Especialista) {
          const stats = specialistStats.filter((s) => s.especialistaPAEFIId === u.id);
          active = stats.filter((s) => s.status !== import_client7.CaseStatus.EM_MONITORAMENTO).reduce((acc, curr) => acc + curr._count._all, 0);
          monitoring = stats.filter((s) => s.status === import_client7.CaseStatus.EM_MONITORAMENTO).reduce((acc, curr) => acc + curr._count._all, 0);
        } else if (u.cargo === import_client7.Cargo.Agente_Social) {
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
        };
      }).sort((a, b) => b.totalLoad - a.totalLoad);
      return reply.send(data);
    } catch (error) {
      console.error("Erro em /stats/productivity:", error);
      return reply.status(500).send([]);
    }
  });
  app2.get("/stats/vigilancia", async (request2, reply) => {
    const { cargo } = request2.user;
    if (!["Gerente", "Especialista"].includes(cargo)) return reply.status(403).send({ message: "Acesso restrito." });
    try {
      const today = /* @__PURE__ */ new Date();
      const sixMonthsAgo = (0, import_date_fns2.subMonths)(today, 6);
      const allCases = await prisma.case.findMany({
        where: { OR: [{ dataEntrada: { gte: sixMonthsAgo } }, { dataDesligamento: { gte: sixMonthsAgo } }] },
        select: { dataEntrada: true, dataDesligamento: true, dataInicioPAEFI: true, status: true, id: true, urgencia: true }
      });
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
      const violations = await prisma.case.groupBy({
        by: ["violacao"],
        _count: { _all: true },
        where: { status: { not: import_client7.CaseStatus.DESLIGADO } }
      });
      const violationData = violations.map((v) => ({ name: v.violacao, value: v._count._all })).sort((a, b) => b.value - a.value);
      const urgencies = await prisma.case.groupBy({
        by: ["urgencia"],
        _count: { _all: true },
        where: { status: { not: import_client7.CaseStatus.DESLIGADO } }
      });
      const urgencyData = urgencies.map((u) => ({
        name: u.urgencia,
        value: u._count._all,
        weight: calculateUrgencyWeight2(u.urgencia)
      })).sort((a, b) => b.weight - a.weight);
      const origins = await prisma.case.groupBy({
        by: ["orgaoDemandante"],
        _count: { _all: true },
        where: { status: { not: import_client7.CaseStatus.DESLIGADO } },
        orderBy: { _count: { orgaoDemandante: "desc" } },
        take: 10
      });
      const originData = origins.map((o) => ({ name: o.orgaoDemandante, value: o._count._all }));
      const referrals = await prisma.encaminhamento.groupBy({
        by: ["instituicao"],
        _count: { _all: true },
        orderBy: { _count: { instituicao: "desc" } },
        take: 10
      });
      const networkData = referrals.map((r) => ({ name: r.instituicao, value: r._count._all }));
      const benefits = await prisma.serviceDeliverable.groupBy({
        by: ["tipo"],
        _count: { _all: true },
        orderBy: { _count: { tipo: "desc" } }
      });
      const benefitsData = benefits.map((b) => ({ name: b.tipo, value: b._count._all }));
      const groupCount = await prisma.groupActivity.count({ where: { dataRealizacao: { gte: sixMonthsAgo } } });
      const participantsCount = await prisma.groupAttendance.count({ where: { presente: true, grupo: { dataRealizacao: { gte: sixMonthsAgo } } } });
      const collectiveData = { totalGroups: groupCount, totalParticipants: participantsCount, avgAttendance: groupCount > 0 ? Math.round(participantsCount / groupCount) : 0 };
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
      const demographicsRaw = await prisma.case.findMany({
        where: { status: { not: import_client7.CaseStatus.DESLIGADO } },
        select: { nascimento: true, sexo: true, id: true, urgencia: true, violacao: true, categoria: true }
      });
      const demographics = {
        sexo: { Masculino: 0, Feminino: 0, Outro: 0 },
        etaria: { "0-11 (Crian\xE7a)": 0, "12-17 (Adolescente)": 0, "18-59 (Adulto)": 0, "60+ (Idoso)": 0 }
      };
      demographicsRaw.forEach((c) => {
        if (c.sexo === "Masculino") demographics.sexo.Masculino++;
        else if (c.sexo === "Feminino") demographics.sexo.Feminino++;
        else demographics.sexo.Outro++;
        const age = (/* @__PURE__ */ new Date()).getFullYear() - c.nascimento.getFullYear();
        if (age < 12) demographics.etaria["0-11 (Crian\xE7a)"]++;
        else if (age < 18) demographics.etaria["12-17 (Adolescente)"]++;
        else if (age < 60) demographics.etaria["18-59 (Adulto)"]++;
        else demographics.etaria["60+ (Idoso)"]++;
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
  app2.get("/stats/advanced", async (request2, reply) => {
    const { cargo } = request2.user;
    const querySchema = import_zod6.z.object({ months: import_zod6.z.coerce.number().default(12), violacao: import_zod6.z.string().optional() });
    const { months, violacao } = querySchema.parse(request2.query);
    if (cargo !== import_client7.Cargo.Gerente) return reply.status(403).send({ message: "Acesso restrito." });
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
      const activeTotal = await prisma.case.count({ where: { status: { not: import_client7.CaseStatus.DESLIGADO } } });
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
  app2.get("/stats/heatmap", async (request2, reply) => {
    const querySchema = import_zod6.z.object({ months: import_zod6.z.coerce.number().default(12) });
    const { months } = querySchema.parse(request2.query);
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
  app2.get("/stats/my-agenda", async (request2, reply) => {
    const { sub: userId } = request2.user;
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
  app2.get("/stats/activity", async (request2, reply) => {
    const { sub: userId, cargo } = request2.user;
    try {
      const whereScope = cargo === "Gerente" ? {} : {
        caso: {
          OR: [
            { agenteAcolhidaId: userId },
            { especialistaPAEFIId: userId }
          ]
        }
      };
      const logs = await prisma.caseLog.findMany({
        where: whereScope,
        take: 10,
        // Últimas 10 ações
        orderBy: { createdAt: "desc" },
        include: {
          autor: { select: { nome: true, cargo: true } },
          caso: { select: { id: true, nomeCompleto: true } }
        }
      });
      return reply.send(logs);
    } catch (error) {
      return reply.status(500).send([]);
    }
  });
}

// src/routes/appointments.ts
var import_zod7 = require("zod");
var import_client8 = require("@prisma/client");
async function appointmentRoutes(app2) {
  app2.addHook("onRequest", async (request2, reply) => {
    try {
      await request2.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.get("/appointments", async (request2, reply) => {
    const querySchema = import_zod7.z.object({
      caseId: import_zod7.z.string().uuid().optional(),
      start: import_zod7.z.coerce.date().optional(),
      end: import_zod7.z.coerce.date().optional()
    });
    const { caseId, start: reqStart, end: reqEnd } = querySchema.parse(request2.query);
    const { sub: userId, cargo } = request2.user;
    let start = reqStart;
    let end = reqEnd;
    if (!start || !end) {
      const now = /* @__PURE__ */ new Date();
      if (caseId) {
        if (!start) start = new Date(now.getFullYear() - 5, 0, 1);
        if (!end) end = new Date(now.getFullYear() + 2, 11, 31);
      } else {
        if (!start) start = new Date(now.getFullYear(), now.getMonth(), 1);
        if (!end) end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }
    }
    const queryStart = start;
    const queryEnd = end;
    const whereClause = {
      data: { gte: queryStart, lte: queryEnd }
    };
    if (caseId) {
      whereClause.casoId = caseId;
    } else {
      if (cargo !== "Gerente" && cargo !== import_client8.Cargo.Gerente) {
        whereClause.OR = [
          { responsavelId: userId },
          // Criado por mim
          // OU sou o técnico do caso vinculado ao agendamento
          { caso: { OR: [{ agenteAcolhidaId: userId }, { especialistaPAEFIId: userId }] } }
        ];
      }
    }
    const individualPromise = prisma.agendamento.findMany({
      where: whereClause,
      include: { caso: { select: { nomeCompleto: true } } }
    });
    const groupPromise = caseId ? prisma.groupActivity.findMany({
      where: {
        dataRealizacao: { gte: queryStart, lte: queryEnd },
        participantes: { some: { casoId: caseId } }
      },
      include: { facilitador: { select: { nome: true } } }
    }) : prisma.groupActivity.findMany({
      where: {
        dataRealizacao: { gte: queryStart, lte: queryEnd }
      },
      include: { facilitador: { select: { nome: true } } }
    });
    try {
      const [appointments, groups] = await Promise.all([individualPromise, groupPromise]);
      const normalizedEvents = [
        ...appointments.map((a) => ({
          id: a.id,
          title: a.caso ? `${a.titulo} - ${a.caso.nomeCompleto}` : a.titulo,
          start: a.data,
          type: "INDIVIDUAL",
          resourceId: a.casoId,
          description: a.observacoes || "",
          status: "SCHEDULED"
        })),
        ...groups.map((g) => ({
          id: g.id,
          title: `[GRUPO] ${g.tema} (${g.tipo.replace("_", " ")})`,
          start: g.dataRealizacao,
          type: "GRUPO",
          resourceId: g.id,
          description: g.descricao || `Facilitador: ${g.facilitador.nome}`,
          status: "SCHEDULED"
        }))
      ];
      return reply.send(normalizedEvents.sort((a, b) => a.start.getTime() - b.start.getTime()));
    } catch (error) {
      console.error("ERRO GET /appointments:", error);
      return reply.status(500).send({ message: "Erro ao buscar agenda." });
    }
  });
  app2.post("/appointments", async (request2, reply) => {
    const bodySchema = import_zod7.z.object({
      titulo: import_zod7.z.string().min(3),
      data: import_zod7.z.coerce.date(),
      observacoes: import_zod7.z.string().nullable().optional(),
      casoId: import_zod7.z.string().uuid(),
      tipo: import_zod7.z.string().optional()
      // Adicionado tipo
    });
    const { titulo, data, observacoes, casoId, tipo } = bodySchema.parse(request2.body);
    const userId = request2.user.sub;
    try {
      const agendamento = await prisma.agendamento.create({
        data: {
          titulo,
          data,
          observacoes: observacoes || null,
          casoId,
          responsavelId: userId
          // Se tiver campo 'tipo' no banco, adicione aqui. Se não, remova.
          // tipo: tipo 
        }
      });
      try {
        await prisma.caseLog.create({
          data: {
            casoId,
            autorId: userId,
            acao: import_client8.LogAction.AGENDAMENTO_CRIADO,
            descricao: `Agendamento criado: ${titulo} para ${data.toLocaleString()}`
          }
        });
      } catch (logError) {
        console.warn("\u26A0\uFE0F Log falhou, mas agendamento ok.", logError);
      }
      return reply.status(201).send(agendamento);
    } catch (mainError) {
      console.error("\u274C ERRO POST /appointments:", mainError);
      return reply.status(500).send({ message: "Erro ao criar agendamento." });
    }
  });
  app2.put("/appointments/:id", async (request2, reply) => {
    const paramsSchema = import_zod7.z.object({ id: import_zod7.z.string().uuid() });
    const bodySchema = import_zod7.z.object({
      titulo: import_zod7.z.string().min(3).optional(),
      data: import_zod7.z.coerce.date().optional(),
      observacoes: import_zod7.z.string().nullable().optional()
    });
    const { id } = paramsSchema.parse(request2.params);
    const data = bodySchema.parse(request2.body);
    const userId = request2.user.sub;
    const { cargo } = request2.user;
    const existing = await prisma.agendamento.findUnique({ where: { id } });
    if (!existing || existing.responsavelId !== userId && cargo !== "Gerente") {
      return reply.status(403).send({ message: "Sem permiss\xE3o." });
    }
    const updated = await prisma.agendamento.update({
      where: { id },
      data: {
        ...data,
        ...data.observacoes !== void 0 ? { observacoes: data.observacoes } : {}
      }
    });
    return reply.send(updated);
  });
  app2.delete("/appointments/:id", async (request2, reply) => {
    const paramsSchema = import_zod7.z.object({ id: import_zod7.z.string().uuid() });
    const { id } = paramsSchema.parse(request2.params);
    const userId = request2.user.sub;
    const { cargo } = request2.user;
    const existing = await prisma.agendamento.findUnique({ where: { id } });
    if (!existing || existing.responsavelId !== userId && cargo !== "Gerente") {
      return reply.status(403).send({ message: "Sem permiss\xE3o." });
    }
    await prisma.agendamento.delete({ where: { id } });
    if (existing.casoId) {
      try {
        await prisma.caseLog.create({
          data: {
            casoId: existing.casoId,
            autorId: userId,
            acao: import_client8.LogAction.OUTRO,
            descricao: `Agendamento exclu\xEDdo: ${existing.titulo}`
          }
        });
      } catch (e) {
      }
    }
    return reply.status(204).send();
  });
}

// src/routes/reports.ts
var import_zod8 = require("zod");
var import_date_fns3 = require("date-fns");
var import_client9 = require("@prisma/client");
async function reportRoutes(app2) {
  app2.addHook("onRequest", async (request2, reply) => {
    try {
      await request2.jwtVerify();
      const { cargo } = request2.user;
      if (cargo !== import_client9.Cargo.Gerente) {
        return reply.status(403).send({ message: "Acesso negado. Apenas Ger\xEAncia." });
      }
    } catch (err) {
      await reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.get("/reports/team-overview", async (request2, reply) => {
    try {
      const technicians = await prisma.user.findMany({
        where: {
          cargo: { in: [import_client9.Cargo.Agente_Social, import_client9.Cargo.Especialista] },
          ativo: true
        },
        select: { id: true, nome: true, cargo: true },
        orderBy: { cargo: "asc" }
      });
      const activeCases = await prisma.case.findMany({
        where: {
          status: { not: import_client9.CaseStatus.DESLIGADO }
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
          especialistaPAEFIId: true,
          agenteAcolhida: { select: { nome: true } },
          especialistaPAEFI: { select: { nome: true } }
        },
        orderBy: { pesoUrgencia: "desc" }
      });
      const overview = technicians.map((tech) => {
        const techCases = activeCases.filter((c) => {
          if (tech.cargo === import_client9.Cargo.Agente_Social) {
            return c.agenteAcolhidaId === tech.id && (c.status === import_client9.CaseStatus.AGUARDANDO_ACOLHIDA || c.status === import_client9.CaseStatus.EM_ACOLHIDA);
          }
          if (tech.cargo === import_client9.Cargo.Especialista) {
            return c.especialistaPAEFIId === tech.id && c.status === import_client9.CaseStatus.EM_ACOMPANHAMENTO_PAEFI;
          }
          return false;
        });
        return {
          nome: tech.nome,
          cargo: tech.cargo === import_client9.Cargo.Agente_Social ? "Agente Social" : "Especialista",
          cases: techCases
        };
      });
      return reply.status(200).send(overview);
    } catch (error) {
      console.error("Erro /reports/team-overview:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
  app2.get("/reports/rma", async (request2, reply) => {
    var _a, _b, _c;
    const querySchema = import_zod8.z.object({
      month: import_zod8.z.string().regex(/^\d{4}-\d{2}$/, "Formato inv\xE1lido (YYYY-MM).")
    });
    try {
      const { month } = querySchema.parse(request2.query);
      const targetDate = /* @__PURE__ */ new Date(month + "-01T00:00:00");
      const firstDay = (0, import_date_fns3.startOfMonth)(targetDate);
      const lastDay = (0, import_date_fns3.endOfMonth)(targetDate);
      const [initialCount, newEntriesCount, closedCasesCount] = await Promise.all([
        // B1: Saldo anterior
        prisma.case.count({
          where: {
            status: import_client9.CaseStatus.EM_ACOMPANHAMENTO_PAEFI,
            dataInicioPAEFI: { lt: firstDay },
            OR: [
              { dataDesligamento: null },
              { dataDesligamento: { gte: firstDay } }
            ]
          }
        }),
        // B2: Novos entrados no mês
        prisma.case.count({
          where: {
            dataInicioPAEFI: { gte: firstDay, lte: lastDay }
          }
        }),
        // B3: Desligados no mês
        prisma.case.count({
          where: {
            status: import_client9.CaseStatus.DESLIGADO,
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
        masculino: ((_a = sexGroups.find((g) => g.sexo === "Masculino")) == null ? void 0 : _a._count.sexo) || 0,
        feminino: ((_b = sexGroups.find((g) => g.sexo === "Feminino")) == null ? void 0 : _b._count.sexo) || 0,
        outro: ((_c = sexGroups.find((g) => !["Masculino", "Feminino"].includes(g.sexo))) == null ? void 0 : _c._count.sexo) || 0
      };
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
var import_client10 = require("@prisma/client");
var import_date_fns4 = require("date-fns");
async function alertRoutes(app2) {
  app2.addHook("onRequest", async (request2, reply) => {
    try {
      await request2.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.get("/alerts", async (request2, reply) => {
    const { sub: userId, cargo } = request2.user;
    const notifications = [];
    const today = (0, import_date_fns4.startOfDay)(/* @__PURE__ */ new Date());
    const tomorrowEnd = (0, import_date_fns4.addDays)(today, 2);
    const thirtyDaysAgo = (0, import_date_fns4.subDays)(today, 30);
    const tasks = [];
    tasks.push(
      prisma.agendamento.findMany({
        where: {
          responsavelId: userId,
          data: { gte: today, lt: tomorrowEnd }
        },
        include: { caso: { select: { nomeCompleto: true } } }
      }).then((agenda) => {
        agenda.forEach((ag) => {
          var _a;
          notifications.push({
            id: `agenda-${ag.id}`,
            title: "Compromisso Pr\xF3ximo",
            description: `${ag.tipo} - ${((_a = ag.caso) == null ? void 0 : _a.nomeCompleto) || "Sem caso vinculado"} \xE0s ${new Date(ag.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
            link: "/dashboard/agenda",
            type: "info"
          });
        });
      })
    );
    if (cargo === import_client10.Cargo.Coordenador) {
      tasks.push(
        prisma.case.count({
          where: { status: import_client10.CaseStatus.AGUARDANDO_ACOLHIDA }
        }).then((waitingCount) => {
          if (waitingCount > 0) {
            notifications.push({
              id: "waiting-cases",
              title: "Triagem Pendente",
              description: `Existem ${waitingCount} fam\xEDlias aguardando acolhida para triagem inicial.`,
              link: "/dashboard/cases?status=AGUARDANDO_ACOLHIDA",
              type: "critical"
            });
          }
        })
      );
    }
    if (cargo === import_client10.Cargo.Especialista) {
      tasks.push(
        prisma.case.count({
          where: {
            especialistaPAEFIId: userId,
            status: import_client10.CaseStatus.EM_ACOMPANHAMENTO_PAEFI,
            paf: { is: null }
          }
        }).then((casesWithoutPaf) => {
          if (casesWithoutPaf > 0) {
            notifications.push({
              id: "missing-paf",
              title: "Casos sem PAF",
              description: `${casesWithoutPaf} casos precisam do plano inicial.`,
              link: "/dashboard/cases",
              type: "critical"
            });
          }
        })
      );
      const pafDeadline = (0, import_date_fns4.addDays)(/* @__PURE__ */ new Date(), 15);
      tasks.push(
        prisma.paf.findMany({
          where: {
            caso: {
              especialistaPAEFIId: userId,
              status: { not: import_client10.CaseStatus.DESLIGADO }
            },
            deadline: { gte: today, lte: pafDeadline }
          },
          include: { caso: { select: { nomeCompleto: true, id: true } } }
        }).then((pafsExpiring) => {
          pafsExpiring.forEach((p) => {
            notifications.push({
              id: `paf-exp-${p.id}`,
              title: "Revis\xE3o de PAF",
              description: `O plano de ${p.caso.nomeCompleto} vence em ${new Date(p.deadline).toLocaleDateString("pt-BR")}.`,
              link: `/dashboard/cases/${p.caso.id}/paf`,
              type: "warning"
            });
          });
        })
      );
      tasks.push(
        prisma.case.findMany({
          select: { id: true, nomeCompleto: true },
          where: {
            especialistaPAEFIId: userId,
            status: import_client10.CaseStatus.EM_ACOMPANHAMENTO_PAEFI,
            // Logica: Não tem NENHUMA evolução com data >= 30 dias atrás
            // Ou seja, a última foi antes disso ou nunca houve.
            evolucao: {
              none: {
                data: { gte: thirtyDaysAgo }
              }
            }
          }
        }).then((stagnantCases) => {
          stagnantCases.forEach((c) => {
            notifications.push({
              id: `stagnant-${c.id}`,
              title: "Caso Sem Evolu\xE7\xE3o",
              description: `${c.nomeCompleto} n\xE3o possui registros nos \xFAltimos 30 dias.`,
              link: `/dashboard/cases/${c.id}`,
              type: "warning"
            });
          });
        })
      );
    }
    await Promise.all(tasks);
    return notifications;
  });
}

// src/routes/audit.ts
var import_zod9 = require("zod");
var import_date_fns5 = require("date-fns");
var import_client11 = require("@prisma/client");
async function auditRoutes(app2) {
  app2.addHook("onRequest", async (request2, reply) => {
    try {
      await request2.jwtVerify();
      const { cargo } = request2.user;
      if (cargo !== "Gerente") {
        return reply.status(403).send({ message: "Acesso restrito \xE0 gest\xE3o." });
      }
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.get("/audit", async (request2, reply) => {
    const querySchema = import_zod9.z.object({
      page: import_zod9.z.coerce.number().default(1),
      pageSize: import_zod9.z.coerce.number().default(20),
      search: import_zod9.z.string().optional(),
      // Busca textual
      autorId: import_zod9.z.string().optional(),
      // Filtro por Técnico
      acao: import_zod9.z.nativeEnum(import_client11.LogAction).optional(),
      // Filtro por Tipo de Ação
      periodo: import_zod9.z.enum(["hoje", "7dias", "30dias", "todo"]).default("7dias")
    });
    const { page, pageSize, search, autorId, acao, periodo } = querySchema.parse(request2.query);
    const where = {};
    if (search) {
      where.OR = [
        { descricao: { contains: search, mode: "insensitive" } },
        { autor: { nome: { contains: search, mode: "insensitive" } } },
        { caso: { nomeCompleto: { contains: search, mode: "insensitive" } } }
      ];
    }
    if (autorId && autorId !== "all") where.autorId = autorId;
    if (acao) where.acao = acao;
    const hoje = /* @__PURE__ */ new Date();
    if (periodo === "hoje") {
      where.createdAt = { gte: (0, import_date_fns5.startOfDay)(hoje), lte: (0, import_date_fns5.endOfDay)(hoje) };
    } else if (periodo === "7dias") {
      where.createdAt = { gte: (0, import_date_fns5.startOfDay)((0, import_date_fns5.subDays)(hoje, 7)) };
    } else if (periodo === "30dias") {
      where.createdAt = { gte: (0, import_date_fns5.startOfDay)((0, import_date_fns5.subDays)(hoje, 30)) };
    }
    try {
      const [total, items] = await Promise.all([
        prisma.caseLog.count({ where }),
        prisma.caseLog.findMany({
          where,
          take: pageSize,
          skip: (page - 1) * pageSize,
          orderBy: { createdAt: "desc" },
          include: {
            autor: { select: { nome: true, cargo: true, email: true } },
            caso: { select: { id: true, nomeCompleto: true } }
          }
        })
      ]);
      return reply.send({
        data: items,
        meta: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      });
    } catch (error) {
      console.error("Erro na auditoria:", error);
      return reply.status(500).send({ message: "Erro ao processar logs de auditoria." });
    }
  });
  app2.get("/audit/stats", async (request2, reply) => {
    const todayStart = (0, import_date_fns5.startOfDay)(/* @__PURE__ */ new Date());
    const stats = await prisma.caseLog.groupBy({
      by: ["acao"],
      where: {
        createdAt: { gte: todayStart }
      },
      _count: {
        _all: true
      }
    });
    return reply.send(stats);
  });
}

// src/routes/attachments.ts
var import_zod10 = require("zod");
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_node_crypto = require("crypto");
var import_client12 = require("@prisma/client");
var UPLOAD_DIR = import_path.default.resolve(process.cwd(), "uploads");
if (!import_fs.default.existsSync(UPLOAD_DIR)) {
  import_fs.default.mkdirSync(UPLOAD_DIR, { recursive: true });
}
async function validateFileSignature(buffer) {
  const bytes = buffer.subarray(0, 4).toString("hex").toUpperCase();
  const signatures = {
    "25504446": ["pdf"],
    "FFD8FFE0": ["image"],
    "FFD8FFE1": ["image"],
    "FFD8FFEE": ["image"],
    "FFD8FFDB": ["image"],
    "89504E47": ["image"]
  };
  for (const [sig, types] of Object.entries(signatures)) {
    if (bytes.startsWith(sig)) return types[0];
  }
  return null;
}
async function attachmentRoutes(app2) {
  app2.addHook("onRequest", async (request2, reply) => {
    try {
      await request2.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.get("/cases/:caseId/attachments", async (request2, reply) => {
    const paramsSchema = import_zod10.z.object({ caseId: import_zod10.z.string().uuid() });
    const params = paramsSchema.parse(request2.params);
    const caseId = params.caseId;
    const attachments = await prisma.anexo.findMany({
      where: { casoId: caseId },
      orderBy: { createdAt: "desc" },
      include: { autor: { select: { nome: true } } }
    });
    const host = request2.protocol + "://" + request2.hostname;
    const serialized = attachments.map((a) => ({
      ...a,
      url: `${host}/uploads/${a.url}`
    }));
    return reply.send(serialized);
  });
  app2.post("/attachments", async (request2, reply) => {
    if (!request2.isMultipart()) {
      return reply.status(400).send({ message: "Requisi\xE7\xE3o deve ser multipart/form-data" });
    }
    const data = await request2.file();
    if (!data) {
      return reply.status(400).send({ message: "Nenhum arquivo enviado." });
    }
    const buffer = await data.toBuffer();
    const fileType = await validateFileSignature(buffer);
    if (!fileType) {
      return reply.status(400).send({ message: "Tipo de arquivo inv\xE1lido. Apenas PDF e Imagens (JPG/PNG)." });
    }
    const querySchema = import_zod10.z.object({ casoId: import_zod10.z.string().uuid() });
    let casoId;
    try {
      const query = querySchema.parse(request2.query);
      casoId = query.casoId;
    } catch {
      return reply.status(400).send({ message: "casoId \xE9 obrigat\xF3rio na Query String (?casoId=uuid)" });
    }
    const ext = import_path.default.extname(data.filename).toLowerCase();
    const safeFileName = `${(0, import_node_crypto.randomUUID)()}${ext}`;
    const filePath = import_path.default.join(UPLOAD_DIR, safeFileName);
    try {
      import_fs.default.writeFileSync(filePath, buffer);
    } catch (e) {
      return reply.status(500).send({ message: "Erro ao gravar arquivo no disco." });
    }
    const { sub: userId } = request2.user;
    const anexo = await prisma.anexo.create({
      data: {
        nome: data.filename,
        tipo: fileType,
        url: safeFileName,
        tamanho: buffer.length,
        casoId,
        autorId: userId
      }
    });
    try {
      await prisma.caseLog.create({
        data: {
          casoId,
          autorId: userId,
          acao: import_client12.LogAction.ANEXO_ADICIONADO,
          descricao: `Anexo adicionado: ${data.filename}`
        }
      });
    } catch (error) {
      console.warn("Falha ao criar log de anexo:", error);
    }
    return reply.status(201).send(anexo);
  });
  app2.delete("/attachments/:id", async (request2, reply) => {
    const paramsSchema = import_zod10.z.object({ id: import_zod10.z.string().uuid() });
    const { id } = paramsSchema.parse(request2.params);
    const { sub: userId, cargo } = request2.user;
    const anexo = await prisma.anexo.findUnique({ where: { id } });
    if (!anexo) return reply.status(404).send({ message: "Arquivo n\xE3o encontrado." });
    if (anexo.autorId !== userId && cargo !== import_client12.Cargo.Gerente && cargo !== import_client12.Cargo.Coordenador) {
      return reply.status(403).send({ message: "Sem permiss\xE3o." });
    }
    await prisma.anexo.delete({ where: { id } });
    try {
      const filePath = import_path.default.join(UPLOAD_DIR, anexo.url);
      if (import_fs.default.existsSync(filePath)) {
        import_fs.default.unlinkSync(filePath);
      }
    } catch (e) {
      console.warn("Arquivo f\xEDsico n\xE3o encontrado ou erro ao apagar:", e);
    }
    try {
      await prisma.caseLog.create({
        data: {
          casoId: anexo.casoId,
          autorId: userId,
          acao: import_client12.LogAction.OUTRO,
          descricao: `Anexo removido: ${anexo.nome}`
        }
      });
    } catch (e) {
    }
    return reply.status(204).send();
  });
}

// src/routes/import.ts
var import_fast_csv2 = require("fast-csv");
var import_fs2 = __toESM(require("fs"));
var import_path2 = __toESM(require("path"));
var import_promises = require("stream/promises");
var import_client13 = require("@prisma/client");
async function importRoutes(app2) {
  app2.addHook("onRequest", async (request2, reply) => {
    try {
      await request2.jwtVerify();
      const { cargo } = request2.user;
      if (cargo !== import_client13.Cargo.Gerente) {
        return reply.status(403).send({ message: "Acesso restrito \xE0 Ger\xEAncia." });
      }
    } catch (err) {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.post("/import/cases", async (request2, reply) => {
    const { sub: userId } = request2.user;
    const data = await request2.file();
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
  app2.addHook("onRequest", async (request2, reply) => {
    try {
      await request2.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ message: "Sess\xE3o expirada ou inv\xE1lida." });
    }
  });
  app2.get("/filters", async (request2, reply) => {
    const { sub: userId } = request2.user;
    try {
      const filters = await prisma.savedFilter.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" }
      });
      return reply.send(filters);
    } catch (error) {
      request2.log.error(error);
      return reply.status(500).send({ message: "Erro ao buscar seus filtros." });
    }
  });
  app2.post("/filters", async (request2, reply) => {
    const { sub: userId } = request2.user;
    const bodySchema = import_zod11.z.object({
      nome: import_zod11.z.string().min(1, "D\xEA um nome para identificar este filtro (Ex: Meus casos na Vila)"),
      config: import_zod11.z.any()
    });
    try {
      const { nome, config } = bodySchema.parse(request2.body);
      const count = await prisma.savedFilter.count({ where: { userId } });
      if (count >= 15) {
        return reply.status(400).send({ message: "Limite de 15 filtros atingido. Exclua alguns antigos." });
      }
      const filter = await prisma.savedFilter.create({
        data: {
          nome,
          config: config ?? {},
          userId
        }
      });
      return reply.status(201).send(filter);
    } catch (error) {
      request2.log.error(error);
      return reply.status(500).send({ message: "Erro ao salvar filtro." });
    }
  });
  app2.patch("/filters/:id", async (request2, reply) => {
    const paramsSchema = import_zod11.z.object({ id: import_zod11.z.string().uuid() });
    const bodySchema = import_zod11.z.object({
      nome: import_zod11.z.string().min(1).optional(),
      config: import_zod11.z.any().optional()
    });
    const { sub: userId } = request2.user;
    const { id } = paramsSchema.parse(request2.params);
    const { nome, config } = bodySchema.parse(request2.body);
    try {
      const existing = await prisma.savedFilter.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ message: "Filtro n\xE3o encontrado." });
      if (existing.userId !== userId) return reply.status(403).send({ message: "Voc\xEA s\xF3 pode editar seus pr\xF3prios filtros." });
      const updated = await prisma.savedFilter.update({
        where: { id },
        data: {
          nome,
          config: config ?? void 0
          // undefined faz o Prisma ignorar o campo se não foi enviado
        }
      });
      return reply.send(updated);
    } catch (error) {
      request2.log.error(error);
      return reply.status(500).send({ message: "Erro ao atualizar filtro." });
    }
  });
  app2.delete("/filters/:id", async (request2, reply) => {
    const paramsSchema = import_zod11.z.object({ id: import_zod11.z.string().uuid() });
    const { sub: userId } = request2.user;
    try {
      const { id } = paramsSchema.parse(request2.params);
      const filter = await prisma.savedFilter.findUnique({ where: { id } });
      if (!filter) return reply.status(404).send({ message: "Filtro n\xE3o encontrado." });
      if (filter.userId !== userId) {
        return reply.status(403).send({ message: "Sem permiss\xE3o para excluir este filtro." });
      }
      await prisma.savedFilter.delete({ where: { id } });
      return reply.status(204).send();
    } catch (error) {
      request2.log.error(error);
      return reply.status(500).send({ message: "Erro ao remover filtro." });
    }
  });
}

// src/routes/referrals.ts
var import_zod12 = require("zod");
async function referralRoutes(app2) {
  app2.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send();
    }
  });
  app2.get("/cases/:caseId/referrals", async (req, reply) => {
    const { caseId } = import_zod12.z.object({ caseId: import_zod12.z.string().uuid() }).parse(req.params);
    const referrals = await prisma.encaminhamento.findMany({
      where: { casoId: caseId },
      // Nome correto do campo no banco
      orderBy: { dataEnvio: "desc" },
      include: {
        autor: { select: { nome: true } }
      }
    });
    return reply.send(referrals);
  });
  app2.post("/cases/:caseId/referrals", async (req, reply) => {
    const paramsSchema = import_zod12.z.object({ caseId: import_zod12.z.string().uuid() });
    const bodySchema = import_zod12.z.object({
      instituicao: import_zod12.z.string().min(2, "Informe a institui\xE7\xE3o de destino"),
      tipo: import_zod12.z.string().min(2, "Informe o tipo (Ex: Sa\xFAde, Educa\xE7\xE3o)"),
      motivo: import_zod12.z.string().min(5, "Descreva o motivo do encaminhamento")
    });
    const { caseId } = paramsSchema.parse(req.params);
    const { instituicao, tipo, motivo } = bodySchema.parse(req.body);
    const userId = req.user.sub;
    const caso = await prisma.case.findUnique({ where: { id: caseId } });
    if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado" });
    const referral = await prisma.encaminhamento.create({
      data: {
        instituicao,
        tipo,
        motivo,
        status: "PENDENTE",
        casoId: caseId,
        autorId: userId,
        dataEnvio: /* @__PURE__ */ new Date()
      }
    });
    await prisma.caseLog.create({
      data: {
        casoId: caseId,
        autorId: userId,
        acao: "OUTRO",
        // Ou crie um enum ENCAMINHAMENTO_CRIADO se puder alterar o schema
        descricao: `Encaminhou para: ${instituicao} (${tipo})`
      }
    });
    return reply.status(201).send(referral);
  });
  app2.patch("/referrals/:id", async (req, reply) => {
    const paramsSchema = import_zod12.z.object({ id: import_zod12.z.string().uuid() });
    const bodySchema = import_zod12.z.object({
      status: import_zod12.z.enum(["PENDENTE", "CONCLUIDO", "CANCELADO"]),
      retorno: import_zod12.z.string().optional()
      // Texto com a resposta da instituição
    });
    const { id } = paramsSchema.parse(req.params);
    const { status, retorno } = bodySchema.parse(req.body);
    const updated = await prisma.encaminhamento.update({
      where: { id },
      data: {
        status,
        retorno,
        // Salva o feedback (Ex: "Vaga concedida")
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    return reply.send(updated);
  });
  app2.delete("/referrals/:id", async (req, reply) => {
    const { id } = import_zod12.z.object({ id: import_zod12.z.string().uuid() }).parse(req.params);
    const userId = req.user.sub;
    const existing = await prisma.encaminhamento.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send();
    if (existing.autorId !== userId) {
      return reply.status(403).send({ message: "Apenas o autor pode excluir." });
    }
    await prisma.encaminhamento.delete({ where: { id } });
    return reply.status(204).send();
  });
}

// src/routes/family.ts
var import_zod13 = require("zod");
var import_client14 = require("@prisma/client");
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
          acao: import_client14.LogAction.MEMBRO_FAMILIA_ADICIONADO,
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
          acao: import_client14.LogAction.OUTRO,
          descricao: `Removeu familiar: ${member.nome}`
        }
      });
      return reply.status(204).send();
    } catch (error) {
      return reply.status(500).send();
    }
  });
}

// src/routes/deliverables.ts
var import_zod14 = require("zod");
async function deliverablesRoutes(app2) {
  app2.addHook("onRequest", async (request2) => {
    try {
      await request2.jwtVerify();
    } catch (err) {
    }
  });
  const paramsSchema = import_zod14.z.object({
    caseId: import_zod14.z.string().uuid()
  });
  const createDeliverableBodySchema = import_zod14.z.object({
    tipo: import_zod14.z.string().min(3, "Selecione um tipo de benef\xEDcio"),
    observacoes: import_zod14.z.string().optional()
  });
  const updateStatusSchema = import_zod14.z.object({
    status: import_zod14.z.enum(["SOLICITADO", "CONCEDIDO", "ENTREGUE", "NEGADO"]),
    dataEntrega: import_zod14.z.string().datetime().optional()
  });
  const updateParamsSchema = import_zod14.z.object({
    id: import_zod14.z.string().uuid()
  });
  app2.post("/cases/:caseId/deliverables", async (request2, reply) => {
    var _a;
    const { caseId } = paramsSchema.parse(request2.params);
    const { tipo, observacoes } = createDeliverableBodySchema.parse(request2.body);
    const caso = await prisma.case.findUnique({ where: { id: caseId } });
    if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado" });
    let responsavelId = (_a = request2.user) == null ? void 0 : _a.sub;
    if (!responsavelId) {
      const fallbackUser = await prisma.user.findFirst();
      responsavelId = (fallbackUser == null ? void 0 : fallbackUser.id) || "id-nao-encontrado";
    }
    const deliverable = await prisma.serviceDeliverable.create({
      data: {
        tipo,
        status: "SOLICITADO",
        observacoes,
        casoId: caseId,
        // <--- CORREÇÃO AQUI: O campo no banco é 'casoId'
        responsavelId
      }
    });
    return reply.status(201).send(deliverable);
  });
  app2.get("/cases/:caseId/deliverables", async (request2, reply) => {
    const { caseId } = paramsSchema.parse(request2.params);
    const deliverables = await prisma.serviceDeliverable.findMany({
      where: {
        casoId: caseId
        // <--- CORREÇÃO AQUI: O campo no banco é 'casoId'
      },
      orderBy: { createdAt: "desc" },
      include: {
        responsavel: {
          select: { nome: true }
        }
      }
    });
    const response = deliverables.map((d) => ({
      id: d.id,
      tipo: d.tipo,
      status: d.status,
      dataSolicitacao: d.dataSolicitacao,
      dataEntrega: d.dataEntrega,
      responsavel: { nome: d.responsavel.nome }
    }));
    return reply.send(response);
  });
  app2.patch("/deliverables/:id", async (request2, reply) => {
    const { id } = updateParamsSchema.parse(request2.params);
    const { status, dataEntrega } = updateStatusSchema.parse(request2.body);
    const updated = await prisma.serviceDeliverable.update({
      where: { id },
      data: {
        status,
        dataEntrega: dataEntrega ? new Date(dataEntrega) : void 0
      }
    });
    return reply.send(updated);
  });
}

// src/routes/groups.ts
var import_zod15 = require("zod");
var import_client15 = require("@prisma/client");
var import_date_fns6 = require("date-fns");
var import_locale3 = require("date-fns/locale");
async function groupRoutes(app2) {
  app2.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send();
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
  app2.post("/groups", async (req, reply) => {
    try {
      const bodySchema = import_zod15.z.object({
        tema: import_zod15.z.string().min(3),
        tipo: import_zod15.z.nativeEnum(import_client15.GroupType),
        // Aceita array de strings ou string única (para compatibilidade)
        datas: import_zod15.z.array(import_zod15.z.string()).optional(),
        dataRealizacao: import_zod15.z.string().optional(),
        local: import_zod15.z.string().optional(),
        descricao: import_zod15.z.string().optional(),
        orgaosEnvolvidos: import_zod15.z.array(import_zod15.z.string()).default([])
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
          acao: import_client15.LogAction.ATIVIDADE_GRUPO_CRIADA,
          descricao: `Criou atividade "${data.tema}" para ${datesToCreate.length} data(s).`
        }
      });
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
          const dataFormatada = (0, import_date_fns6.format)(group.dataRealizacao, "dd/MM/yyyy", { locale: import_locale3.ptBR });
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
  app2.patch("/groups/:groupId/attendance/:caseId", async (req, reply) => {
    try {
      const paramsSchema = import_zod15.z.object({ groupId: import_zod15.z.string().uuid(), caseId: import_zod15.z.string().uuid() });
      const bodySchema = import_zod15.z.object({ presente: import_zod15.z.boolean(), observacoes: import_zod15.z.string().optional() });
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
        const dataFormatada = (0, import_date_fns6.format)(group.dataRealizacao, "dd/MM/yyyy", { locale: import_locale3.ptBR });
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
          acao: import_client15.LogAction.PRESENCA_REGISTRADA,
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

// src/server.ts
var app = (0, import_fastify.default)({
  logger: { transport: { target: "pino-pretty" } }
});
var uploadDir = import_path3.default.join(__dirname, "../uploads");
if (!import_fs3.default.existsSync(uploadDir)) import_fs3.default.mkdirSync(uploadDir, { recursive: true });
app.register(import_multipart.default, { limits: { fileSize: 5 * 1024 * 1024 } });
app.register(import_cors.default, { origin: true, methods: ["GET", "POST", "PUT", "PATCH", "DELETE"] });
app.register(import_jwt.default, { secret: process.env.JWT_SECRET });
app.decorate("authenticate", async (request2, reply) => {
  try {
    await request2.jwtVerify();
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
app.register(deliverablesRoutes);
app.register(groupRoutes);
app.setNotFoundHandler((req, reply) => {
  if (req.raw.url && (req.raw.url.startsWith("/api") || req.raw.url.startsWith("/uploads"))) {
    return reply.status(404).send({ message: "Recurso n\xE3o encontrado" });
  }
  return reply.sendFile("index.html");
});
var port = Number(process.env.PORT) || 3333;
app.listen({ port, host: "0.0.0.0" }).then(() => {
  console.log(`\u{1F680} Servidor rodando na porta ${port} (v6.0.0)!`);
});
