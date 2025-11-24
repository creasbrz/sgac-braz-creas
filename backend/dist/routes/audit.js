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

// src/routes/audit.ts
var audit_exports = {};
__export(audit_exports, {
  auditRoutes: () => auditRoutes
});
module.exports = __toCommonJS(audit_exports);
var import_zod = require("zod");

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var prisma = new import_client.PrismaClient();

// src/routes/audit.ts
var import_date_fns = require("date-fns");
async function auditRoutes(app) {
  app.addHook("onRequest", async (request, reply) => {
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
  app.get("/audit", async (request, reply) => {
    const querySchema = import_zod.z.object({
      page: import_zod.z.coerce.number().int().positive().default(1),
      pageSize: import_zod.z.coerce.number().int().positive().max(100).default(20),
      autorId: import_zod.z.string().uuid().optional(),
      acao: import_zod.z.string().optional(),
      // Ex: CRIACAO, DESLIGAMENTO, ATRIBUICAO
      periodo: import_zod.z.enum(["hoje", "7dias", "30dias", "tudo"]).default("7dias"),
      caseId: import_zod.z.string().uuid().optional(),
      // 🔥 NOVO FILTRO
      search: import_zod.z.string().min(2).optional()
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
          where.createdAt = { gte: (0, import_date_fns.startOfDay)(hoje), lte: (0, import_date_fns.endOfDay)(hoje) };
          break;
        case "7dias":
          where.createdAt = { gte: (0, import_date_fns.startOfDay)((0, import_date_fns.subDays)(hoje, 7)) };
          break;
        case "30dias":
          where.createdAt = { gte: (0, import_date_fns.startOfDay)((0, import_date_fns.subDays)(hoje, 30)) };
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  auditRoutes
});
