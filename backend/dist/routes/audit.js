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
var logResponseSchema = import_zod.z.object({
  id: import_zod.z.string().uuid(),
  acao: import_zod.z.nativeEnum(import_client2.LogAction),
  descricao: import_zod.z.string(),
  createdAt: import_zod.z.date(),
  valorAnterior: import_zod.z.string().nullable(),
  valorNovo: import_zod.z.string().nullable(),
  autor: import_zod.z.object({
    nome: import_zod.z.string(),
    cargo: import_zod.z.string(),
    email: import_zod.z.string()
  }),
  caso: import_zod.z.object({
    id: import_zod.z.string(),
    nomeCompleto: import_zod.z.string()
  }).nullable().optional()
  // Pode ser null se o caso foi deletado fisicamente (raro) ou log de sistema
});
var auditQuerySchema = import_zod.z.object({
  page: import_zod.z.coerce.number().default(1),
  pageSize: import_zod.z.coerce.number().default(20),
  search: import_zod.z.string().optional(),
  autorId: import_zod.z.string().optional(),
  acao: import_zod.z.nativeEnum(import_client2.LogAction).optional(),
  periodo: import_zod.z.enum(["hoje", "7dias", "30dias", "todo"]).default("7dias")
});
async function auditRoutes(app) {
  const server = app.withTypeProvider();
  server.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
      const { cargo } = request.user;
      if (cargo !== import_client2.Cargo.Gerente) {
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
        200: import_zod.z.object({
          data: import_zod.z.array(logResponseSchema),
          meta: import_zod.z.object({
            page: import_zod.z.number(),
            pageSize: import_zod.z.number(),
            total: import_zod.z.number(),
            totalPages: import_zod.z.number()
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
        200: import_zod.z.array(import_zod.z.object({
          acao: import_zod.z.nativeEnum(import_client2.LogAction),
          _count: import_zod.z.object({ _all: import_zod.z.number() })
        }))
      }
    }
  }, async (request, reply) => {
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
