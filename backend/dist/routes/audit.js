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
var globalForPrisma = global;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient({
  log: ["error"]
  // Reduzi logs para limpar o terminal, use ['query'] para debug
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/audit.ts
var import_date_fns = require("date-fns");
var import_client2 = require("@prisma/client");
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
      page: import_zod.z.coerce.number().default(1),
      pageSize: import_zod.z.coerce.number().default(20),
      search: import_zod.z.string().optional(),
      // Busca textual
      autorId: import_zod.z.string().optional(),
      // Filtro por Técnico
      acao: import_zod.z.nativeEnum(import_client2.LogAction).optional(),
      // Filtro por Tipo de Ação
      periodo: import_zod.z.enum(["hoje", "7dias", "30dias", "todo"]).default("7dias")
    });
    const { page, pageSize, search, autorId, acao, periodo } = querySchema.parse(request.query);
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
      where.createdAt = { gte: (0, import_date_fns.startOfDay)(hoje), lte: (0, import_date_fns.endOfDay)(hoje) };
    } else if (periodo === "7dias") {
      where.createdAt = { gte: (0, import_date_fns.startOfDay)((0, import_date_fns.subDays)(hoje, 7)) };
    } else if (periodo === "30dias") {
      where.createdAt = { gte: (0, import_date_fns.startOfDay)((0, import_date_fns.subDays)(hoje, 30)) };
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
  app.get("/audit/stats", async (request, reply) => {
    const todayStart = (0, import_date_fns.startOfDay)(/* @__PURE__ */ new Date());
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  auditRoutes
});
