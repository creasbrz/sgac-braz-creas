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
var import_path2 = __toESM(require("path"));
var import_fs2 = __toESM(require("fs"));
var import_fastify_type_provider_zod = require("fastify-type-provider-zod");
var import_swagger = __toESM(require("@fastify/swagger"));
var import_swagger_ui = __toESM(require("@fastify/swagger-ui"));

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
  const server = app2.withTypeProvider();
  const userResponseSchema = import_zod.z.object({
    id: import_zod.z.string().uuid(),
    nome: import_zod.z.string(),
    email: import_zod.z.string().email(),
    cargo: import_zod.z.nativeEnum(import_client2.Cargo),
    matricula: import_zod.z.string().nullable().optional(),
    ativo: import_zod.z.boolean(),
    createdAt: import_zod.z.date().optional()
    // Opcional pois o create retorna, mas o /me pode formatar
  });
  server.post("/register", {
    schema: {
      tags: ["Autentica\xE7\xE3o"],
      summary: "Registrar um novo usu\xE1rio no sistema",
      body: import_zod.z.object({
        nome: import_zod.z.string().min(3, "Nome deve ter no m\xEDnimo 3 caracteres"),
        email: import_zod.z.string().email("E-mail inv\xE1lido"),
        senha: import_zod.z.string().min(6, "Senha deve ter no m\xEDnimo 6 caracteres"),
        // Transformação para lidar com possíveis inputs legados ou do frontend
        cargo: import_zod.z.string().transform((val) => {
          if (val === "Agente Social") return import_client2.Cargo.Agente_Social;
          return val;
        }),
        matricula: import_zod.z.string().optional()
      }),
      response: {
        201: userResponseSchema
        // Filtra automaticamente a senha
      }
    }
  }, async (request, reply) => {
    const { nome, email, senha, cargo, matricula } = request.body;
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      return reply.status(409).send({ message: "Email j\xE1 registrado." });
    }
    const hashedPassword = await import_bcryptjs.default.hash(senha, 10);
    const user = await prisma.user.create({
      data: {
        nome,
        email,
        senha: hashedPassword,
        cargo,
        matricula,
        ativo: true
      }
    });
    return reply.status(201).send(user);
  });
  server.post("/login", {
    schema: {
      tags: ["Autentica\xE7\xE3o"],
      summary: "Autenticar usu\xE1rio e obter token JWT",
      body: import_zod.z.object({
        email: import_zod.z.string().email(),
        senha: import_zod.z.string()
      }),
      response: {
        200: import_zod.z.object({
          token: import_zod.z.string()
        })
      }
    }
  }, async (request, reply) => {
    const { email, senha } = request.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.ativo) {
      return reply.status(401).send({ message: "Credenciais inv\xE1lidas ou usu\xE1rio desativado." });
    }
    const isPasswordCorrect = await import_bcryptjs.default.compare(senha, user.senha);
    if (!isPasswordCorrect) {
      return reply.status(401).send({ message: "Credenciais inv\xE1lidas ou usu\xE1rio desativado." });
    }
    const token = app2.jwt.sign(
      { nome: user.nome, cargo: user.cargo, email: user.email },
      { sub: user.id, expiresIn: "7d" }
    );
    return reply.status(200).send({ token });
  });
  server.get("/me", {
    onRequest: [app2.authenticate],
    schema: {
      tags: ["Autentica\xE7\xE3o"],
      summary: "Obter dados do usu\xE1rio logado",
      security: [{ bearerAuth: [] }],
      // Adiciona o cadeado no Swagger
      response: {
        200: userResponseSchema
      }
    }
  }, async (request, reply) => {
    const userId = request.user.sub;
    const user = await prisma.user.findUnique({
      where: { id: userId }
      // Não precisamos de 'select' manual aqui, pois o userResponseSchema já filtra a senha na saída
    });
    if (!user) return reply.status(404).send({ message: "Usu\xE1rio n\xE3o encontrado." });
    if (!user.ativo) return reply.status(401).send({ message: "Usu\xE1rio desativado." });
    return reply.send(user);
  });
}

// src/routes/cases.ts
var import_zod2 = require("zod");

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
var import_fast_csv = require("fast-csv");
var import_date_fns = require("date-fns");
var import_locale = require("date-fns/locale");
var import_client3 = require("@prisma/client");
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
        if (d1.toISOString().split("T")[0] === d2.toISOString().split("T")[0]) continue;
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
  prisma.caseLog.create({
    data: { casoId: casoId2, autorId, acao, descricao, valorAnterior: valorAnterior ? String(valorAnterior) : null, valorNovo: valorNovo ? String(valorNovo) : null }
  }).catch((err) => console.error("Falha ao criar log:", err));
}
function buildActiveCaseWhereClause(user) {
  const cargo = user.cargo;
  if (cargo === import_client3.Cargo.Gerente) {
    return { status: import_client3.CaseStatus.AGUARDANDO_DISTRIBUICAO };
  }
  if (cargo === import_client3.Cargo.Agente_Social) {
    return {
      agenteAcolhidaId: user.sub,
      status: { in: [import_client3.CaseStatus.AGUARDANDO_ACOLHIDA, import_client3.CaseStatus.EM_ACOLHIDA] }
    };
  }
  if (cargo === import_client3.Cargo.Especialista) {
    return {
      especialistaPAEFIId: user.sub,
      status: {
        in: [import_client3.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, import_client3.CaseStatus.EM_ACOMPANHAMENTO, import_client3.CaseStatus.EM_MONITORAMENTO]
      }
    };
  }
  return {};
}
var caseBaseSchema = import_zod2.z.object({
  nomeCompleto: import_zod2.z.string().min(3),
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
  agenteAcolhidaId: import_zod2.z.string().uuid().nullable().optional(),
  numeroSei: import_zod2.z.string().nullable().optional(),
  linkSei: import_zod2.z.string().url().nullable().optional().or(import_zod2.z.literal("")),
  observacoes: import_zod2.z.string().nullable().optional()
});
async function caseRoutes(app2) {
  const server = app2.withTypeProvider();
  server.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      await reply.status(401).send({ message: "N\xE3o autorizado" });
    }
  });
  server.post("/cases", {
    schema: {
      tags: ["Casos"],
      summary: "Criar um novo caso",
      body: caseBaseSchema,
      response: {
        201: import_zod2.z.object({ id: import_zod2.z.string(), nomeCompleto: import_zod2.z.string() })
        // Resposta parcial para performance
      }
    }
  }, async (request, reply) => {
    const data = request.body;
    const userId = request.user.sub;
    const pesoUrgencia = calculateUrgencyWeight(data.urgencia);
    const casoData = {
      ...data,
      nascimento: stripTime(data.nascimento),
      dataEntrada: stripTime(data.dataEntrada),
      pesoUrgencia,
      criadoPorId: userId,
      numeroSei: data.numeroSei ?? null,
      linkSei: data.linkSei || null,
      observacoes: data.observacoes ?? null,
      beneficios: []
      // Se Agente criar, já vincula a ele? Depende da regra, aqui mantivemos genérico
    };
    const novoCaso = await prisma.case.create({ data: casoData });
    cache.invalidate("manager_stats");
    await createLog(novoCaso.id, userId, import_client3.LogAction.CRIACAO, `Caso criado via ${data.origem}`);
    return reply.status(201).send(novoCaso);
  });
  server.put("/cases/:id", {
    schema: {
      tags: ["Casos"],
      summary: "Editar dados cadastrais do caso",
      params: import_zod2.z.object({ id: import_zod2.z.string().uuid() }),
      body: caseBaseSchema.partial()
      // Permite envio parcial se necessário, ou use o baseSchema
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const rawData = request.body;
    const userId = request.user.sub;
    const oldCase = await prisma.case.findUnique({ where: { id } });
    if (!oldCase) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
    const data = {
      ...rawData,
      nascimento: rawData.nascimento ? stripTime(rawData.nascimento) : void 0,
      dataEntrada: rawData.dataEntrada ? stripTime(rawData.dataEntrada) : void 0
    };
    const pesoUrgencia = data.urgencia ? calculateUrgencyWeight(data.urgencia) : oldCase.pesoUrgencia;
    const updatedCaso = await prisma.case.update({
      where: { id },
      data: {
        ...data,
        pesoUrgencia
      }
    });
    cache.invalidate("manager_stats");
    const changes = detectChanges(oldCase, data);
    const keys = Object.keys(changes);
    if (keys.length > 0) {
      await createLog(id, userId, import_client3.LogAction.OUTRO, `Editou ${keys.length} campos cadastrais.`, JSON.stringify(changes), null);
    }
    return reply.send(updatedCaso);
  });
  server.get("/cases", {
    schema: {
      tags: ["Casos"],
      summary: "Listar casos com pagina\xE7\xE3o e filtros avan\xE7ados",
      querystring: import_zod2.z.object({
        search: import_zod2.z.string().optional(),
        page: import_zod2.z.coerce.number().min(1).default(1),
        pageSize: import_zod2.z.coerce.number().min(1).max(100).default(10),
        status: import_zod2.z.string().optional(),
        // Aceita "AGUARDANDO_ACOLHIDA,EM_ACOLHIDA"
        urgencia: import_zod2.z.string().optional(),
        violacao: import_zod2.z.string().optional(),
        categoria: import_zod2.z.string().optional(),
        sexo: import_zod2.z.string().optional(),
        view: import_zod2.z.enum(["my", "all"]).default("my").optional(),
        sortBy: import_zod2.z.string().optional(),
        sortOrder: import_zod2.z.enum(["asc", "desc"]).optional(),
        agenteId: import_zod2.z.string().uuid().optional(),
        specialistId: import_zod2.z.string().uuid().optional()
      })
    }
  }, async (request, reply) => {
    const {
      search,
      page,
      pageSize,
      status,
      urgencia,
      violacao,
      categoria,
      sexo,
      view,
      sortBy,
      sortOrder,
      agenteId,
      specialistId
    } = request.query;
    let where = {};
    if (agenteId) {
      where = { agenteAcolhidaId: agenteId, status: { in: [import_client3.CaseStatus.AGUARDANDO_ACOLHIDA, import_client3.CaseStatus.EM_ACOLHIDA] } };
    } else if (specialistId) {
      where = { especialistaPAEFIId: specialistId, status: { in: [import_client3.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, import_client3.CaseStatus.EM_ACOMPANHAMENTO, import_client3.CaseStatus.EM_MONITORAMENTO] } };
    } else if (view === "all") {
      where = { status: { not: import_client3.CaseStatus.DESLIGADO } };
    } else {
      const defaultFilters = buildActiveCaseWhereClause(request.user);
      where = { ...where, ...defaultFilters };
    }
    if (search) {
      where.AND = [
        ...where.AND || [],
        {
          OR: [
            { nomeCompleto: { contains: search, mode: "insensitive" } },
            { cpf: { contains: search } },
            { endereco: { contains: search, mode: "insensitive" } }
          ]
        }
      ];
    }
    if (status && status !== "all") {
      const statusList = status.split(",").map((s) => s.trim());
      const validStatuses = statusList.filter((s) => Object.values(import_client3.CaseStatus).includes(s));
      if (validStatuses.length > 0) where.status = { in: validStatuses };
    }
    if (urgencia && urgencia !== "all") where.urgencia = urgencia;
    if (violacao && violacao !== "all") where.violacao = violacao;
    if (categoria && categoria !== "all") where.categoria = categoria;
    if (sexo && sexo !== "all") where.sexo = sexo;
    let orderBy = [{ pesoUrgencia: "desc" }, { dataEntrada: "asc" }];
    if (sortBy) {
      if (sortBy === "urgencia") orderBy = { pesoUrgencia: sortOrder || "desc" };
      else orderBy = { [sortBy]: sortOrder || "asc" };
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
    return reply.send({
      data: items,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
    });
  });
  server.get("/cases/closed", {
    schema: {
      tags: ["Casos"],
      summary: "Listar hist\xF3rico de casos desligados",
      querystring: import_zod2.z.object({
        search: import_zod2.z.string().optional(),
        page: import_zod2.z.coerce.number().min(1).default(1),
        pageSize: import_zod2.z.coerce.number().min(1).max(100).default(10)
      })
    }
  }, async (request, reply) => {
    const { search, page, pageSize } = request.query;
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
        include: {
          agenteAcolhida: { select: { nome: true } },
          especialistaPAEFI: { select: { nome: true } }
        }
      }),
      prisma.case.count({ where })
    ]);
    return reply.send({
      data: items,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
    });
  });
  server.get("/cases/:id", {
    schema: {
      tags: ["Casos"],
      summary: "Obter prontu\xE1rio completo do caso",
      params: import_zod2.z.object({ id: import_zod2.z.string().uuid() })
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const caso = await prisma.case.findUnique({
      where: { id },
      include: {
        criadoPor: { select: { nome: true } },
        agenteAcolhida: { select: { id: true, nome: true } },
        especialistaPAEFI: { select: { id: true, nome: true } },
        familia: true,
        encaminhamentos: { include: { autor: { select: { nome: true } } }, orderBy: { dataEnvio: "desc" } },
        entregas: { include: { responsavel: { select: { nome: true } } }, orderBy: { dataSolicitacao: "desc" } },
        evolucoes: { include: { autor: { select: { nome: true, cargo: true } } }, orderBy: { createdAt: "desc" } },
        logs: { orderBy: { createdAt: "desc" }, take: 50, include: { autor: { select: { nome: true } } } }
      }
    });
    if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
    return reply.send(caso);
  });
  server.patch("/cases/:id/status", {
    schema: {
      tags: ["Casos"],
      summary: "Alterar status do fluxo (Workflow)",
      params: import_zod2.z.object({ id: import_zod2.z.string().uuid() }),
      body: import_zod2.z.object({ status: import_zod2.z.nativeEnum(import_client3.CaseStatus) })
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { status } = request.body;
    const { sub: userId } = request.user;
    const caso = await prisma.case.findUnique({ where: { id } });
    if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
    let updateData = { status };
    if (caso.status === import_client3.CaseStatus.DESLIGADO && status !== import_client3.CaseStatus.DESLIGADO) {
      updateData = {
        status: import_client3.CaseStatus.AGUARDANDO_ACOLHIDA,
        motivoDesligamento: null,
        destinoDesligamento: null,
        dataDesligamento: null,
        parecerFinal: null
      };
    }
    const updated = await prisma.case.update({ where: { id }, data: updateData });
    cache.invalidate("manager_stats");
    await createLog(id, userId, import_client3.LogAction.MUDANCA_STATUS, `Alterou status para ${status}`, caso.status, status);
    return reply.send(updated);
  });
  server.patch("/cases/:id/assign", {
    schema: {
      tags: ["Casos"],
      summary: "Atribuir caso a um especialista (Gerente)",
      params: import_zod2.z.object({ id: import_zod2.z.string().uuid() }),
      body: import_zod2.z.object({ specialistId: import_zod2.z.string().uuid() })
    }
  }, async (request, reply) => {
    var _a;
    const { id } = request.params;
    const { specialistId } = request.body;
    const { cargo, sub: userId } = request.user;
    if (cargo !== import_client3.Cargo.Gerente) return reply.status(403).send({ message: "Acesso negado." });
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
    await createLog(id, userId, import_client3.LogAction.ATRIBUICAO, `Atribuiu a ${(spec == null ? void 0 : spec.nome) || "Desconhecido"}`, oldName, spec == null ? void 0 : spec.nome);
    return reply.send(updated);
  });
  server.patch("/cases/:id/close", {
    schema: {
      tags: ["Casos"],
      summary: "Encerrar/Desligar um caso",
      params: import_zod2.z.object({ id: import_zod2.z.string().uuid() }),
      body: import_zod2.z.object({
        parecerFinal: import_zod2.z.string().min(10),
        motivoDesligamento: import_zod2.z.string().min(1),
        destinoDesligamento: import_zod2.z.string().optional()
      })
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { parecerFinal, motivoDesligamento, destinoDesligamento } = request.body;
    const { sub: userId, cargo } = request.user;
    const caso = await prisma.case.findUnique({ where: { id } });
    if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
    const isManager = cargo === import_client3.Cargo.Gerente;
    if (!isManager && caso.agenteAcolhidaId !== userId && caso.especialistaPAEFIId !== userId) {
      return reply.status(403).send({ message: "Sem permiss\xE3o para desligar este caso." });
    }
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
    await createLog(id, userId, import_client3.LogAction.DESLIGAMENTO, `Desligou: ${motivoDesligamento}`);
    return reply.send(updated);
  });
  server.get("/cases/export", {
    schema: {
      tags: ["Casos"],
      summary: "Exportar todos os dados para CSV (Gerente)"
    }
  }, async (request, reply) => {
    const { cargo } = request.user;
    if (cargo !== import_client3.Cargo.Gerente) return reply.status(403).send({ message: "Acesso negado." });
    const casos = await prisma.case.findMany({
      orderBy: { createdAt: "desc" },
      include: { criadoPor: true, agenteAcolhida: true, especialistaPAEFI: true }
    });
    reply.header("Content-Disposition", `attachment; filename="export_casos_${(0, import_date_fns.format)(/* @__PURE__ */ new Date(), "yyyy-MM-dd")}.csv"`);
    reply.type("text/csv; charset=utf-8");
    const csvStream = (0, import_fast_csv.format)({ headers: true });
    csvStream.pipe(reply.raw);
    casos.forEach((c) => {
      var _a, _b;
      csvStream.write({
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
    csvStream.end();
  });
}

// src/routes/users.ts
var import_zod3 = require("zod");
var import_client4 = require("@prisma/client");
var import_bcryptjs2 = __toESM(require("bcryptjs"));
async function userRoutes(app2) {
  const server = app2.withTypeProvider();
  const userResponseSchema = import_zod3.z.object({
    id: import_zod3.z.string().uuid(),
    nome: import_zod3.z.string(),
    email: import_zod3.z.string().email(),
    cargo: import_zod3.z.nativeEnum(import_client4.Cargo),
    matricula: import_zod3.z.string().nullable().optional(),
    ativo: import_zod3.z.boolean()
  });
  server.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      await reply.status(401).send({ message: "Token inv\xE1lido ou expirado." });
    }
  });
  server.post("/users", {
    schema: {
      tags: ["Usu\xE1rios"],
      summary: "Cadastrar novo servidor (Apenas Gerentes)",
      security: [{ bearerAuth: [] }],
      body: import_zod3.z.object({
        nome: import_zod3.z.string().min(3),
        email: import_zod3.z.string().email(),
        matricula: import_zod3.z.string().optional(),
        // [CORREÇÃO] Simplificado para z.string() para não quebrar o Swagger
        // A transformação garante que o valor final seja um Cargo válido
        cargo: import_zod3.z.string().transform((val) => {
          if (val === "Agente Social") return import_client4.Cargo.Agente_Social;
          if (Object.values(import_client4.Cargo).includes(val)) return val;
          throw new Error("Cargo inv\xE1lido");
        }),
        senhaInicial: import_zod3.z.string().min(6).default("123456")
      }),
      response: {
        201: userResponseSchema
      }
    }
  }, async (request, reply) => {
    const { cargo: userCargo } = request.user;
    if (userCargo !== import_client4.Cargo.Gerente) {
      return reply.status(403).send({ message: "Apenas gerentes podem cadastrar novos servidores." });
    }
    const { nome, email, matricula, cargo, senhaInicial } = request.body;
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      return reply.status(409).send({ message: "E-mail j\xE1 cadastrado." });
    }
    const passwordHash = await import_bcryptjs2.default.hash(senhaInicial, 10);
    const user = await prisma.user.create({
      data: {
        nome,
        email,
        matricula,
        cargo,
        // O TypeScript agora sabe que isso é do tipo Cargo graças ao transform
        senha: passwordHash,
        ativo: true
      }
    });
    return reply.status(201).send(user);
  });
  server.patch("/users/me/password", {
    schema: {
      tags: ["Usu\xE1rios"],
      summary: "Alterar a pr\xF3pria senha",
      security: [{ bearerAuth: [] }],
      body: import_zod3.z.object({
        senhaAtual: import_zod3.z.string(),
        novaSenha: import_zod3.z.string().min(6)
      }),
      response: {
        200: import_zod3.z.object({ message: import_zod3.z.string() })
      }
    }
  }, async (request, reply) => {
    const { senhaAtual, novaSenha } = request.body;
    const userId = request.user.sub;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return reply.status(404).send({ message: "Usu\xE1rio n\xE3o encontrado." });
    const isPasswordValid = await import_bcryptjs2.default.compare(senhaAtual, user.senha);
    if (!isPasswordValid) {
      return reply.status(400).send({ message: "A senha atual est\xE1 incorreta." });
    }
    const newPasswordHash = await import_bcryptjs2.default.hash(novaSenha, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { senha: newPasswordHash }
    });
    return reply.send({ message: "Senha alterada com sucesso!" });
  });
  server.get("/users", {
    schema: {
      tags: ["Usu\xE1rios"],
      summary: "Listar usu\xE1rios ativos com filtros opcionais",
      security: [{ bearerAuth: [] }],
      querystring: import_zod3.z.object({
        // [CORREÇÃO] Simplificado para z.string().optional()
        cargo: import_zod3.z.string().optional(),
        active: import_zod3.z.coerce.boolean().optional().default(true)
      }),
      response: {
        200: import_zod3.z.array(userResponseSchema)
      }
    }
  }, async (request, reply) => {
    const { sub: userId } = request.user;
    const { cargo, active } = request.query;
    let cargoFilter;
    if (cargo) {
      if (cargo === "Agente Social") cargoFilter = import_client4.Cargo.Agente_Social;
      else if (Object.values(import_client4.Cargo).includes(cargo)) cargoFilter = cargo;
    }
    const users = await prisma.user.findMany({
      where: {
        id: { not: userId },
        ativo: active,
        ...cargoFilter ? { cargo: cargoFilter } : {}
      },
      orderBy: { nome: "asc" }
    });
    return reply.send(users);
  });
  server.get("/users/agents", {
    schema: {
      tags: ["Usu\xE1rios"],
      summary: "Listar apenas Agentes Sociais ativos",
      security: [{ bearerAuth: [] }],
      response: {
        200: import_zod3.z.array(import_zod3.z.object({ id: import_zod3.z.string(), nome: import_zod3.z.string() }))
      }
    }
  }, async (request, reply) => {
    const agents = await prisma.user.findMany({
      where: { cargo: import_client4.Cargo.Agente_Social, ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true }
    });
    return reply.send(agents);
  });
  server.get("/users/specialists", {
    schema: {
      tags: ["Usu\xE1rios"],
      summary: "Listar apenas Especialistas ativos",
      security: [{ bearerAuth: [] }],
      response: {
        200: import_zod3.z.array(import_zod3.z.object({ id: import_zod3.z.string(), nome: import_zod3.z.string() }))
      }
    }
  }, async (request, reply) => {
    const specialists = await prisma.user.findMany({
      where: { cargo: import_client4.Cargo.Especialista, ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true }
    });
    return reply.send(specialists);
  });
  server.put("/users/:id", {
    schema: {
      tags: ["Usu\xE1rios"],
      summary: "Editar dados de um usu\xE1rio (Apenas Gerente)",
      security: [{ bearerAuth: [] }],
      params: import_zod3.z.object({ id: import_zod3.z.string().uuid() }),
      body: import_zod3.z.object({
        nome: import_zod3.z.string().min(3),
        email: import_zod3.z.string().email(),
        matricula: import_zod3.z.string().optional(),
        // [CORREÇÃO] Simplificado para string + transform
        cargo: import_zod3.z.string().transform((val) => {
          if (val === "Agente Social") return import_client4.Cargo.Agente_Social;
          if (Object.values(import_client4.Cargo).includes(val)) return val;
          throw new Error("Cargo inv\xE1lido");
        })
      }),
      response: {
        200: userResponseSchema
      }
    }
  }, async (request, reply) => {
    const { cargo: requestCargo } = request.user;
    if (requestCargo !== import_client4.Cargo.Gerente) {
      return reply.status(403).send({ message: "Acesso negado." });
    }
    const { id } = request.params;
    const { nome, email, cargo, matricula } = request.body;
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        nome,
        email,
        cargo,
        matricula
      }
    });
    return reply.send(updatedUser);
  });
  server.delete("/users/:id", {
    schema: {
      tags: ["Usu\xE1rios"],
      summary: "Desativar (Soft Delete) um usu\xE1rio",
      security: [{ bearerAuth: [] }],
      params: import_zod3.z.object({ id: import_zod3.z.string().uuid() }),
      response: {
        204: import_zod3.z.null()
      }
    }
  }, async (request, reply) => {
    const { cargo } = request.user;
    if (cargo !== import_client4.Cargo.Gerente) {
      return reply.status(403).send({ message: "Acesso negado." });
    }
    const { id } = request.params;
    await prisma.user.update({
      where: { id },
      data: { ativo: false }
    });
    return reply.status(204).send();
  });
}

// src/routes/evolutions.ts
var import_zod4 = require("zod");
var import_client5 = require("@prisma/client");
var authorSchema = import_zod4.z.object({
  id: import_zod4.z.string().uuid(),
  nome: import_zod4.z.string(),
  cargo: import_zod4.z.nativeEnum(import_client5.Cargo)
});
var evolutionResponseSchema = import_zod4.z.object({
  id: import_zod4.z.string().uuid(),
  conteudo: import_zod4.z.string(),
  sigilo: import_zod4.z.boolean(),
  createdAt: import_zod4.z.date(),
  updatedAt: import_zod4.z.date(),
  autorId: import_zod4.z.string(),
  autor: authorSchema
});
async function evolutionRoutes(app2) {
  const server = app2.withTypeProvider();
  server.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  server.get("/cases/:caseId/evolutions", {
    schema: {
      tags: ["Evolu\xE7\xF5es"],
      summary: "Listar hist\xF3rico de evolu\xE7\xF5es de um caso",
      params: import_zod4.z.object({ caseId: import_zod4.z.string().uuid() }),
      querystring: import_zod4.z.object({
        page: import_zod4.z.coerce.number().min(1).default(1),
        pageSize: import_zod4.z.coerce.number().min(1).max(50).default(10)
      }),
      response: {
        200: import_zod4.z.object({
          items: import_zod4.z.array(evolutionResponseSchema),
          total: import_zod4.z.number(),
          page: import_zod4.z.number(),
          totalPages: import_zod4.z.number()
        })
      }
    }
  }, async (request, reply) => {
    const { caseId } = request.params;
    const { page, pageSize } = request.query;
    const { sub: userId, cargo } = request.user;
    const caso = await prisma.case.findUnique({
      where: { id: caseId },
      select: {
        agenteAcolhidaId: true,
        especialistaPAEFIId: true
      }
    });
    if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
    const isGerente = cargo === import_client5.Cargo.Gerente;
    const isResponsavel = caso.agenteAcolhidaId === userId || caso.especialistaPAEFIId === userId;
    const canViewSigilo = isGerente || isResponsavel;
    const whereCondition = { casoId: caseId };
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
          autor: { select: { id: true, nome: true, cargo: true } }
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
  server.post("/cases/:caseId/evolutions", {
    schema: {
      tags: ["Evolu\xE7\xF5es"],
      summary: "Adicionar nova evolu\xE7\xE3o ao prontu\xE1rio",
      params: import_zod4.z.object({ caseId: import_zod4.z.string().uuid() }),
      body: import_zod4.z.object({
        conteudo: import_zod4.z.string().min(5, "A evolu\xE7\xE3o deve ter conte\xFAdo relevante."),
        sigilo: import_zod4.z.boolean().default(false)
      }),
      response: {
        201: evolutionResponseSchema
      }
    }
  }, async (request, reply) => {
    const { caseId } = request.params;
    const { conteudo, sigilo } = request.body;
    const { sub: userId } = request.user;
    const evolucao = await prisma.evolucao.create({
      data: {
        conteudo,
        sigilo,
        // [CORREÇÃO] Mapeamento explícito
        casoId: caseId,
        autorId: userId
      },
      include: { autor: { select: { id: true, nome: true, cargo: true } } }
    });
    prisma.caseLog.create({
      data: {
        // [CORREÇÃO] Mapeamento explícito
        casoId: caseId,
        autorId: userId,
        acao: import_client5.LogAction.EVOLUCAO_CRIADA,
        descricao: sigilo ? "Registrou uma evolu\xE7\xE3o t\xE9cnica (SIGILOSA)." : "Registrou uma evolu\xE7\xE3o t\xE9cnica p\xFAblica."
      }
    }).catch((err) => console.error("Erro ao criar log de evolu\xE7\xE3o:", err));
    return reply.status(201).send(evolucao);
  });
  server.patch("/evolutions/:id", {
    schema: {
      tags: ["Evolu\xE7\xF5es"],
      summary: "Editar conte\xFAdo de uma evolu\xE7\xE3o (Apenas Autor)",
      params: import_zod4.z.object({ id: import_zod4.z.string().uuid() }),
      body: import_zod4.z.object({
        conteudo: import_zod4.z.string().min(5).optional(),
        sigilo: import_zod4.z.boolean().optional()
      }),
      response: {
        200: evolutionResponseSchema
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { conteudo, sigilo } = request.body;
    const { sub: userId } = request.user;
    const existingEvolucao = await prisma.evolucao.findUnique({ where: { id } });
    if (!existingEvolucao) return reply.status(404).send({ message: "Evolu\xE7\xE3o n\xE3o encontrada." });
    if (existingEvolucao.autorId !== userId) {
      return reply.status(403).send({ message: "Voc\xEA s\xF3 pode editar evolu\xE7\xF5es criadas por voc\xEA." });
    }
    const updated = await prisma.evolucao.update({
      where: { id },
      data: { conteudo, sigilo },
      include: { autor: { select: { id: true, nome: true, cargo: true } } }
    });
    return reply.send(updated);
  });
  server.delete("/evolutions/:id", {
    schema: {
      tags: ["Evolu\xE7\xF5es"],
      summary: "Remover uma evolu\xE7\xE3o (Apenas Autor)",
      params: import_zod4.z.object({ id: import_zod4.z.string().uuid() }),
      response: {
        204: import_zod4.z.null()
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { sub: userId } = request.user;
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
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
};
var pafBodySchema = import_zod5.z.object({
  diagnostico: import_zod5.z.string().min(10, "O diagn\xF3stico deve conter ao menos 10 caracteres."),
  objetivos: import_zod5.z.string().min(10, "Os objetivos devem conter ao menos 10 caracteres."),
  estrategias: import_zod5.z.string().min(10, "As estrat\xE9gias devem conter ao menos 10 caracteres."),
  deadline: import_zod5.z.coerce.date({ required_error: "O prazo \xE9 obrigat\xF3rio." })
});
var pafResponseSchema = import_zod5.z.object({
  id: import_zod5.z.string().uuid(),
  diagnostico: import_zod5.z.string(),
  objetivos: import_zod5.z.string(),
  estrategias: import_zod5.z.string(),
  deadline: import_zod5.z.date(),
  versaoAtual: import_zod5.z.number(),
  updatedAt: import_zod5.z.date(),
  autor: import_zod5.z.object({
    id: import_zod5.z.string(),
    nome: import_zod5.z.string()
  }).optional()
});
var versionResponseSchema = import_zod5.z.object({
  id: import_zod5.z.string().uuid(),
  savedAt: import_zod5.z.date(),
  versaoNumero: import_zod5.z.number(),
  autor: import_zod5.z.object({ nome: import_zod5.z.string() }).optional()
  // Adicione outros campos se quiser exibir o conteúdo histórico na lista
});
async function pafRoutes(app2) {
  const server = app2.withTypeProvider();
  server.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  server.get("/cases/:caseId/paf", {
    schema: {
      tags: ["PAF"],
      summary: "Obter o Plano de Acompanhamento Familiar atual",
      params: import_zod5.z.object({ caseId: import_zod5.z.string().uuid() }),
      response: {
        200: pafResponseSchema.nullable()
      }
    }
  }, async (request, reply) => {
    const { caseId } = request.params;
    const paf = await prisma.paf.findUnique({
      where: { casoId: caseId },
      include: { autor: { select: { id: true, nome: true } } }
    });
    return reply.send(paf);
  });
  server.get("/cases/:caseId/paf/history", {
    schema: {
      tags: ["PAF"],
      summary: "Listar vers\xF5es anteriores do PAF",
      params: import_zod5.z.object({ caseId: import_zod5.z.string().uuid() }),
      response: {
        200: import_zod5.z.array(versionResponseSchema)
      }
    }
  }, async (request, reply) => {
    const { caseId } = request.params;
    const paf = await prisma.paf.findUnique({ where: { casoId: caseId } });
    if (!paf) return reply.send([]);
    const history = await prisma.pafVersion.findMany({
      where: { pafId: paf.id },
      orderBy: { savedAt: "desc" },
      include: { autor: { select: { nome: true } } }
    });
    return reply.send(history);
  });
  server.post("/cases/:caseId/paf", {
    schema: {
      tags: ["PAF"],
      summary: "Criar o primeiro PAF do caso",
      params: import_zod5.z.object({ caseId: import_zod5.z.string().uuid() }),
      body: pafBodySchema,
      response: {
        201: pafResponseSchema
      }
    }
  }, async (request, reply) => {
    const { caseId } = request.params;
    const data = request.body;
    const { sub: autorId, cargo } = request.user;
    if (cargo !== import_client6.Cargo.Especialista && cargo !== import_client6.Cargo.Gerente) {
      return reply.status(403).send({ message: "Apenas especialistas ou gerentes podem criar PAF." });
    }
    const existing = await prisma.paf.findUnique({ where: { casoId } });
    if (existing) {
      return reply.status(409).send({ message: "J\xE1 existe um PAF para este caso. Use a rota de atualiza\xE7\xE3o (PUT)." });
    }
    const created = await prisma.paf.create({
      data: {
        ...data,
        deadline: stripTime2(data.deadline),
        casoId,
        autorId,
        versaoAtual: 1
      },
      include: { autor: { select: { id: true, nome: true } } }
    });
    prisma.caseLog.create({
      data: {
        casoId,
        autorId,
        acao: import_client6.LogAction.PAF_CRIADO,
        descricao: "Elaborou o Plano de Acompanhamento Familiar (PAF)."
      }
    }).catch(console.error);
    return reply.status(201).send(created);
  });
  server.put("/cases/:caseId/paf", {
    schema: {
      tags: ["PAF"],
      summary: "Atualizar PAF (Gera nova vers\xE3o automaticamente)",
      params: import_zod5.z.object({ caseId: import_zod5.z.string().uuid() }),
      body: pafBodySchema.partial(),
      // Permite update parcial
      response: {
        200: pafResponseSchema
      }
    }
  }, async (request, reply) => {
    const { caseId } = request.params;
    const bodyData = request.body;
    const { sub: userId, cargo } = request.user;
    const existing = await prisma.paf.findUnique({ where: { casoId: caseId } });
    if (!existing) return reply.status(404).send({ message: "PAF n\xE3o encontrado." });
    if (cargo !== import_client6.Cargo.Gerente && cargo !== import_client6.Cargo.Especialista) {
      return reply.status(403).send({ message: "Sem permiss\xE3o para editar este PAF." });
    }
    const result = await prisma.$transaction(async (tx) => {
      await tx.pafVersion.create({
        data: {
          pafId: existing.id,
          diagnostico: existing.diagnostico,
          objetivos: existing.objetivos,
          estrategias: existing.estrategias,
          deadline: existing.deadline,
          autorId: existing.autorId,
          // Autor da versão antiga
          versaoNumero: existing.versaoAtual,
          savedAt: /* @__PURE__ */ new Date()
        }
      });
      const nextVersion = existing.versaoAtual + 1;
      const updated = await tx.paf.update({
        where: { casoId: caseId },
        data: {
          ...bodyData,
          deadline: bodyData.deadline ? stripTime2(bodyData.deadline) : void 0,
          autorId: userId,
          // Novo autor da versão atual
          versaoAtual: nextVersion
        },
        include: { autor: { select: { id: true, nome: true } } }
      });
      return updated;
    });
    prisma.caseLog.create({
      data: {
        casoId,
        autorId: userId,
        acao: import_client6.LogAction.PAF_ATUALIZADO,
        descricao: `Atualizou PAF para vers\xE3o ${result.versaoAtual}.`
      }
    }).catch(console.error);
    return reply.send(result);
  });
}

// src/routes/stats.ts
var import_zod6 = require("zod");
var import_date_fns3 = require("date-fns");
var import_locale2 = require("date-fns/locale");
var import_client8 = require("@prisma/client");

// src/services/AnalyticsAI.ts
var import_date_fns2 = require("date-fns");
var import_client7 = require("@prisma/client");
var AnalyticsAI = class {
  /**
   * Gera insights baseados em análise estatística dos dados reais do CREAS
   */
  static async generateInsights(monthsToCheck = 3) {
    const insights = [];
    const today = /* @__PURE__ */ new Date();
    const currentMonthStart = (0, import_date_fns2.startOfMonth)(today);
    const lastMonthStart = (0, import_date_fns2.startOfMonth)((0, import_date_fns2.subMonths)(today, 1));
    const [currentMonthCases, lastMonthCases] = await Promise.all([
      prisma.case.count({ where: { dataEntrada: { gte: currentMonthStart } } }),
      prisma.case.count({ where: { dataEntrada: { gte: lastMonthStart, lt: currentMonthStart } } })
    ]);
    if (lastMonthCases > 0) {
      const growth = (currentMonthCases - lastMonthCases) / lastMonthCases * 100;
      if (growth > 20) {
        insights.push({
          type: "warning",
          title: "Alerta de Demanda",
          description: `Aumento s\xFAbito de ${growth.toFixed(0)}% na entrada de novos casos em rela\xE7\xE3o ao m\xEAs anterior.`
        });
      } else if (growth < -20) {
        insights.push({
          type: "info",
          title: "Queda na Demanda",
          description: `Houve uma redu\xE7\xE3o de ${Math.abs(growth).toFixed(0)}% nos atendimentos iniciados este m\xEAs.`
        });
      }
    }
    const stalledCases = await prisma.case.count({
      where: {
        status: { not: import_client7.CaseStatus.DESLIGADO },
        evolucoes: {
          none: {
            createdAt: { gte: (0, import_date_fns2.subDays)(today, 30) }
          }
        }
      }
    });
    if (stalledCases > 0) {
      insights.push({
        type: "warning",
        title: "Risco de Neglig\xEAncia",
        description: `Detectados ${stalledCases} casos ativos sem nenhuma evolu\xE7\xE3o t\xE9cnica registrada h\xE1 mais de 30 dias.`
      });
    } else {
      insights.push({
        type: "success",
        title: "Cobertura Total",
        description: "Todos os casos ativos receberam atendimento t\xE9cnico nos \xFAltimos 30 dias."
      });
    }
    const topViolations = await prisma.case.groupBy({
      by: ["violacao"],
      where: {
        dataEntrada: { gte: (0, import_date_fns2.subMonths)(today, monthsToCheck) }
      },
      _count: { violacao: true },
      orderBy: { _count: { violacao: "desc" } },
      take: 1
    });
    if (topViolations.length > 0) {
      const top = topViolations[0];
      insights.push({
        type: "info",
        title: "Padr\xE3o de Viola\xE7\xE3o",
        description: `A viola\xE7\xE3o "${top.violacao}" representa a maior incid\xEAncia do per\xEDodo (${top._count.violacao} casos).`
      });
    }
    const visitsCount = await prisma.agendamento.count({
      where: {
        data: { gte: (0, import_date_fns2.subMonths)(today, 1) },
        OR: [
          { titulo: { contains: "Visita", mode: "insensitive" } },
          { titulo: { contains: "Busca", mode: "insensitive" } }
        ]
      }
    });
    if (visitsCount > 5) {
      insights.push({
        type: "success",
        title: "Territ\xF3rio Ativo",
        description: `Equipe realizou ${visitsCount} visitas/buscas ativas no \xFAltimo m\xEAs.`
      });
    }
    return insights.sort((a, b) => {
      const priority = { warning: 0, success: 1, info: 2 };
      return priority[a.type] - priority[b.type];
    }).slice(0, 3);
  }
};

// src/routes/stats.ts
var calculateUrgencyWeight2 = (urgencia) => {
  if (!urgencia) return 1;
  const term = urgencia.trim();
  if (["Convive com agressor", "Idoso 80+", "Primeira inf\xE2ncia", "Risco de morte"].includes(term)) return 4;
  if (["Risco de reincid\xEAncia", "Sofre amea\xE7a", "Risco de desabrigo", "Crian\xE7a/Adolescente"].includes(term)) return 3;
  if (["PCD", "Idoso", "Interna\xE7\xE3o", "Acolhimento", "Gestante/Lactante"].includes(term)) return 2;
  return 1;
};
var statsQuerySchema = import_zod6.z.object({
  months: import_zod6.z.coerce.number().min(1).max(60).default(12),
  violacao: import_zod6.z.string().optional()
});
var productivityQuerySchema = import_zod6.z.object({
  mode: import_zod6.z.enum(["workload", "performance"]).default("workload"),
  months: import_zod6.z.coerce.number().default(1)
});
var simpleStatSchema = import_zod6.z.object({
  name: import_zod6.z.string(),
  value: import_zod6.z.number()
});
async function statsRoutes(app2) {
  const server = app2.withTypeProvider();
  server.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  server.get("/stats", {
    schema: {
      tags: ["Dashboard"],
      summary: "Indicadores principais (Cards do Topo)",
      response: {
        200: import_zod6.z.object({
          role: import_zod6.z.string(),
          totalCases: import_zod6.z.number().optional(),
          acolhidasCount: import_zod6.z.number().optional(),
          acompanhamentosCount: import_zod6.z.number().optional(),
          monitoringCount: import_zod6.z.number().optional(),
          newCasesThisMonth: import_zod6.z.number().optional(),
          closedCasesThisMonth: import_zod6.z.number().optional(),
          workloadByAgent: import_zod6.z.array(simpleStatSchema).optional(),
          workloadBySpecialist: import_zod6.z.array(simpleStatSchema).optional(),
          casesByUrgency: import_zod6.z.array(simpleStatSchema).optional(),
          casesByCategory: import_zod6.z.array(simpleStatSchema).optional(),
          productivity: import_zod6.z.array(import_zod6.z.any()).optional(),
          lastUpdated: import_zod6.z.string().optional(),
          myActiveCases: import_zod6.z.number().optional(),
          myClosedMonth: import_zod6.z.number().optional(),
          myNewCasesMonth: import_zod6.z.number().optional(),
          message: import_zod6.z.string().optional()
        })
      }
    }
  }, async (request, reply) => {
    const { cargo, sub: userId } = request.user;
    if (cargo === import_client8.Cargo.Gerente) {
      const cacheKey = "manager_stats_main";
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        reply.header("X-Cache", "HIT");
        return reply.send(cachedData);
      }
      const today2 = /* @__PURE__ */ new Date();
      const firstDayOfMonth2 = (0, import_date_fns3.startOfMonth)(today2);
      const lastDayOfMonth2 = (0, import_date_fns3.endOfMonth)(today2);
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
        prisma.case.count({ where: { status: { in: [import_client8.CaseStatus.AGUARDANDO_ACOLHIDA, import_client8.CaseStatus.EM_ACOLHIDA] } } }),
        prisma.case.count({ where: { status: { in: [import_client8.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, import_client8.CaseStatus.EM_ACOMPANHAMENTO] } } }),
        prisma.case.count({ where: { status: import_client8.CaseStatus.EM_MONITORAMENTO } }),
        prisma.case.count({ where: { dataEntrada: { gte: firstDayOfMonth2, lte: lastDayOfMonth2 } } }),
        prisma.case.count({ where: { status: import_client8.CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth2, lte: lastDayOfMonth2 } } }),
        prisma.case.groupBy({
          by: ["agenteAcolhidaId"],
          where: { status: { in: [import_client8.CaseStatus.AGUARDANDO_ACOLHIDA, import_client8.CaseStatus.EM_ACOLHIDA] }, agenteAcolhidaId: { not: null } },
          _count: { _all: true }
        }),
        prisma.case.groupBy({
          by: ["especialistaPAEFIId"],
          where: { status: { in: [import_client8.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, import_client8.CaseStatus.EM_ACOMPANHAMENTO] }, especialistaPAEFIId: { not: null } },
          _count: { _all: true }
        }),
        prisma.case.groupBy({ by: ["urgencia"], _count: { _all: true }, where: { status: { not: import_client8.CaseStatus.DESLIGADO } } }),
        prisma.case.groupBy({ by: ["categoria"], _count: { _all: true }, where: { status: { not: import_client8.CaseStatus.DESLIGADO } } })
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
    }
    const today = /* @__PURE__ */ new Date();
    const firstDayOfMonth = (0, import_date_fns3.startOfMonth)(today);
    const lastDayOfMonth = (0, import_date_fns3.endOfMonth)(today);
    if (cargo === import_client8.Cargo.Agente_Social) {
      const [myActive, myClosed, myNew] = await Promise.all([
        prisma.case.count({ where: { agenteAcolhidaId: userId, status: { in: [import_client8.CaseStatus.AGUARDANDO_ACOLHIDA, import_client8.CaseStatus.EM_ACOLHIDA] } } }),
        prisma.case.count({ where: { agenteAcolhidaId: userId, status: import_client8.CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
        prisma.case.count({ where: { agenteAcolhidaId: userId, dataEntrada: { gte: firstDayOfMonth, lte: lastDayOfMonth } } })
      ]);
      return reply.send({ role: "Agente_Social", myActiveCases: myActive, myClosedMonth: myClosed, myNewCasesMonth: myNew });
    }
    if (cargo === import_client8.Cargo.Especialista) {
      const [myActive, myClosed, myNew] = await Promise.all([
        prisma.case.count({ where: { especialistaPAEFIId: userId, status: { in: [import_client8.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, import_client8.CaseStatus.EM_ACOMPANHAMENTO, import_client8.CaseStatus.EM_MONITORAMENTO] } } }),
        prisma.case.count({ where: { especialistaPAEFIId: userId, status: import_client8.CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
        prisma.case.count({ where: { especialistaPAEFIId: userId, dataInicioPAEFI: { gte: firstDayOfMonth, lte: lastDayOfMonth } } })
      ]);
      return reply.send({ role: "Especialista", myActiveCases: myActive, myClosedMonth: myClosed, myNewCasesMonth: myNew });
    }
    return reply.status(200).send({ role: "Visitante", message: "Sem dados." });
  });
  server.get("/stats/productivity", {
    schema: {
      tags: ["Dashboard"],
      summary: "M\xE9tricas de produtividade da equipe",
      querystring: productivityQuerySchema
    }
  }, async (request, reply) => {
    const { mode, months } = request.query;
    const users = await prisma.user.findMany({
      where: { ativo: true, cargo: { not: import_client8.Cargo.Gerente } },
      select: { id: true, nome: true, cargo: true }
    });
    if (mode === "performance") {
      const startDate = (0, import_date_fns3.subMonths)(/* @__PURE__ */ new Date(), months);
      const flowActions = [import_client8.LogAction.MUDANCA_STATUS, import_client8.LogAction.DESLIGAMENTO, import_client8.LogAction.ATRIBUICAO];
      const rawActivity = await prisma.caseLog.findMany({
        where: {
          createdAt: { gte: startDate },
          acao: { in: flowActions }
        },
        select: { autorId: true, casoId: true }
      });
      const statsMap = /* @__PURE__ */ new Map();
      rawActivity.forEach((log) => {
        var _a;
        if (!statsMap.has(log.autorId)) statsMap.set(log.autorId, /* @__PURE__ */ new Set());
        (_a = statsMap.get(log.autorId)) == null ? void 0 : _a.add(log.casoId);
      });
      const data2 = users.map((u) => {
        var _a;
        return {
          name: u.nome.split(" ")[0],
          value: ((_a = statsMap.get(u.id)) == null ? void 0 : _a.size) || 0,
          role: u.cargo
        };
      }).sort((a, b) => b.value - a.value);
      return reply.send(data2);
    }
    const [specialistStats, agentStats] = await Promise.all([
      prisma.case.groupBy({
        by: ["especialistaPAEFIId", "status"],
        where: {
          especialistaPAEFIId: { in: users.map((u) => u.id) },
          status: { in: [import_client8.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, import_client8.CaseStatus.EM_ACOMPANHAMENTO, import_client8.CaseStatus.EM_MONITORAMENTO] }
        },
        _count: { _all: true }
      }),
      prisma.case.groupBy({
        by: ["agenteAcolhidaId", "status"],
        where: {
          agenteAcolhidaId: { in: users.map((u) => u.id) },
          status: { in: [import_client8.CaseStatus.AGUARDANDO_ACOLHIDA, import_client8.CaseStatus.EM_ACOLHIDA] }
        },
        _count: { _all: true }
      })
    ]);
    const data = users.map((u) => {
      let active = 0;
      let monitoring = 0;
      if (u.cargo === import_client8.Cargo.Especialista) {
        const stats = specialistStats.filter((s) => s.especialistaPAEFIId === u.id);
        active = stats.filter((s) => s.status !== import_client8.CaseStatus.EM_MONITORAMENTO).reduce((acc, curr) => acc + curr._count._all, 0);
        monitoring = stats.filter((s) => s.status === import_client8.CaseStatus.EM_MONITORAMENTO).reduce((acc, curr) => acc + curr._count._all, 0);
      } else if (u.cargo === import_client8.Cargo.Agente_Social) {
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
  });
  server.get("/stats/vigilancia", {
    schema: {
      tags: ["Dashboard"],
      summary: "Relat\xF3rio avan\xE7ado de vigil\xE2ncia sociassistencial"
    }
  }, async (request, reply) => {
    const { cargo } = request.user;
    if (!["Gerente", "Especialista"].includes(cargo)) {
      return reply.status(403).send({ message: "Acesso restrito." });
    }
    const today = /* @__PURE__ */ new Date();
    const sixMonthsAgo = (0, import_date_fns3.subMonths)(today, 6);
    const allCases = await prisma.case.findMany({
      where: {
        OR: [
          { dataEntrada: { gte: sixMonthsAgo } },
          { dataDesligamento: { gte: sixMonthsAgo } }
        ]
      },
      select: {
        id: true,
        dataEntrada: true,
        dataDesligamento: true,
        dataInicioPAEFI: true,
        status: true,
        urgencia: true,
        violacao: true,
        categoria: true,
        sexo: true,
        nascimento: true
      }
    });
    const monthsMap = /* @__PURE__ */ new Map();
    for (let i = 5; i >= 0; i--) {
      const d = (0, import_date_fns3.subMonths)(today, i);
      const key = (0, import_date_fns3.format)(d, "yyyy-MM");
      const label = (0, import_date_fns3.format)(d, "MMM/yy", { locale: import_locale2.ptBR });
      monthsMap.set(key, { name: label.charAt(0).toUpperCase() + label.slice(1), novos: 0, desligados: 0 });
    }
    allCases.forEach((c) => {
      const entryKey = (0, import_date_fns3.format)(c.dataEntrada, "yyyy-MM");
      const exitKey = c.dataDesligamento ? (0, import_date_fns3.format)(c.dataDesligamento, "yyyy-MM") : null;
      if (monthsMap.has(entryKey)) monthsMap.get(entryKey).novos++;
      if (exitKey && monthsMap.has(exitKey)) monthsMap.get(exitKey).desligados++;
    });
    const evolutionData = Array.from(monthsMap.values());
    const [violations, urgencies, origins, referrals, benefits] = await Promise.all([
      prisma.case.groupBy({ by: ["violacao"], _count: { _all: true }, where: { status: { not: import_client8.CaseStatus.DESLIGADO } } }),
      prisma.case.groupBy({ by: ["urgencia"], _count: { _all: true }, where: { status: { not: import_client8.CaseStatus.DESLIGADO } } }),
      prisma.case.groupBy({ by: ["orgaoDemandante"], _count: { _all: true }, where: { status: { not: import_client8.CaseStatus.DESLIGADO } }, orderBy: { _count: { orgaoDemandante: "desc" } }, take: 10 }),
      prisma.encaminhamento.groupBy({ by: ["instituicao"], _count: { _all: true }, orderBy: { _count: { instituicao: "desc" } }, take: 10 }),
      prisma.serviceDeliverable.groupBy({ by: ["tipo"], _count: { _all: true }, orderBy: { _count: { tipo: "desc" } } })
    ]);
    const violationData = violations.map((v) => ({ name: v.violacao, value: v._count._all })).sort((a, b) => b.value - a.value);
    const urgencyData = urgencies.map((u) => ({ name: u.urgencia, value: u._count._all, weight: calculateUrgencyWeight2(u.urgencia) })).sort((a, b) => b.weight - a.weight);
    const originData = origins.map((o) => ({ name: o.orgaoDemandante, value: o._count._all }));
    const networkData = referrals.map((r) => ({ name: r.instituicao, value: r._count._all }));
    const benefitsData = benefits.map((b) => ({ name: b.tipo, value: b._count._all }));
    const demographics = { sexo: { Masculino: 0, Feminino: 0, Outro: 0 }, etaria: { "0-11 (Crian\xE7a)": 0, "12-17 (Adolescente)": 0, "18-59 (Adulto)": 0, "60+ (Idoso)": 0 } };
    const mapData = [];
    for (const c of allCases) {
      if (c.status === import_client8.CaseStatus.DESLIGADO) continue;
      if (c.sexo === "Masculino") demographics.sexo.Masculino++;
      else if (c.sexo === "Feminino") demographics.sexo.Feminino++;
      else demographics.sexo.Outro++;
      const age = today.getFullYear() - c.nascimento.getFullYear();
      if (age < 12) demographics.etaria["0-11 (Crian\xE7a)"]++;
      else if (age < 18) demographics.etaria["12-17 (Adolescente)"]++;
      else if (age < 60) demographics.etaria["18-59 (Adulto)"]++;
      else demographics.etaria["60+ (Idoso)"]++;
      const pseudoRandom = c.id.charCodeAt(0) + c.id.charCodeAt(c.id.length - 1);
      mapData.push({ id: c.id, lat: -15.668 + (pseudoRandom % 100 - 50) / 4e3, lng: -48.201 + (pseudoRandom % 100 - 50) / 4e3, intensity: calculateUrgencyWeight2(c.urgencia), label: c.urgencia, violacao: c.violacao || "N\xE3o Informado", categoria: c.categoria || "N\xE3o Informado" });
    }
    const [groupCount, participantsCount] = await Promise.all([
      prisma.groupActivity.count({ where: { dataRealizacao: { gte: sixMonthsAgo } } }),
      prisma.groupAttendance.count({ where: { presente: true, grupo: { dataRealizacao: { gte: sixMonthsAgo } } } })
    ]);
    const collectiveData = { totalGroups: groupCount, totalParticipants: participantsCount, avgAttendance: groupCount > 0 ? Math.round(participantsCount / groupCount) : 0 };
    const closedCases = allCases.filter((c) => c.dataDesligamento);
    const totalPermanence = closedCases.reduce((acc, c) => acc + (c.dataDesligamento.getTime() - c.dataEntrada.getTime()), 0);
    const avgPermanence = closedCases.length ? Math.round(totalPermanence / closedCases.length / 864e5) : 0;
    return reply.send({
      evolutionData,
      violationData,
      urgencyData,
      originData,
      networkData,
      benefitsData,
      collectiveData,
      ageData: Object.entries(demographics.etaria).map(([name, value]) => ({ name, value })),
      sexData: Object.entries(demographics.sexo).map(([name, value]) => ({ name, value })),
      mapData,
      efficiencyData: { avgPermanence, totalClosed: closedCases.length, retentionRate: Math.round((1 - closedCases.length / (allCases.length || 1)) * 100) }
    });
  });
  server.get("/stats/advanced", {
    schema: {
      tags: ["Dashboard"],
      summary: "An\xE1lise de tend\xEAncias e IA",
      querystring: statsQuerySchema
    }
  }, async (request, reply) => {
    const { cargo } = request.user;
    if (cargo !== import_client8.Cargo.Gerente) return reply.status(403).send({ message: "Acesso restrito." });
    const { months, violacao } = request.query;
    const today = /* @__PURE__ */ new Date();
    const startDate = (0, import_date_fns3.startOfMonth)((0, import_date_fns3.subMonths)(today, months - 1));
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
      const d = (0, import_date_fns3.subMonths)(today, months - 1 - i);
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
    const insights = await AnalyticsAI.generateInsights(months);
    return reply.send({ trendData: Array.from(monthlyStats.values()), totalActive: await prisma.case.count({ where: { status: { not: import_client8.CaseStatus.DESLIGADO } } }), insights, pieData });
  });
  server.get("/stats/activity", {
    schema: {
      tags: ["Dashboard"],
      summary: "Feed de atividades em tempo real"
    }
  }, async (request, reply) => {
    const { sub: userId, cargo } = request.user;
    const whereScope = cargo === import_client8.Cargo.Gerente ? {} : { caso: { OR: [{ agenteAcolhidaId: userId }, { especialistaPAEFIId: userId }] } };
    const logs = await prisma.caseLog.findMany({ where: whereScope, take: 10, orderBy: { createdAt: "desc" }, include: { autor: { select: { nome: true, cargo: true } }, caso: { select: { id: true, nomeCompleto: true } } } });
    return reply.send(logs);
  });
}

// src/routes/appointments.ts
var import_zod7 = require("zod");
var import_client9 = require("@prisma/client");
var calendarEventSchema = import_zod7.z.object({
  id: import_zod7.z.string(),
  title: import_zod7.z.string(),
  start: import_zod7.z.date(),
  end: import_zod7.z.date().nullable().optional(),
  type: import_zod7.z.enum(["INDIVIDUAL", "GRUPO"]),
  resourceId: import_zod7.z.string().optional(),
  description: import_zod7.z.string().optional(),
  status: import_zod7.z.string()
});
var upcomingSchema = import_zod7.z.object({
  id: import_zod7.z.string(),
  titulo: import_zod7.z.string(),
  data: import_zod7.z.date(),
  caso: import_zod7.z.object({ nomeCompleto: import_zod7.z.string() }).nullable().optional()
});
var createAppointmentSchema = import_zod7.z.object({
  titulo: import_zod7.z.string().min(3, "T\xEDtulo muito curto"),
  data: import_zod7.z.coerce.date(),
  observacoes: import_zod7.z.string().nullable().optional(),
  casoId: import_zod7.z.string().uuid(),
  tipo: import_zod7.z.string().optional()
});
async function appointmentRoutes(app2) {
  const server = app2.withTypeProvider();
  server.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  server.get("/stats/my-agenda", {
    schema: {
      tags: ["Agenda"],
      summary: "Pr\xF3ximos compromissos do usu\xE1rio (Widget)",
      response: { 200: import_zod7.z.array(upcomingSchema) }
    }
  }, async (req, reply) => {
    const { sub: userId } = req.user;
    const upcoming = await prisma.agendamento.findMany({
      where: { responsavelId: userId, data: { gte: /* @__PURE__ */ new Date() } },
      include: { caso: { select: { nomeCompleto: true } } },
      orderBy: { data: "asc" },
      take: 5
    });
    return reply.send(upcoming);
  });
  server.get("/appointments", {
    schema: {
      tags: ["Agenda"],
      summary: "Listar compromissos (Agendamentos + Grupos)",
      querystring: import_zod7.z.object({
        caseId: import_zod7.z.string().uuid().optional(),
        start: import_zod7.z.coerce.date().optional(),
        end: import_zod7.z.coerce.date().optional()
      }),
      response: { 200: import_zod7.z.array(calendarEventSchema) }
    }
  }, async (req, reply) => {
    const { caseId, start, end } = req.query;
    const { sub: userId, cargo } = req.user;
    const now = /* @__PURE__ */ new Date();
    const queryStart = start || new Date(now.getFullYear(), now.getMonth(), 1);
    const queryEnd = end || new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const whereClause = { data: { gte: queryStart, lte: queryEnd } };
    if (caseId) {
      whereClause.casoId = caseId;
    } else if (cargo !== import_client9.Cargo.Gerente) {
      whereClause.OR = [
        { responsavelId: userId },
        { caso: { OR: [{ agenteAcolhidaId: userId }, { especialistaPAEFIId: userId }] } }
      ];
    }
    const [appointments, groups] = await Promise.all([
      // 1. Agendamentos Individuais
      prisma.agendamento.findMany({
        where: whereClause,
        include: { caso: { select: { nomeCompleto: true } } }
      }),
      // 2. Atividades de Grupo
      caseId ? prisma.groupActivity.findMany({
        where: {
          dataRealizacao: { gte: queryStart, lte: queryEnd },
          // [CORREÇÃO AQUI] Usando 'casoId: caseId' explicitamente
          participantes: { some: { casoId: caseId } }
        },
        include: { facilitador: { select: { nome: true } } }
      }) : prisma.groupActivity.findMany({
        where: { dataRealizacao: { gte: queryStart, lte: queryEnd } },
        include: { facilitador: { select: { nome: true } } }
      })
    ]);
    const normalized = [
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
        description: g.descricao || "",
        status: "SCHEDULED"
      }))
    ];
    return reply.send(normalized.sort((a, b) => a.start.getTime() - b.start.getTime()));
  });
  server.post("/appointments", {
    schema: {
      tags: ["Agenda"],
      body: createAppointmentSchema
    }
  }, async (req, reply) => {
    const data = req.body;
    const userId = req.user.sub;
    const agendamento = await prisma.agendamento.create({
      data: { ...data, responsavelId: userId }
    });
    prisma.caseLog.create({
      data: {
        casoId: data.casoId,
        autorId: userId,
        acao: import_client9.LogAction.AGENDAMENTO_CRIADO,
        descricao: `Agendamento: ${data.titulo}`
      }
    }).catch(console.error);
    return reply.status(201).send(agendamento);
  });
  server.put("/appointments/:id", {
    schema: {
      tags: ["Agenda"],
      params: import_zod7.z.object({ id: import_zod7.z.string().uuid() }),
      body: createAppointmentSchema.partial()
    }
  }, async (req, reply) => {
    const { id } = req.params;
    const data = req.body;
    const { sub: userId, cargo } = req.user;
    const existing = await prisma.agendamento.findUnique({ where: { id } });
    if (!existing || existing.responsavelId !== userId && cargo !== import_client9.Cargo.Gerente) {
      return reply.status(403).send({ message: "Sem permiss\xE3o." });
    }
    const updated = await prisma.agendamento.update({
      where: { id },
      data
    });
    return reply.send(updated);
  });
  server.delete("/appointments/:id", {
    schema: {
      tags: ["Agenda"],
      params: import_zod7.z.object({ id: import_zod7.z.string().uuid() })
    }
  }, async (req, reply) => {
    const { id } = req.params;
    const { sub: userId, cargo } = req.user;
    const existing = await prisma.agendamento.findUnique({ where: { id } });
    if (!existing || existing.responsavelId !== userId && cargo !== import_client9.Cargo.Gerente) {
      return reply.status(403).send({ message: "Sem permiss\xE3o." });
    }
    await prisma.agendamento.delete({ where: { id } });
    return reply.status(204).send();
  });
}

// src/routes/reports.ts
var import_zod8 = require("zod");
var import_date_fns4 = require("date-fns");
var import_client10 = require("@prisma/client");
var teamOverviewResponseSchema = import_zod8.z.array(import_zod8.z.object({
  nome: import_zod8.z.string(),
  cargo: import_zod8.z.string(),
  cases: import_zod8.z.array(import_zod8.z.object({
    id: import_zod8.z.string(),
    nomeCompleto: import_zod8.z.string(),
    status: import_zod8.z.string(),
    urgencia: import_zod8.z.string(),
    violacao: import_zod8.z.string()
  }))
}));
var rmaResponseSchema = import_zod8.z.object({
  initialCount: import_zod8.z.number(),
  newEntries: import_zod8.z.number(),
  closedCases: import_zod8.z.number(),
  finalCount: import_zod8.z.number(),
  profileBySex: import_zod8.z.record(import_zod8.z.number()),
  profileByAgeGroup: import_zod8.z.record(import_zod8.z.number())
});
async function reportRoutes(app2) {
  const server = app2.withTypeProvider();
  server.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
      const { cargo } = request.user;
      if (cargo !== import_client10.Cargo.Gerente) {
        return reply.status(403).send({ message: "Acesso negado. Apenas Ger\xEAncia." });
      }
    } catch (err) {
      await reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  server.get("/reports/team-overview", {
    schema: {
      tags: ["Relat\xF3rios"],
      summary: "Carga de trabalho detalhada por t\xE9cnico",
      response: {
        200: teamOverviewResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const technicians = await prisma.user.findMany({
        where: {
          cargo: { in: [import_client10.Cargo.Agente_Social, import_client10.Cargo.Especialista] },
          ativo: true
        },
        select: { id: true, nome: true, cargo: true },
        orderBy: { cargo: "asc" }
      });
      const activeCases = await prisma.case.findMany({
        where: {
          status: { not: import_client10.CaseStatus.DESLIGADO }
        },
        // SELECT MÍNIMO para performance
        select: {
          id: true,
          nomeCompleto: true,
          status: true,
          urgencia: true,
          violacao: true,
          agenteAcolhidaId: true,
          especialistaPAEFIId: true
        },
        orderBy: { pesoUrgencia: "desc" }
      });
      const overview = technicians.map((tech) => {
        const techCases = activeCases.filter((c) => {
          if (tech.cargo === import_client10.Cargo.Agente_Social) {
            return c.agenteAcolhidaId === tech.id && (c.status === import_client10.CaseStatus.AGUARDANDO_ACOLHIDA || c.status === import_client10.CaseStatus.EM_ACOLHIDA);
          }
          if (tech.cargo === import_client10.Cargo.Especialista) {
            return c.especialistaPAEFIId === tech.id && (c.status === import_client10.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA || c.status === import_client10.CaseStatus.EM_ACOMPANHAMENTO || c.status === import_client10.CaseStatus.EM_MONITORAMENTO);
          }
          return false;
        });
        return {
          nome: tech.nome,
          cargo: tech.cargo === import_client10.Cargo.Agente_Social ? "Agente Social" : "Especialista",
          cases: techCases
          // Retorna os objetos filtrados
        };
      });
      return reply.send(overview);
    } catch (error) {
      console.error("Erro /reports/team-overview:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
  server.get("/reports/rma", {
    schema: {
      tags: ["Relat\xF3rios"],
      summary: "Dados para preenchimento do RMA (MDS)",
      querystring: import_zod8.z.object({
        month: import_zod8.z.string().regex(/^\d{4}-\d{2}$/, "Formato inv\xE1lido (YYYY-MM).")
      }),
      response: {
        200: rmaResponseSchema
      }
    }
  }, async (request, reply) => {
    var _a, _b, _c;
    const { month } = request.query;
    const targetDate = /* @__PURE__ */ new Date(month + "-01T00:00:00");
    const firstDay = (0, import_date_fns4.startOfMonth)(targetDate);
    const lastDay = (0, import_date_fns4.endOfMonth)(targetDate);
    try {
      const [initialCount, newEntriesCount, closedCasesCount] = await Promise.all([
        // B1: Saldo anterior (Ativos antes do mês começar e não desligados antes)
        prisma.case.count({
          where: {
            status: import_client10.CaseStatus.EM_ACOMPANHAMENTO,
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
            status: import_client10.CaseStatus.DESLIGADO,
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
        const age = (0, import_date_fns4.differenceInYears)(now, c.nascimento);
        if (age <= 6) profileByAgeGroup["0-6"]++;
        else if (age <= 12) profileByAgeGroup["7-12"]++;
        else if (age <= 17) profileByAgeGroup["13-17"]++;
        else if (age <= 29) profileByAgeGroup["18-29"]++;
        else if (age <= 59) profileByAgeGroup["30-59"]++;
        else profileByAgeGroup["60+"]++;
      }
      const finalCount = initialCount + newEntriesCount - closedCasesCount;
      return reply.send({
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
var import_zod9 = require("zod");
var import_date_fns5 = require("date-fns");
var import_client11 = require("@prisma/client");
var alertResponseSchema = import_zod9.z.object({
  id: import_zod9.z.string(),
  nomeCompleto: import_zod9.z.string(),
  type: import_zod9.z.enum([
    "PAF_NOT_STARTED",
    "PAF_STALLED",
    "PAF_REVIEW_OVERDUE",
    "NOT_STARTED_YET",
    "RECEPTION_DELAY"
  ]),
  days: import_zod9.z.number(),
  urgencia: import_zod9.z.string()
});
async function alertRoutes(app2) {
  const server = app2.withTypeProvider();
  server.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send();
    }
  });
  server.get("/alerts", {
    schema: {
      tags: ["Alertas"],
      summary: "Monitoramento de prazos e pend\xEAncias (Sinais de Tr\xE2nsito)",
      response: {
        200: import_zod9.z.array(alertResponseSchema)
      }
    }
  }, async (req, reply) => {
    const { sub: userId, cargo } = req.user;
    try {
      let whereCondition = { status: { not: import_client11.CaseStatus.DESLIGADO } };
      if (cargo === import_client11.Cargo.Especialista) {
        whereCondition.especialistaPAEFIId = userId;
      } else if (cargo === import_client11.Cargo.Agente_Social) {
        whereCondition.agenteAcolhidaId = userId;
        whereCondition.status = { in: [import_client11.CaseStatus.EM_ACOLHIDA, import_client11.CaseStatus.AGUARDANDO_ACOLHIDA] };
      } else if (cargo === import_client11.Cargo.Gerente || cargo === import_client11.Cargo.Auditor) {
        whereCondition.OR = [
          { especialistaPAEFIId: { not: null } },
          { agenteAcolhidaId: { not: null } }
        ];
      } else {
        return reply.send([]);
      }
      const cases = await prisma.case.findMany({
        where: whereCondition,
        select: {
          id: true,
          nomeCompleto: true,
          status: true,
          dataEntrada: true,
          urgencia: true,
          // Traz apenas a data da última evolução para calcular o "silêncio"
          evolucoes: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true }
          }
        },
        take: 200
        // Limite de segurança
      });
      const today = /* @__PURE__ */ new Date();
      const alerts = cases.map((c) => {
        var _a;
        try {
          const lastEvolucao = (_a = c.evolucoes[0]) == null ? void 0 : _a.createdAt;
          const lastDate = lastEvolucao ? new Date(lastEvolucao) : null;
          const dataEntrada = c.dataEntrada ? new Date(c.dataEntrada) : /* @__PURE__ */ new Date();
          if (cargo === import_client11.Cargo.Especialista || cargo === import_client11.Cargo.Gerente && c.status.includes("PAEFI")) {
            if (!lastDate) {
              return { id: c.id, nomeCompleto: c.nomeCompleto, type: "PAF_NOT_STARTED", days: 0, urgencia: c.urgencia };
            }
            if ((0, import_date_fns5.isValid)(lastDate)) {
              const daysSince = (0, import_date_fns5.differenceInDays)(today, lastDate);
              if (daysSince >= 90) return { id: c.id, nomeCompleto: c.nomeCompleto, type: "PAF_REVIEW_OVERDUE", days: daysSince, urgencia: c.urgencia };
              if (daysSince >= 30) return { id: c.id, nomeCompleto: c.nomeCompleto, type: "PAF_STALLED", days: daysSince, urgencia: c.urgencia };
            }
          }
          if (cargo === import_client11.Cargo.Agente_Social || cargo === import_client11.Cargo.Gerente && c.status.includes("ACOLHIDA")) {
            const daysWaiting = (0, import_date_fns5.differenceInDays)(today, dataEntrada);
            if (c.status === import_client11.CaseStatus.AGUARDANDO_ACOLHIDA && daysWaiting > 2) {
              return { id: c.id, nomeCompleto: c.nomeCompleto, type: "NOT_STARTED_YET", days: daysWaiting, urgencia: c.urgencia };
            }
            if (c.status === import_client11.CaseStatus.EM_ACOLHIDA && !lastDate && daysWaiting > 5) {
              return { id: c.id, nomeCompleto: c.nomeCompleto, type: "RECEPTION_DELAY", days: daysWaiting, urgencia: c.urgencia };
            }
          }
        } catch (err) {
          return null;
        }
        return null;
      }).filter(Boolean);
      return reply.send(alerts);
    } catch (error) {
      console.error("[ALERTS_ERROR]", error);
      return reply.status(500).send({ message: "Erro ao processar alertas." });
    }
  });
}

// src/routes/audit.ts
var import_zod10 = require("zod");
var import_date_fns6 = require("date-fns");
var import_client12 = require("@prisma/client");
var logResponseSchema = import_zod10.z.object({
  id: import_zod10.z.string().uuid(),
  acao: import_zod10.z.nativeEnum(import_client12.LogAction),
  descricao: import_zod10.z.string(),
  createdAt: import_zod10.z.date(),
  valorAnterior: import_zod10.z.string().nullable(),
  valorNovo: import_zod10.z.string().nullable(),
  autor: import_zod10.z.object({
    nome: import_zod10.z.string(),
    cargo: import_zod10.z.string(),
    email: import_zod10.z.string()
  }),
  caso: import_zod10.z.object({
    id: import_zod10.z.string(),
    nomeCompleto: import_zod10.z.string()
  }).nullable().optional()
  // Pode ser null se o caso foi deletado fisicamente (raro) ou log de sistema
});
var auditQuerySchema = import_zod10.z.object({
  page: import_zod10.z.coerce.number().default(1),
  pageSize: import_zod10.z.coerce.number().default(20),
  search: import_zod10.z.string().optional(),
  autorId: import_zod10.z.string().optional(),
  acao: import_zod10.z.nativeEnum(import_client12.LogAction).optional(),
  periodo: import_zod10.z.enum(["hoje", "7dias", "30dias", "todo"]).default("7dias")
});
async function auditRoutes(app2) {
  const server = app2.withTypeProvider();
  server.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
      const { cargo } = request.user;
      if (cargo !== import_client12.Cargo.Gerente) {
        return reply.status(403).send({ message: "Acesso restrito \xE0 gest\xE3o." });
      }
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  server.get("/audit", {
    schema: {
      tags: ["Auditoria"],
      summary: "Pesquisar logs do sistema (Trilha de Auditoria)",
      querystring: auditQuerySchema,
      response: {
        200: import_zod10.z.object({
          data: import_zod10.z.array(logResponseSchema),
          meta: import_zod10.z.object({
            page: import_zod10.z.number(),
            pageSize: import_zod10.z.number(),
            total: import_zod10.z.number(),
            totalPages: import_zod10.z.number()
          })
        })
      }
    }
  }, async (request, reply) => {
    const { page, pageSize, search, autorId, acao, periodo } = request.query;
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
      where.createdAt = { gte: (0, import_date_fns6.startOfDay)(hoje), lte: (0, import_date_fns6.endOfDay)(hoje) };
    } else if (periodo === "7dias") {
      where.createdAt = { gte: (0, import_date_fns6.startOfDay)((0, import_date_fns6.subDays)(hoje, 7)) };
    } else if (periodo === "30dias") {
      where.createdAt = { gte: (0, import_date_fns6.startOfDay)((0, import_date_fns6.subDays)(hoje, 30)) };
    }
    try {
      const [total, items] = await Promise.all([
        prisma.caseLog.count({ where }),
        prisma.caseLog.findMany({
          where,
          take: pageSize,
          skip: (page - 1) * pageSize,
          orderBy: { createdAt: "desc" },
          // SELECT Otimizado
          select: {
            id: true,
            acao: true,
            descricao: true,
            createdAt: true,
            valorAnterior: true,
            valorNovo: true,
            autor: {
              select: { nome: true, cargo: true, email: true }
            },
            caso: {
              select: { id: true, nomeCompleto: true }
            }
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
  server.get("/audit/stats", {
    schema: {
      tags: ["Auditoria"],
      summary: "Resumo de atividades do dia",
      response: {
        200: import_zod10.z.array(import_zod10.z.object({
          acao: import_zod10.z.nativeEnum(import_client12.LogAction),
          _count: import_zod10.z.object({ _all: import_zod10.z.number() })
        }))
      }
    }
  }, async (request, reply) => {
    const todayStart = (0, import_date_fns6.startOfDay)(/* @__PURE__ */ new Date());
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
var import_zod11 = require("zod");
var import_client13 = require("@prisma/client");
var import_cloudinary = require("cloudinary");
import_cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
var uploadToCloudinary = (buffer, folder, resourceType) => {
  return new Promise((resolve, reject) => {
    const uploadStream = import_cloudinary.v2.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType
        // Mantém o nome original ou gera um UUID, aqui deixamos o Cloudinary gerenciar ou usamos o ID
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};
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
var attachmentResponseSchema = import_zod11.z.object({
  id: import_zod11.z.string().uuid(),
  nome: import_zod11.z.string(),
  tipo: import_zod11.z.string(),
  url: import_zod11.z.string(),
  tamanho: import_zod11.z.number().nullable(),
  createdAt: import_zod11.z.date(),
  autor: import_zod11.z.object({ nome: import_zod11.z.string() }).optional()
});
async function attachmentRoutes(app2) {
  const server = app2.withTypeProvider();
  server.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  server.get("/cases/:caseId/attachments", {
    schema: {
      tags: ["Anexos"],
      summary: "Listar arquivos anexados ao caso",
      params: import_zod11.z.object({ caseId: import_zod11.z.string().uuid() }),
      response: {
        200: import_zod11.z.array(attachmentResponseSchema)
      }
    }
  }, async (request, reply) => {
    const { caseId } = request.params;
    const attachments = await prisma.anexo.findMany({
      where: { casoId: caseId },
      orderBy: { createdAt: "desc" },
      include: { autor: { select: { nome: true } } }
    });
    return reply.send(attachments);
  });
  server.post("/attachments", {
    schema: {
      tags: ["Anexos"],
      summary: "Fazer upload de arquivo (PDF/Imagem) para o Cloudinary",
      querystring: import_zod11.z.object({ caseId: import_zod11.z.string().uuid() })
    }
  }, async (request, reply) => {
    if (!request.isMultipart()) {
      return reply.status(400).send({ message: "Requisi\xE7\xE3o deve ser multipart/form-data" });
    }
    const { caseId } = request.query;
    const data = await request.file();
    if (!data) return reply.status(400).send({ message: "Nenhum arquivo enviado." });
    const buffer = await data.toBuffer();
    const fileType = await validateFileSignature(buffer);
    if (!fileType) {
      return reply.status(400).send({ message: "Tipo de arquivo inv\xE1lido. Apenas PDF e Imagens (JPG/PNG)." });
    }
    try {
      const uploadResult = await uploadToCloudinary(buffer, "sgac_anexos", "auto");
      const { sub: userId } = request.user;
      const anexo = await prisma.anexo.create({
        data: {
          nome: data.filename,
          tipo: fileType,
          // Salvamos a URL segura completa (https://...)
          url: uploadResult.secure_url,
          // Podemos salvar o public_id se quisermos deletar depois, mas a URL serve por agora
          tamanho: buffer.length,
          casoId: caseId,
          autorId: userId
        }
      });
      prisma.caseLog.create({
        data: {
          casoId: caseId,
          autorId: userId,
          acao: import_client13.LogAction.ANEXO_ADICIONADO,
          descricao: `Anexo adicionado: ${data.filename}`
        }
      }).catch(console.error);
      return reply.status(201).send(anexo);
    } catch (error) {
      console.error("Erro Upload Cloudinary:", error);
      return reply.status(500).send({ message: "Erro ao fazer upload para a nuvem." });
    }
  });
  server.delete("/attachments/:id", {
    schema: {
      tags: ["Anexos"],
      summary: "Remover um arquivo anexo",
      params: import_zod11.z.object({ id: import_zod11.z.string().uuid() }),
      response: {
        204: import_zod11.z.null()
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { sub: userId, cargo } = request.user;
    const anexo = await prisma.anexo.findUnique({ where: { id } });
    if (!anexo) return reply.status(404).send({ message: "Arquivo n\xE3o encontrado." });
    const canDelete = anexo.autorId === userId || cargo === import_client13.Cargo.Gerente || cargo === import_client13.Cargo.Auditor;
    if (!canDelete) {
      return reply.status(403).send({ message: "Sem permiss\xE3o." });
    }
    await prisma.anexo.delete({ where: { id } });
    try {
      const urlParts = anexo.url.split("/");
      const fileNameWithExt = urlParts[urlParts.length - 1];
      const fileName = fileNameWithExt.split(".")[0];
      const publicId = `sgac_anexos/${fileName}`;
      await import_cloudinary.v2.uploader.destroy(publicId);
    } catch (e) {
      request.log.warn(`Erro ao deletar do Cloudinary (pode j\xE1 ter sido removido): ${anexo.url}`);
    }
    prisma.caseLog.create({
      data: {
        casoId: anexo.casoId,
        autorId: userId,
        acao: import_client13.LogAction.OUTRO,
        descricao: `Anexo removido: ${anexo.nome}`
      }
    }).catch(console.error);
    return reply.status(204).send();
  });
}

// src/routes/import.ts
var import_zod12 = require("zod");
var import_fast_csv2 = require("fast-csv");
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_promises = require("stream/promises");
var import_client14 = require("@prisma/client");
async function importRoutes(app2) {
  const server = app2.withTypeProvider();
  server.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
      const { cargo } = request.user;
      if (cargo !== import_client14.Cargo.Gerente) {
        return reply.status(403).send({ message: "Acesso restrito \xE0 Ger\xEAncia." });
      }
    } catch (err) {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  server.post("/import/cases", {
    schema: {
      tags: ["Importa\xE7\xE3o"],
      summary: "Importar casos em massa via CSV",
      consumes: ["multipart/form-data"],
      response: {
        200: import_zod12.z.object({
          message: import_zod12.z.string(),
          total: import_zod12.z.number(),
          success: import_zod12.z.number(),
          failed: import_zod12.z.number(),
          errors: import_zod12.z.array(import_zod12.z.string())
        })
      }
    }
  }, async (request, reply) => {
    const { sub: userId } = request.user;
    const data = await request.file();
    if (!data || data.mimetype !== "text/csv") {
      return reply.status(400).send({ message: "Por favor, envie um arquivo CSV v\xE1lido." });
    }
    const uploadDir2 = import_path.default.resolve(__dirname, "../../uploads");
    if (!import_fs.default.existsSync(uploadDir2)) import_fs.default.mkdirSync(uploadDir2, { recursive: true });
    const tempFilePath = import_path.default.join(uploadDir2, `import_${Date.now()}.csv`);
    await (0, import_promises.pipeline)(data.file, import_fs.default.createWriteStream(tempFilePath));
    const results = [];
    const errors = [];
    let successCount = 0;
    return new Promise((resolve, reject) => {
      import_fs.default.createReadStream(tempFilePath).pipe((0, import_fast_csv2.parse)({ headers: true, ignoreEmpty: true, delimiter: "," })).on("error", (error) => {
        console.error(error);
        import_fs.default.unlinkSync(tempFilePath);
        reject(reply.status(500).send({ message: "Erro ao ler o arquivo CSV." }));
      }).on("data", (row) => results.push(row)).on("end", async () => {
        if (import_fs.default.existsSync(tempFilePath)) import_fs.default.unlinkSync(tempFilePath);
        await prisma.$transaction(async (tx) => {
          for (const [index, row] of results.entries()) {
            const rowNum = index + 2;
            if (!row.Nome || !row.CPF) {
              errors.push(`Linha ${rowNum}: Nome ou CPF ausente.`);
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
              beneficiosArray = row.Beneficios.split(";").map((b) => b.trim()).filter(Boolean);
            }
            try {
              const dataNasc = new Date(row.Nascimento);
              const nascimento = isNaN(dataNasc.getTime()) ? /* @__PURE__ */ new Date() : dataNasc;
              await tx.case.create({
                data: {
                  // Obrigatórios
                  nomeCompleto: row.Nome,
                  cpf: cpfLimpo,
                  nascimento,
                  sexo: row.Sexo || "N\xE3o Informado",
                  telefone: row.Telefone || "",
                  endereco: row.Endereco || "",
                  urgencia: row.Urgencia || "Sem risco imediato",
                  violacao: row.Violacao || "Outros",
                  categoria: row.Categoria || "Fam\xEDlia em vulnerabilidade",
                  orgaoDemandante: row.Orgao || "Demanda Espont\xE2nea",
                  origem: import_client14.CaseOrigin.DOCUMENTAL,
                  // Marca como importado
                  // Opcionais
                  numeroSei: row.NumeroSEI || null,
                  linkSei: row.LinkSEI || null,
                  observacoes: row.Observacoes || `Importado via CSV em ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`,
                  beneficios: beneficiosArray,
                  // Sistema
                  pesoUrgencia: 1,
                  status: import_client14.CaseStatus.AGUARDANDO_ACOLHIDA,
                  criadoPorId: userId
                }
              });
              successCount++;
            } catch (err) {
              console.error(err);
              errors.push(`Linha ${rowNum}: Erro de banco de dados. Verifique o formato dos campos.`);
            }
          }
        });
        resolve(reply.send({
          message: "Processamento conclu\xEDdo.",
          total: results.length,
          success: successCount,
          failed: errors.length,
          errors: errors.slice(0, 50)
          // Retorna os primeiros 50 erros
        }));
      });
    });
  });
}

// src/routes/filters.ts
var import_zod13 = require("zod");
var filterResponseSchema = import_zod13.z.object({
  id: import_zod13.z.string().uuid(),
  nome: import_zod13.z.string(),
  config: import_zod13.z.any(),
  // JSON do banco
  createdAt: import_zod13.z.date()
});
var createFilterSchema = import_zod13.z.object({
  nome: import_zod13.z.string().min(1, "O nome do filtro \xE9 obrigat\xF3rio"),
  // Aceita um objeto JSON livre (estado do formulário de filtros do front)
  config: import_zod13.z.record(import_zod13.z.string(), import_zod13.z.any()).or(import_zod13.z.any())
});
async function filterRoutes(app2) {
  const server = app2.withTypeProvider();
  server.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ message: "Sess\xE3o expirada ou inv\xE1lida." });
    }
  });
  server.get("/filters", {
    schema: {
      tags: ["Filtros"],
      summary: "Listar filtros personalizados salvos pelo usu\xE1rio",
      response: {
        200: import_zod13.z.array(filterResponseSchema)
      }
    }
  }, async (request, reply) => {
    const { sub: userId } = request.user;
    try {
      const filters = await prisma.savedFilter.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" }
      });
      return reply.send(filters);
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao buscar filtros." });
    }
  });
  server.post("/filters", {
    schema: {
      tags: ["Filtros"],
      summary: "Salvar configura\xE7\xE3o atual de filtros",
      body: createFilterSchema,
      response: {
        201: filterResponseSchema
      }
    }
  }, async (request, reply) => {
    const { sub: userId } = request.user;
    const { nome, config } = request.body;
    try {
      const count = await prisma.savedFilter.count({ where: { userId } });
      if (count >= 15) {
        return reply.status(400).send({ message: "Limite de 15 filtros atingido. Exclua alguns antigos para salvar novos." });
      }
      const filter = await prisma.savedFilter.create({
        data: {
          nome,
          config: config ?? {},
          // Garante objeto vazio se null
          userId
        }
      });
      return reply.status(201).send(filter);
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao salvar filtro." });
    }
  });
  server.patch("/filters/:id", {
    schema: {
      tags: ["Filtros"],
      summary: "Atualizar nome ou regras de um filtro existente",
      params: import_zod13.z.object({ id: import_zod13.z.string().uuid() }),
      body: createFilterSchema.partial(),
      // Campos opcionais no update
      response: {
        200: filterResponseSchema
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { nome, config } = request.body;
    const { sub: userId } = request.user;
    try {
      const existing = await prisma.savedFilter.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ message: "Filtro n\xE3o encontrado." });
      if (existing.userId !== userId) return reply.status(403).send({ message: "Voc\xEA s\xF3 pode editar seus pr\xF3prios filtros." });
      const updated = await prisma.savedFilter.update({
        where: { id },
        data: {
          nome,
          config: config ?? void 0
        }
      });
      return reply.send(updated);
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao atualizar filtro." });
    }
  });
  server.delete("/filters/:id", {
    schema: {
      tags: ["Filtros"],
      summary: "Remover um filtro salvo",
      params: import_zod13.z.object({ id: import_zod13.z.string().uuid() }),
      response: {
        204: import_zod13.z.null()
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { sub: userId } = request.user;
    try {
      const filter = await prisma.savedFilter.findUnique({ where: { id } });
      if (!filter) return reply.status(404).send({ message: "Filtro n\xE3o encontrado." });
      if (filter.userId !== userId) {
        return reply.status(403).send({ message: "Sem permiss\xE3o para excluir este filtro." });
      }
      await prisma.savedFilter.delete({ where: { id } });
      return reply.status(204).send();
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao remover filtro." });
    }
  });
}

// src/routes/referrals.ts
var import_zod14 = require("zod");
var import_client15 = require("@prisma/client");
var referralResponseSchema = import_zod14.z.object({
  id: import_zod14.z.string().uuid(),
  instituicao: import_zod14.z.string(),
  tipo: import_zod14.z.string(),
  motivo: import_zod14.z.string(),
  status: import_zod14.z.string(),
  retorno: import_zod14.z.string().nullable().optional(),
  dataEnvio: import_zod14.z.date(),
  autor: import_zod14.z.object({
    nome: import_zod14.z.string()
  }).optional()
});
async function referralRoutes(app2) {
  const server = app2.withTypeProvider();
  server.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado" });
    }
  });
  server.get("/cases/:caseId/referrals", {
    schema: {
      tags: ["Encaminhamentos"],
      summary: "Listar hist\xF3rico de encaminhamentos externos",
      params: import_zod14.z.object({ caseId: import_zod14.z.string().uuid() }),
      response: {
        200: import_zod14.z.array(referralResponseSchema)
      }
    }
  }, async (req, reply) => {
    const { caseId } = req.params;
    const referrals = await prisma.encaminhamento.findMany({
      // CORREÇÃO: Mapeamento explícito (banco: variável)
      where: { casoId: caseId },
      orderBy: { dataEnvio: "desc" },
      include: {
        autor: { select: { nome: true } }
      }
    });
    return reply.send(referrals);
  });
  server.post("/cases/:caseId/referrals", {
    schema: {
      tags: ["Encaminhamentos"],
      summary: "Registrar novo encaminhamento para a rede",
      params: import_zod14.z.object({ caseId: import_zod14.z.string().uuid() }),
      body: import_zod14.z.object({
        instituicao: import_zod14.z.string().min(2, "Informe a institui\xE7\xE3o de destino"),
        tipo: import_zod14.z.string().min(2, "Informe o tipo (Ex: Sa\xFAde, Educa\xE7\xE3o)"),
        motivo: import_zod14.z.string().min(5, "Descreva o motivo do encaminhamento")
      }),
      response: {
        201: referralResponseSchema
      }
    }
  }, async (req, reply) => {
    const { caseId } = req.params;
    const { instituicao, tipo, motivo } = req.body;
    const { sub: userId } = req.user;
    const caso = await prisma.case.findUnique({ where: { id: caseId } });
    if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado" });
    try {
      const result = await prisma.$transaction(async (tx) => {
        const referral = await tx.encaminhamento.create({
          data: {
            instituicao,
            tipo,
            motivo,
            status: "PENDENTE",
            // CORREÇÃO: Mapeamento explícito
            casoId: caseId,
            autorId: userId,
            dataEnvio: /* @__PURE__ */ new Date()
          },
          include: { autor: { select: { nome: true } } }
        });
        await tx.evolucao.create({
          data: {
            // CORREÇÃO: Mapeamento explícito
            casoId: caseId,
            autorId: userId,
            sigilo: false,
            conteudo: `[SISTEMA - ENCAMINHAMENTO] Realizado para: ${instituicao} (${tipo}).
Motivo: ${motivo}.`
          }
        });
        await tx.caseLog.create({
          data: {
            // CORREÇÃO: Mapeamento explícito
            casoId: caseId,
            autorId: userId,
            acao: import_client15.LogAction.OUTRO,
            descricao: `Encaminhou para: ${instituicao} (${tipo})`
          }
        });
        return referral;
      });
      return reply.status(201).send(result);
    } catch (error) {
      console.error("\u274C Erro ao criar encaminhamento:", error);
      return reply.status(500).send({ message: "Erro ao processar encaminhamento." });
    }
  });
  server.patch("/referrals/:id", {
    schema: {
      tags: ["Encaminhamentos"],
      summary: "Atualizar status ou registrar contrarrefer\xEAncia",
      params: import_zod14.z.object({ id: import_zod14.z.string().uuid() }),
      body: import_zod14.z.object({
        status: import_zod14.z.enum(["PENDENTE", "CONCLUIDO", "CANCELADO"]),
        retorno: import_zod14.z.string().optional()
      }),
      response: {
        200: referralResponseSchema
      }
    }
  }, async (req, reply) => {
    const { id } = req.params;
    const { status, retorno } = req.body;
    try {
      const updated = await prisma.encaminhamento.update({
        where: { id },
        data: {
          status,
          retorno,
          updatedAt: /* @__PURE__ */ new Date()
        },
        include: { autor: { select: { nome: true } } }
      });
      return reply.send(updated);
    } catch (error) {
      return reply.status(404).send({ message: "Encaminhamento n\xE3o encontrado." });
    }
  });
  server.delete("/referrals/:id", {
    schema: {
      tags: ["Encaminhamentos"],
      summary: "Remover um encaminhamento (Apenas Autor)",
      params: import_zod14.z.object({ id: import_zod14.z.string().uuid() }),
      response: {
        204: import_zod14.z.null()
      }
    }
  }, async (req, reply) => {
    const { id } = req.params;
    const { sub: userId } = req.user;
    const existing = await prisma.encaminhamento.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ message: "Encaminhamento n\xE3o encontrado." });
    if (existing.autorId !== userId) {
      return reply.status(403).send({ message: "Apenas o autor pode excluir este registro." });
    }
    await prisma.encaminhamento.delete({ where: { id } });
    return reply.status(204).send();
  });
}

// src/routes/family.ts
var import_zod15 = require("zod");
var import_client16 = require("@prisma/client");
async function familyRoutes(app2) {
  app2.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send();
    }
  });
  app2.post("/cases/:caseId/family", async (req, reply) => {
    const paramsSchema = import_zod15.z.object({ caseId: import_zod15.z.string().uuid() });
    const bodySchema = import_zod15.z.object({
      nome: import_zod15.z.string().min(2),
      parentesco: import_zod15.z.string().min(2),
      idade: import_zod15.z.number().int().nonnegative().optional(),
      cpf: import_zod15.z.string().optional().nullable(),
      nascimento: import_zod15.z.coerce.date().optional().nullable(),
      telefone: import_zod15.z.string().optional().nullable(),
      ocupacao: import_zod15.z.string().optional(),
      renda: import_zod15.z.number().nonnegative().optional(),
      observacoes: import_zod15.z.string().optional()
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
          casoId: caseId
        }
      });
      await prisma.caseLog.create({
        data: {
          casoId: caseId,
          autorId: userId,
          acao: import_client16.LogAction.MEMBRO_FAMILIA_ADICIONADO,
          descricao: `Adicionou familiar: ${data.nome} (${data.parentesco})`
        }
      });
      return reply.status(201).send({
        ...member,
        renda: member.renda ? Number(member.renda) : null
      });
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ message: "Erro ao adicionar familiar." });
    }
  });
  app2.get("/cases/:caseId/family", async (req, reply) => {
    const { caseId } = import_zod15.z.object({ caseId: import_zod15.z.string().uuid() }).parse(req.params);
    const members = await prisma.membroFamilia.findMany({
      where: { casoId: caseId },
      orderBy: { createdAt: "asc" }
    });
    const serializedMembers = members.map((m) => ({
      ...m,
      renda: m.renda ? Number(m.renda) : null
    }));
    return reply.send(serializedMembers);
  });
  app2.delete("/family/:id", async (req, reply) => {
    const { id } = import_zod15.z.object({ id: import_zod15.z.string().uuid() }).parse(req.params);
    const userId = req.user.sub;
    try {
      const member = await prisma.membroFamilia.findUnique({ where: { id } });
      if (!member) return reply.status(404).send();
      await prisma.membroFamilia.delete({ where: { id } });
      await prisma.caseLog.create({
        data: {
          casoId: member.casoId,
          autorId: userId,
          acao: import_client16.LogAction.OUTRO,
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
var import_zod16 = require("zod");
var import_client17 = require("@prisma/client");
var deliverableResponseSchema = import_zod16.z.object({
  id: import_zod16.z.string(),
  tipo: import_zod16.z.string(),
  status: import_zod16.z.string(),
  dataSolicitacao: import_zod16.z.date(),
  dataEntrega: import_zod16.z.date().nullable(),
  responsavel: import_zod16.z.object({ nome: import_zod16.z.string() })
});
async function deliverablesRoutes(app2) {
  const server = app2.withTypeProvider();
  server.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send();
    }
  });
  server.get("/cases/:caseId/deliverables", {
    schema: {
      tags: ["Benef\xEDcios"],
      params: import_zod16.z.object({ caseId: import_zod16.z.string().uuid() }),
      response: { 200: import_zod16.z.array(deliverableResponseSchema) }
    }
  }, async (req, reply) => {
    const { caseId } = req.params;
    const items = await prisma.serviceDeliverable.findMany({
      // CORREÇÃO: Mapeando explicitamente 'casoId' do banco para 'caseId' da rota
      where: { casoId: caseId },
      orderBy: { createdAt: "desc" },
      include: {
        responsavel: { select: { nome: true } }
      }
    });
    return reply.send(items);
  });
  server.post("/cases/:caseId/deliverables", {
    schema: {
      tags: ["Benef\xEDcios"],
      params: import_zod16.z.object({ caseId: import_zod16.z.string().uuid() }),
      body: import_zod16.z.object({
        tipo: import_zod16.z.string().min(3),
        observacoes: import_zod16.z.string().optional()
      })
    }
  }, async (req, reply) => {
    const { caseId } = req.params;
    const { tipo, observacoes } = req.body;
    const userId = req.user.sub;
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.serviceDeliverable.create({
        data: {
          tipo,
          status: "SOLICITADO",
          observacoes,
          // CORREÇÃO: Mapeando explicitamente
          casoId: caseId,
          responsavelId: userId
        }
      });
      await tx.caseLog.create({
        data: {
          casoId: caseId,
          // CORREÇÃO
          autorId: userId,
          acao: import_client17.LogAction.ENTREGA_BENEFICIO_CRIADA,
          descricao: `Solicitou benef\xEDcio: ${tipo}`
        }
      });
      return item;
    });
    return reply.status(201).send(result);
  });
  server.patch("/deliverables/:id", {
    schema: {
      tags: ["Benef\xEDcios"],
      params: import_zod16.z.object({ id: import_zod16.z.string().uuid() }),
      body: import_zod16.z.object({
        status: import_zod16.z.enum(["SOLICITADO", "CONCEDIDO", "ENTREGUE", "NEGADO"]),
        dataEntrega: import_zod16.z.string().datetime().optional()
      })
    }
  }, async (req, reply) => {
    const { id } = req.params;
    const { status, dataEntrega } = req.body;
    const userId = req.user.sub;
    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.serviceDeliverable.update({
        where: { id },
        data: {
          status,
          dataEntrega: dataEntrega ? new Date(dataEntrega) : void 0
        },
        include: { responsavel: { select: { nome: true } } }
      });
      await tx.caseLog.create({
        data: {
          casoId: item.casoId,
          autorId: userId,
          acao: import_client17.LogAction.ENTREGA_BENEFICIO_ATUALIZADA,
          descricao: `Atualizou benef\xEDcio ${item.tipo} para ${status}`
        }
      });
      return item;
    });
    return reply.send(updated);
  });
}

// src/routes/groups.ts
var import_zod17 = require("zod");
var import_client18 = require("@prisma/client");
var import_date_fns7 = require("date-fns");
var import_locale3 = require("date-fns/locale");
var groupResponseSchema = import_zod17.z.object({
  id: import_zod17.z.string().uuid(),
  tema: import_zod17.z.string(),
  tipo: import_zod17.z.nativeEnum(import_client18.GroupType),
  dataRealizacao: import_zod17.z.date(),
  local: import_zod17.z.string().nullable().optional(),
  descricao: import_zod17.z.string().nullable().optional(),
  facilitador: import_zod17.z.object({ nome: import_zod17.z.string() }).optional(),
  _count: import_zod17.z.object({ participantes: import_zod17.z.number() }).optional(),
  attendanceConfirmed: import_zod17.z.boolean().default(false),
  participantes: import_zod17.z.array(import_zod17.z.object({
    id: import_zod17.z.string(),
    presente: import_zod17.z.boolean(),
    casoId: import_zod17.z.string().uuid(),
    caso: import_zod17.z.object({
      id: import_zod17.z.string(),
      nomeCompleto: import_zod17.z.string()
    })
  })).optional()
});
var createGroupSchema = import_zod17.z.object({
  tema: import_zod17.z.string().min(3, "Tema deve ter no m\xEDnimo 3 caracteres"),
  tipo: import_zod17.z.nativeEnum(import_client18.GroupType),
  datas: import_zod17.z.array(import_zod17.z.string()).optional(),
  dataRealizacao: import_zod17.z.string().optional(),
  local: import_zod17.z.string().optional(),
  descricao: import_zod17.z.string().optional(),
  orgaosEnvolvidos: import_zod17.z.array(import_zod17.z.string()).default([])
});
async function groupRoutes(app2) {
  const server = app2.withTypeProvider();
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
        200: import_zod17.z.array(groupResponseSchema)
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
      params: import_zod17.z.object({ id: import_zod17.z.string().uuid() }),
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
      params: import_zod17.z.object({ id: import_zod17.z.string().uuid() }),
      response: {
        200: import_zod17.z.array(import_zod17.z.object({
          id: import_zod17.z.string(),
          nomeCompleto: import_zod17.z.string(),
          status: import_zod17.z.string()
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
        201: import_zod17.z.object({ count: import_zod17.z.number(), message: import_zod17.z.string() })
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
      params: import_zod17.z.object({ id: import_zod17.z.string().uuid() }),
      body: import_zod17.z.object({ caseIds: import_zod17.z.array(import_zod17.z.string().uuid()) }),
      response: {
        200: import_zod17.z.object({ message: import_zod17.z.string() })
      }
    }
  }, async (req, reply) => {
    const { id } = req.params;
    const { caseIds } = req.body;
    const userId = req.user.sub;
    const group = await prisma.groupActivity.findUnique({ where: { id } });
    if (!group) return reply.status(404).send({ message: "Grupo n\xE3o encontrado." });
    const dataFormatada = (0, import_date_fns7.format)(group.dataRealizacao, "dd/MM/yyyy", { locale: import_locale3.ptBR });
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
      params: import_zod17.z.object({
        groupId: import_zod17.z.string().uuid(),
        caseId: import_zod17.z.string().uuid()
      }),
      body: import_zod17.z.object({
        presente: import_zod17.z.boolean(),
        observacoes: import_zod17.z.string().optional()
      }),
      response: {
        200: import_zod17.z.any()
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
          const dataFormatada = (0, import_date_fns7.format)(group.dataRealizacao, "dd/MM/yyyy", { locale: import_locale3.ptBR });
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
            acao: import_client18.LogAction.PRESENCA_REGISTRADA,
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
      params: import_zod17.z.object({ id: import_zod17.z.string().uuid() }),
      response: {
        200: import_zod17.z.object({ message: import_zod17.z.string(), attendanceConfirmed: import_zod17.z.boolean() })
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

// src/routes/workspace.ts
var import_zod18 = require("zod");
var import_date_fns8 = require("date-fns");
var import_client19 = require("@prisma/client");
var CaseAlertType = /* @__PURE__ */ ((CaseAlertType2) => {
  CaseAlertType2["PAF_NOT_STARTED"] = "PAF_NOT_STARTED";
  CaseAlertType2["PAF_STALLED"] = "PAF_STALLED";
  CaseAlertType2["PAF_REVIEW_OVERDUE"] = "PAF_REVIEW_OVERDUE";
  CaseAlertType2["RECEPTION_DELAY"] = "RECEPTION_DELAY";
  CaseAlertType2["NOT_STARTED_YET"] = "NOT_STARTED_YET";
  return CaseAlertType2;
})(CaseAlertType || {});
var caseSummarySchema = import_zod18.z.object({
  id: import_zod18.z.string(),
  nomeCompleto: import_zod18.z.string(),
  status: import_zod18.z.string(),
  urgencia: import_zod18.z.string(),
  violacao: import_zod18.z.string().nullable(),
  updatedAt: import_zod18.z.date(),
  dataEntrada: import_zod18.z.date()
});
var appointmentSchema = import_zod18.z.object({
  id: import_zod18.z.string(),
  titulo: import_zod18.z.string(),
  data: import_zod18.z.date(),
  caso: import_zod18.z.object({ nomeCompleto: import_zod18.z.string() }).optional()
});
var alertSchema = caseSummarySchema.extend({
  type: import_zod18.z.nativeEnum(CaseAlertType),
  days: import_zod18.z.number()
});
var teamLoadSchema = import_zod18.z.object({
  nome: import_zod18.z.string(),
  role: import_zod18.z.string(),
  cases: import_zod18.z.number()
});
var logSchema = import_zod18.z.object({
  id: import_zod18.z.string(),
  acao: import_zod18.z.string(),
  createdAt: import_zod18.z.date(),
  autor: import_zod18.z.object({ nome: import_zod18.z.string() })
});
var workspaceResponseSchema = import_zod18.z.object({
  role: import_zod18.z.string(),
  // Comuns
  appointments: import_zod18.z.array(appointmentSchema).optional(),
  // Gerente
  stats: import_zod18.z.object({
    totalActive: import_zod18.z.number(),
    waitingForReception: import_zod18.z.number(),
    waitingForDistribution: import_zod18.z.number()
  }).optional(),
  teamLoad: import_zod18.z.array(teamLoadSchema).optional(),
  topViolations: import_zod18.z.array(import_zod18.z.object({ label: import_zod18.z.string(), count: import_zod18.z.number() })).optional(),
  // Auditor
  incompleteCases: import_zod18.z.array(import_zod18.z.object({
    id: import_zod18.z.string(),
    nomeCompleto: import_zod18.z.string(),
    cpf: import_zod18.z.string().nullable(),
    endereco: import_zod18.z.string().nullable()
  })).optional(),
  recentLogs: import_zod18.z.array(logSchema).optional(),
  // Operacional (Agente/Especialista)
  myCases: import_zod18.z.array(caseSummarySchema).optional(),
  alerts: import_zod18.z.array(alertSchema).optional(),
  detailedStats: import_zod18.z.object({
    // Especialista
    monitoramento: import_zod18.z.number().optional(),
    acolhidaEsp: import_zod18.z.number().optional(),
    acompanhamento: import_zod18.z.number().optional(),
    // Agente
    meusAguardando: import_zod18.z.number().optional(),
    meusEmAtendimento: import_zod18.z.number().optional(),
    filaGeral: import_zod18.z.number().optional()
  }).optional()
});
async function workspaceRoutes(app2) {
  const server = app2.withTypeProvider();
  server.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado" });
    }
  });
  server.get("/workspace/summary", {
    schema: {
      tags: ["Workspace"],
      summary: "Dados consolidados para a tela inicial (Dashboard Pessoal)",
      response: {
        200: workspaceResponseSchema
      }
    }
  }, async (req, reply) => {
    var _a, _b, _c, _d, _e;
    const { sub: userId, cargo } = req.user;
    const todayStart = (0, import_date_fns8.startOfDay)(/* @__PURE__ */ new Date());
    const todayEnd = (0, import_date_fns8.endOfDay)(/* @__PURE__ */ new Date());
    const thirtyDaysAgo = (0, import_date_fns8.subDays)(/* @__PURE__ */ new Date(), 30);
    const ninetyDaysAgo = (0, import_date_fns8.subDays)(/* @__PURE__ */ new Date(), 90);
    try {
      const appointments = cargo !== import_client19.Cargo.Auditor ? await prisma.agendamento.findMany({
        where: { responsavelId: userId, data: { gte: todayStart, lte: todayEnd } },
        include: { caso: { select: { nomeCompleto: true } } },
        orderBy: { data: "asc" }
      }) : [];
      if (cargo === import_client19.Cargo.Gerente) {
        const [totalActive, waitingForReception, waitingForDistribution] = await Promise.all([
          prisma.case.count({ where: { status: { not: import_client19.CaseStatus.DESLIGADO } } }),
          prisma.case.count({ where: { status: import_client19.CaseStatus.AGUARDANDO_ACOLHIDA } }),
          // PAEFI não distribuído
          prisma.case.count({ where: { status: import_client19.CaseStatus.AGUARDANDO_DISTRIBUICAO_PAEFI } })
        ]);
        const teamLoadRaw = await prisma.user.findMany({
          where: { cargo: { in: [import_client19.Cargo.Especialista, import_client19.Cargo.Agente_Social] }, ativo: true },
          select: {
            nome: true,
            cargo: true,
            _count: {
              select: {
                casosAcolhida: {
                  where: { status: { in: [import_client19.CaseStatus.EM_ACOLHIDA, import_client19.CaseStatus.AGUARDANDO_ACOLHIDA] } }
                },
                casosPAEFI: {
                  where: {
                    // [ATUALIZAÇÃO] Enum corrigido para EM_ACOMPANHAMENTO
                    status: { in: [import_client19.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, import_client19.CaseStatus.EM_ACOMPANHAMENTO, import_client19.CaseStatus.EM_MONITORAMENTO] }
                  }
                }
              }
            }
          }
        });
        const violationsRaw = await prisma.case.groupBy({
          by: ["violacao"],
          where: { status: { not: import_client19.CaseStatus.DESLIGADO } },
          _count: { violacao: true },
          orderBy: { _count: { violacao: "desc" } },
          take: 5
        });
        return reply.send({
          role: "GERENTE",
          appointments,
          stats: { totalActive, waitingForReception, waitingForDistribution },
          teamLoad: teamLoadRaw.map((t) => {
            var _a2, _b2;
            return {
              nome: t.nome,
              role: t.cargo,
              cases: (((_a2 = t._count) == null ? void 0 : _a2.casosAcolhida) || 0) + (((_b2 = t._count) == null ? void 0 : _b2.casosPAEFI) || 0)
            };
          }),
          topViolations: violationsRaw.filter((v) => v.violacao && v.violacao.trim() !== "").map((v) => ({ label: v.violacao, count: v._count.violacao }))
        });
      }
      if (cargo === import_client19.Cargo.Auditor) {
        const incompleteCases = await prisma.case.findMany({
          where: {
            status: { not: import_client19.CaseStatus.DESLIGADO },
            OR: [{ cpf: null }, { cpf: "" }, { endereco: null }, { endereco: "" }]
          },
          take: 20,
          select: { id: true, nomeCompleto: true, cpf: true, endereco: true }
        });
        const recentLogs = await prisma.caseLog.findMany({
          where: { acao: { in: [import_client19.LogAction.DESLIGAMENTO, import_client19.LogAction.OUTRO, import_client19.LogAction.MUDANCA_STATUS] } },
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            // Select explícito para bater com logSchema
            id: true,
            acao: true,
            createdAt: true,
            autor: { select: { nome: true } }
          }
        });
        const formattedLogs = recentLogs.map((log) => ({
          ...log,
          acao: log.acao.toString()
        }));
        return reply.send({ role: "AUDITOR", incompleteCases, recentLogs: formattedLogs });
      }
      const isEspecialista = cargo === import_client19.Cargo.Especialista;
      const caseFilter = isEspecialista ? { especialistaPAEFIId: userId, status: { not: import_client19.CaseStatus.DESLIGADO } } : { agenteAcolhidaId: userId, status: { in: [import_client19.CaseStatus.EM_ACOLHIDA, import_client19.CaseStatus.AGUARDANDO_ACOLHIDA] } };
      const myCases = await prisma.case.findMany({
        where: caseFilter,
        orderBy: [{ pesoUrgencia: "desc" }, { updatedAt: "desc" }],
        select: {
          id: true,
          nomeCompleto: true,
          status: true,
          urgencia: true,
          violacao: true,
          updatedAt: true,
          dataEntrada: true
        }
      });
      let detailedStats = {};
      if (isEspecialista) {
        const stats = await prisma.case.groupBy({
          by: ["status"],
          where: { especialistaPAEFIId: userId, status: { not: import_client19.CaseStatus.DESLIGADO } },
          _count: { _all: true }
        });
        detailedStats = {
          monitoramento: ((_a = stats.find((s) => s.status === import_client19.CaseStatus.EM_MONITORAMENTO)) == null ? void 0 : _a._count._all) || 0,
          acolhidaEsp: ((_b = stats.find((s) => s.status === import_client19.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA)) == null ? void 0 : _b._count._all) || 0,
          // [ATUALIZAÇÃO] Enum corrigido
          acompanhamento: ((_c = stats.find((s) => s.status === import_client19.CaseStatus.EM_ACOMPANHAMENTO)) == null ? void 0 : _c._count._all) || 0
        };
      } else {
        const stats = await prisma.case.groupBy({
          by: ["status"],
          where: { agenteAcolhidaId: userId },
          _count: { _all: true }
        });
        const generalQueue = await prisma.case.count({
          where: { status: import_client19.CaseStatus.AGUARDANDO_ACOLHIDA, agenteAcolhidaId: null }
        });
        detailedStats = {
          meusAguardando: ((_d = stats.find((s) => s.status === import_client19.CaseStatus.AGUARDANDO_ACOLHIDA)) == null ? void 0 : _d._count._all) || 0,
          meusEmAtendimento: ((_e = stats.find((s) => s.status === import_client19.CaseStatus.EM_ACOLHIDA)) == null ? void 0 : _e._count._all) || 0,
          filaGeral: generalQueue
        };
      }
      const caseIds = myCases.map((c) => c.id);
      let evoMap = /* @__PURE__ */ new Map();
      if (caseIds.length > 0) {
        const lastEvolutions = await prisma.evolucao.findMany({
          where: { casoId: { in: caseIds } },
          orderBy: { createdAt: "desc" },
          distinct: ["casoId"],
          select: { casoId: true, createdAt: true }
        });
        evoMap = new Map(lastEvolutions.map((e) => [e.casoId, e.createdAt]));
      }
      const alerts = myCases.map((c) => {
        const lastDate = evoMap.get(c.id);
        const dataEntrada = c.dataEntrada ? new Date(c.dataEntrada) : /* @__PURE__ */ new Date();
        if (isEspecialista) {
          if (!lastDate) return { ...c, type: "PAF_NOT_STARTED" /* PAF_NOT_STARTED */, days: 0 };
          if ((0, import_date_fns8.isValid)(new Date(lastDate))) {
            if (lastDate < thirtyDaysAgo && lastDate >= ninetyDaysAgo)
              return { ...c, type: "PAF_STALLED" /* PAF_STALLED */, days: (0, import_date_fns8.differenceInDays)(/* @__PURE__ */ new Date(), lastDate) };
            if (lastDate < ninetyDaysAgo)
              return { ...c, type: "PAF_REVIEW_OVERDUE" /* PAF_REVIEW_OVERDUE */, days: (0, import_date_fns8.differenceInDays)(/* @__PURE__ */ new Date(), lastDate) };
          }
        } else {
          if (c.status === import_client19.CaseStatus.AGUARDANDO_ACOLHIDA && (0, import_date_fns8.differenceInDays)(/* @__PURE__ */ new Date(), dataEntrada) > 2) {
            return { ...c, type: "NOT_STARTED_YET" /* NOT_STARTED_YET */, days: (0, import_date_fns8.differenceInDays)(/* @__PURE__ */ new Date(), dataEntrada) };
          }
          if (c.status === import_client19.CaseStatus.EM_ACOLHIDA && !lastDate && (0, import_date_fns8.differenceInDays)(/* @__PURE__ */ new Date(), dataEntrada) > 5) {
            return { ...c, type: "RECEPTION_DELAY" /* RECEPTION_DELAY */, days: (0, import_date_fns8.differenceInDays)(/* @__PURE__ */ new Date(), dataEntrada) };
          }
        }
        return null;
      }).filter(Boolean);
      return reply.send({
        role: cargo.toUpperCase(),
        appointments,
        myCases,
        alerts,
        // Cast simples para satisfazer o union do alertSchema
        detailedStats
      });
    } catch (error) {
      console.error("[WORKSPACE_ERROR]", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
  server.get("/workspace/undistributed", {
    schema: {
      tags: ["Workspace"],
      summary: "Listar casos aguardando distribui\xE7\xE3o",
      response: {
        200: import_zod18.z.array(import_zod18.z.object({
          id: import_zod18.z.string(),
          nomeCompleto: import_zod18.z.string(),
          status: import_zod18.z.string(),
          urgencia: import_zod18.z.string(),
          dataEntrada: import_zod18.z.date()
        }))
      }
    }
  }, async (req, reply) => {
    const cases = await prisma.case.findMany({
      where: {
        OR: [
          // Casos novos sem agente
          { status: import_client19.CaseStatus.AGUARDANDO_ACOLHIDA, agenteAcolhidaId: null },
          // Casos PAEFI sem especialista
          { status: import_client19.CaseStatus.AGUARDANDO_DISTRIBUICAO_PAEFI, especialistaPAEFIId: null }
        ]
      },
      orderBy: { dataEntrada: "asc" },
      select: {
        id: true,
        nomeCompleto: true,
        status: true,
        urgencia: true,
        dataEntrada: true
      }
    });
    return reply.send(cases);
  });
  server.patch("/workspace/distribute", {
    schema: {
      tags: ["Workspace"],
      summary: "Atribuir caso a um t\xE9cnico",
      body: import_zod18.z.object({
        caseId: import_zod18.z.string().uuid(),
        targetUserId: import_zod18.z.string().uuid(),
        roleType: import_zod18.z.enum(["AGENTE", "ESPECIALISTA"])
      })
    }
  }, async (req, reply) => {
    const { caseId, targetUserId, roleType } = req.body;
    const managerId = req.user.sub;
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, nome: true, cargo: true, ativo: true }
    });
    if (!targetUser || !targetUser.ativo) {
      return reply.status(400).send({ message: "Usu\xE1rio inv\xE1lido ou inativo." });
    }
    const dataToUpdate = {};
    if (roleType === "AGENTE") {
      if (targetUser.cargo !== import_client19.Cargo.Agente_Social) return reply.status(400).send({ message: "Usu\xE1rio n\xE3o \xE9 Agente Social." });
      dataToUpdate.agenteAcolhidaId = targetUserId;
      dataToUpdate.status = import_client19.CaseStatus.EM_ACOLHIDA;
    } else {
      if (targetUser.cargo !== import_client19.Cargo.Especialista) return reply.status(400).send({ message: "Usu\xE1rio n\xE3o \xE9 Especialista." });
      dataToUpdate.especialistaPAEFIId = targetUserId;
      dataToUpdate.status = import_client19.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA;
    }
    await prisma.$transaction(async (tx) => {
      await tx.case.update({ where: { id: caseId }, data: dataToUpdate });
      await tx.caseLog.create({
        data: {
          casoId: caseId,
          autorId: managerId,
          acao: import_client19.LogAction.ATRIBUICAO,
          descricao: `Caso atribu\xEDdo para ${targetUser.nome} (${roleType})`
        }
      });
    });
    return reply.send({ message: "Caso distribu\xEDdo com sucesso." });
  });
}

// src/routes/waitingList.ts
var import_zod19 = require("zod");
var import_client20 = require("@prisma/client");
var waitingCaseSchema = import_zod19.z.object({
  id: import_zod19.z.string(),
  nomeCompleto: import_zod19.z.string(),
  dataEntrada: import_zod19.z.date(),
  urgencia: import_zod19.z.string(),
  pesoUrgencia: import_zod19.z.number(),
  violacao: import_zod19.z.string(),
  status: import_zod19.z.string(),
  agenteAcolhida: import_zod19.z.object({ nome: import_zod19.z.string() }).nullable().optional(),
  especialistaPAEFI: import_zod19.z.object({ nome: import_zod19.z.string() }).nullable().optional()
});
var assignBodySchema = import_zod19.z.object({
  targetUserId: import_zod19.z.string().uuid().optional()
  // Obrigatório apenas para Gerente distribuindo
});
async function waitingListRoutes(app2) {
  const server = app2.withTypeProvider();
  server.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado" });
    }
  });
  server.get("/cases/waiting", {
    schema: {
      tags: ["Fila de Espera"],
      summary: "Listar casos parados aguardando a\xE7\xE3o do usu\xE1rio logado",
      response: {
        200: import_zod19.z.array(waitingCaseSchema)
      }
    }
  }, async (req, reply) => {
    const { sub: userId, cargo } = req.user;
    try {
      let whereCondition = { deletado: false };
      if (cargo === import_client20.Cargo.Agente_Social) {
        whereCondition.status = import_client20.CaseStatus.AGUARDANDO_ACOLHIDA;
        whereCondition.agenteAcolhidaId = userId;
      } else if (cargo === import_client20.Cargo.Gerente) {
        whereCondition.status = import_client20.CaseStatus.AGUARDANDO_DISTRIBUICAO;
      } else if (cargo === import_client20.Cargo.Especialista) {
        whereCondition.status = import_client20.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA;
        whereCondition.especialistaPAEFIId = userId;
      } else if (cargo === import_client20.Cargo.Auditor) {
        whereCondition.status = {
          in: [
            import_client20.CaseStatus.AGUARDANDO_ACOLHIDA,
            import_client20.CaseStatus.AGUARDANDO_DISTRIBUICAO,
            import_client20.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA
          ]
        };
      } else {
        return reply.send([]);
      }
      const cases = await prisma.case.findMany({
        where: whereCondition,
        orderBy: [
          { pesoUrgencia: "desc" },
          // 1º Prioridade: Urgência
          { dataEntrada: "asc" }
          // 2º Prioridade: Antiguidade (FIFO)
        ],
        select: {
          id: true,
          nomeCompleto: true,
          dataEntrada: true,
          urgencia: true,
          pesoUrgencia: true,
          violacao: true,
          status: true,
          agenteAcolhida: { select: { nome: true } },
          especialistaPAEFI: { select: { nome: true } }
        }
      });
      return reply.send(cases);
    } catch (error) {
      console.error("[WAITING_LIST_ERROR]", error);
      return reply.status(500).send({ message: "Erro ao buscar fila de espera." });
    }
  });
  server.patch("/cases/waiting/:id/assign", {
    schema: {
      tags: ["Fila de Espera"],
      summary: "Realizar a\xE7\xE3o da fila (Iniciar Acolhida, Distribuir ou Iniciar Acompanhamento)",
      params: import_zod19.z.object({ id: import_zod19.z.string().uuid() }),
      body: assignBodySchema,
      response: {
        200: import_zod19.z.object({ status: import_zod19.z.string() })
        // Retorna apenas o novo status
      }
    }
  }, async (req, reply) => {
    const { id } = req.params;
    const { targetUserId } = req.body;
    const { sub: userId, cargo } = req.user;
    try {
      const existingCase = await prisma.case.findUnique({ where: { id } });
      if (!existingCase) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
      let updateData = {};
      let logDescricao = "";
      let logAction = import_client20.LogAction.MUDANCA_STATUS;
      if (cargo === import_client20.Cargo.Agente_Social && existingCase.status === import_client20.CaseStatus.AGUARDANDO_ACOLHIDA) {
        if (existingCase.agenteAcolhidaId !== userId) {
          return reply.status(403).send({ message: "Este caso n\xE3o foi atribu\xEDdo a voc\xEA." });
        }
        updateData = { status: import_client20.CaseStatus.EM_ACOLHIDA };
        logDescricao = "Iniciou a Acolhida (Check-in)";
      } else if (cargo === import_client20.Cargo.Gerente && existingCase.status === import_client20.CaseStatus.AGUARDANDO_DISTRIBUICAO) {
        if (!targetUserId) return reply.status(400).send({ message: "Selecione um especialista para assumir o caso." });
        updateData = {
          status: import_client20.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA,
          // Próximo passo: Especialista aceitar
          especialistaPAEFIId: targetUserId
        };
        const targetUser = await prisma.user.findUnique({ where: { id: targetUserId }, select: { nome: true } });
        logAction = import_client20.LogAction.ATRIBUICAO;
        logDescricao = `Distribuiu caso para: ${(targetUser == null ? void 0 : targetUser.nome) || "Especialista"}`;
      } else if (cargo === import_client20.Cargo.Especialista && existingCase.status === import_client20.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA) {
        if (existingCase.especialistaPAEFIId !== userId) {
          return reply.status(403).send({ message: "Este caso n\xE3o foi atribu\xEDdo a voc\xEA." });
        }
        updateData = {
          status: import_client20.CaseStatus.EM_ACOMPANHAMENTO,
          dataInicioPAEFI: /* @__PURE__ */ new Date()
          // Marca o início oficial do acompanhamento
        };
        logDescricao = "Iniciou Acompanhamento PAEFI (Aceite)";
      } else {
        return reply.status(400).send({ message: "A\xE7\xE3o n\xE3o permitida para o status atual ou seu cargo." });
      }
      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.case.update({
          where: { id },
          data: updateData,
          select: { status: true }
          // Retorno leve
        });
        await tx.caseLog.create({
          data: {
            casoId: id,
            autorId: userId,
            acao: logAction,
            descricao: logDescricao,
            valorAnterior: existingCase.status,
            valorNovo: updated.status
          }
        });
        return updated;
      });
      return reply.send(result);
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ message: "Erro ao processar a\xE7\xE3o na fila." });
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
        // Mostra a hora legível
        ignore: "pid,hostname",
        // Esconde ID do processo e nome da máquina (poluição visual)
        colorize: true
        // Força as cores
      }
    }
  }
}).withTypeProvider();
app.setValidatorCompiler(import_fastify_type_provider_zod.validatorCompiler);
app.setSerializerCompiler(import_fastify_type_provider_zod.serializerCompiler);
app.register(import_swagger.default, {
  openapi: {
    info: {
      title: "CREAS Brazl\xE2ndia API",
      description: "Sistema de Gest\xE3o de Atendimentos Social (SGAC)",
      version: "7.1.0"
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    }
  },
  transform: import_fastify_type_provider_zod.jsonSchemaTransform
});
app.register(import_swagger_ui.default, {
  routePrefix: "/docs"
});
var uploadDir = import_path2.default.join(__dirname, "../uploads");
if (!import_fs2.default.existsSync(uploadDir)) import_fs2.default.mkdirSync(uploadDir, { recursive: true });
app.register(import_multipart.default, {
  limits: { fileSize: 5 * 1024 * 1024 }
  // Limite de 5MB
});
app.register(import_static.default, {
  root: uploadDir,
  prefix: "/uploads/",
  decorateReply: false
});
var frontendDist = import_path2.default.join(__dirname, "../../frontend/dist");
app.register(import_static.default, {
  root: frontendDist,
  prefix: "/",
  wildcard: false
  // Desativa wildcard automático para tratarmos SPA manualmente abaixo
});
app.register(import_cors.default, {
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
});
app.register(import_jwt.default, {
  secret: process.env.JWT_SECRET
});
app.decorate("authenticate", async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
});
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
app.register(workspaceRoutes);
app.register(waitingListRoutes);
app.setNotFoundHandler((req, reply) => {
  if (req.raw.url && (req.raw.url.startsWith("/api") || req.raw.url.startsWith("/uploads") || req.raw.url.startsWith("/docs"))) {
    return reply.status(404).send({
      message: "Recurso n\xE3o encontrado",
      url: req.raw.url
    });
  }
  return reply.sendFile("index.html", frontendDist);
});
var port = Number(process.env.PORT) || 3333;
var host = "0.0.0.0";
app.listen({ port, host }).then(() => {
  console.log(`\u{1F680} Servidor rodando na porta ${port}`);
  console.log(`\u{1F4DA} Documenta\xE7\xE3o dispon\xEDvel em http://localhost:${port}/docs`);
});
