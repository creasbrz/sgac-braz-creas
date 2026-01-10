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
var globalForPrisma = global;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient({
  log: ["error"]
  // Reduzi logs para limpar o terminal, use ['query'] para debug
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

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
var import_client2 = require("@prisma/client");
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
async function createLog(casoId, autorId, acao, descricao, valorAnterior, valorNovo) {
  prisma.caseLog.create({
    data: { casoId, autorId, acao, descricao, valorAnterior: valorAnterior ? String(valorAnterior) : null, valorNovo: valorNovo ? String(valorNovo) : null }
  }).catch((err) => console.error("Falha ao criar log:", err));
}
function buildActiveCaseWhereClause(user) {
  const cargo = user.cargo;
  if (cargo === import_client2.Cargo.Gerente) {
    return { status: import_client2.CaseStatus.AGUARDANDO_DISTRIBUICAO };
  }
  if (cargo === import_client2.Cargo.Agente_Social) {
    return {
      agenteAcolhidaId: user.sub,
      status: { in: [import_client2.CaseStatus.AGUARDANDO_ACOLHIDA, import_client2.CaseStatus.EM_ACOLHIDA] }
    };
  }
  if (cargo === import_client2.Cargo.Especialista) {
    return {
      especialistaPAEFIId: user.sub,
      status: {
        in: [import_client2.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, import_client2.CaseStatus.EM_ACOMPANHAMENTO, import_client2.CaseStatus.EM_MONITORAMENTO]
      }
    };
  }
  return {};
}
var caseBaseSchema = import_zod.z.object({
  nomeCompleto: import_zod.z.string().min(3),
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
  origem: import_zod.z.nativeEnum(import_client2.CaseOrigin).default(import_client2.CaseOrigin.ESPONTANEA),
  agenteAcolhidaId: import_zod.z.string().uuid().nullable().optional(),
  numeroSei: import_zod.z.string().nullable().optional(),
  linkSei: import_zod.z.string().url().nullable().optional().or(import_zod.z.literal("")),
  observacoes: import_zod.z.string().nullable().optional()
});
async function caseRoutes(app) {
  const server = app.withTypeProvider();
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
        201: import_zod.z.object({ id: import_zod.z.string(), nomeCompleto: import_zod.z.string() })
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
    await createLog(novoCaso.id, userId, import_client2.LogAction.CRIACAO, `Caso criado via ${data.origem}`);
    return reply.status(201).send(novoCaso);
  });
  server.put("/cases/:id", {
    schema: {
      tags: ["Casos"],
      summary: "Editar dados cadastrais do caso",
      params: import_zod.z.object({ id: import_zod.z.string().uuid() }),
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
      await createLog(id, userId, import_client2.LogAction.OUTRO, `Editou ${keys.length} campos cadastrais.`, JSON.stringify(changes), null);
    }
    return reply.send(updatedCaso);
  });
  server.get("/cases", {
    schema: {
      tags: ["Casos"],
      summary: "Listar casos com pagina\xE7\xE3o e filtros avan\xE7ados",
      querystring: import_zod.z.object({
        search: import_zod.z.string().optional(),
        page: import_zod.z.coerce.number().min(1).default(1),
        pageSize: import_zod.z.coerce.number().min(1).max(100).default(10),
        status: import_zod.z.string().optional(),
        // Aceita "AGUARDANDO_ACOLHIDA,EM_ACOLHIDA"
        urgencia: import_zod.z.string().optional(),
        violacao: import_zod.z.string().optional(),
        categoria: import_zod.z.string().optional(),
        sexo: import_zod.z.string().optional(),
        view: import_zod.z.enum(["my", "all"]).default("my").optional(),
        sortBy: import_zod.z.string().optional(),
        sortOrder: import_zod.z.enum(["asc", "desc"]).optional(),
        agenteId: import_zod.z.string().uuid().optional(),
        specialistId: import_zod.z.string().uuid().optional()
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
      where = { agenteAcolhidaId: agenteId, status: { in: [import_client2.CaseStatus.AGUARDANDO_ACOLHIDA, import_client2.CaseStatus.EM_ACOLHIDA] } };
    } else if (specialistId) {
      where = { especialistaPAEFIId: specialistId, status: { in: [import_client2.CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, import_client2.CaseStatus.EM_ACOMPANHAMENTO, import_client2.CaseStatus.EM_MONITORAMENTO] } };
    } else if (view === "all") {
      where = { status: { not: import_client2.CaseStatus.DESLIGADO } };
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
      const validStatuses = statusList.filter((s) => Object.values(import_client2.CaseStatus).includes(s));
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
      querystring: import_zod.z.object({
        search: import_zod.z.string().optional(),
        page: import_zod.z.coerce.number().min(1).default(1),
        pageSize: import_zod.z.coerce.number().min(1).max(100).default(10)
      })
    }
  }, async (request, reply) => {
    const { search, page, pageSize } = request.query;
    const where = { status: import_client2.CaseStatus.DESLIGADO };
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
      params: import_zod.z.object({ id: import_zod.z.string().uuid() })
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
      params: import_zod.z.object({ id: import_zod.z.string().uuid() }),
      body: import_zod.z.object({ status: import_zod.z.nativeEnum(import_client2.CaseStatus) })
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { status } = request.body;
    const { sub: userId } = request.user;
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
  });
  server.patch("/cases/:id/assign", {
    schema: {
      tags: ["Casos"],
      summary: "Atribuir caso a um especialista (Gerente)",
      params: import_zod.z.object({ id: import_zod.z.string().uuid() }),
      body: import_zod.z.object({ specialistId: import_zod.z.string().uuid() })
    }
  }, async (request, reply) => {
    var _a;
    const { id } = request.params;
    const { specialistId } = request.body;
    const { cargo, sub: userId } = request.user;
    if (cargo !== import_client2.Cargo.Gerente) return reply.status(403).send({ message: "Acesso negado." });
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
    await createLog(id, userId, import_client2.LogAction.ATRIBUICAO, `Atribuiu a ${(spec == null ? void 0 : spec.nome) || "Desconhecido"}`, oldName, spec == null ? void 0 : spec.nome);
    return reply.send(updated);
  });
  server.patch("/cases/:id/close", {
    schema: {
      tags: ["Casos"],
      summary: "Encerrar/Desligar um caso",
      params: import_zod.z.object({ id: import_zod.z.string().uuid() }),
      body: import_zod.z.object({
        parecerFinal: import_zod.z.string().min(10),
        motivoDesligamento: import_zod.z.string().min(1),
        destinoDesligamento: import_zod.z.string().optional()
      })
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { parecerFinal, motivoDesligamento, destinoDesligamento } = request.body;
    const { sub: userId, cargo } = request.user;
    const caso = await prisma.case.findUnique({ where: { id } });
    if (!caso) return reply.status(404).send({ message: "Caso n\xE3o encontrado." });
    const isManager = cargo === import_client2.Cargo.Gerente;
    if (!isManager && caso.agenteAcolhidaId !== userId && caso.especialistaPAEFIId !== userId) {
      return reply.status(403).send({ message: "Sem permiss\xE3o para desligar este caso." });
    }
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
    await createLog(id, userId, import_client2.LogAction.DESLIGAMENTO, `Desligou: ${motivoDesligamento}`);
    return reply.send(updated);
  });
  server.get("/cases/export", {
    schema: {
      tags: ["Casos"],
      summary: "Exportar todos os dados para CSV (Gerente)"
    }
  }, async (request, reply) => {
    const { cargo } = request.user;
    if (cargo !== import_client2.Cargo.Gerente) return reply.status(403).send({ message: "Acesso negado." });
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  caseRoutes
});
