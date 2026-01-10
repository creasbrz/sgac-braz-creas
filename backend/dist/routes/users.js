var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/routes/users.ts
var users_exports = {};
__export(users_exports, {
  userRoutes: () => userRoutes
});
module.exports = __toCommonJS(users_exports);
var import_zod = require("zod");

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var globalForPrisma = global;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient({
  log: ["error"]
  // Reduzi logs para limpar o terminal, use ['query'] para debug
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/users.ts
var import_client2 = require("@prisma/client");
var import_bcryptjs = __toESM(require("bcryptjs"));
async function userRoutes(app) {
  const server = app.withTypeProvider();
  const userResponseSchema = import_zod.z.object({
    id: import_zod.z.string().uuid(),
    nome: import_zod.z.string(),
    email: import_zod.z.string().email(),
    cargo: import_zod.z.nativeEnum(import_client2.Cargo),
    matricula: import_zod.z.string().nullable().optional(),
    ativo: import_zod.z.boolean()
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
      body: import_zod.z.object({
        nome: import_zod.z.string().min(3),
        email: import_zod.z.string().email(),
        matricula: import_zod.z.string().optional(),
        // [CORREÇÃO] Simplificado para z.string() para não quebrar o Swagger
        // A transformação garante que o valor final seja um Cargo válido
        cargo: import_zod.z.string().transform((val) => {
          if (val === "Agente Social") return import_client2.Cargo.Agente_Social;
          if (Object.values(import_client2.Cargo).includes(val)) return val;
          throw new Error("Cargo inv\xE1lido");
        }),
        senhaInicial: import_zod.z.string().min(6).default("123456")
      }),
      response: {
        201: userResponseSchema
      }
    }
  }, async (request, reply) => {
    const { cargo: userCargo } = request.user;
    if (userCargo !== import_client2.Cargo.Gerente) {
      return reply.status(403).send({ message: "Apenas gerentes podem cadastrar novos servidores." });
    }
    const { nome, email, matricula, cargo, senhaInicial } = request.body;
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      return reply.status(409).send({ message: "E-mail j\xE1 cadastrado." });
    }
    const passwordHash = await import_bcryptjs.default.hash(senhaInicial, 10);
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
      body: import_zod.z.object({
        senhaAtual: import_zod.z.string(),
        novaSenha: import_zod.z.string().min(6)
      }),
      response: {
        200: import_zod.z.object({ message: import_zod.z.string() })
      }
    }
  }, async (request, reply) => {
    const { senhaAtual, novaSenha } = request.body;
    const userId = request.user.sub;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return reply.status(404).send({ message: "Usu\xE1rio n\xE3o encontrado." });
    const isPasswordValid = await import_bcryptjs.default.compare(senhaAtual, user.senha);
    if (!isPasswordValid) {
      return reply.status(400).send({ message: "A senha atual est\xE1 incorreta." });
    }
    const newPasswordHash = await import_bcryptjs.default.hash(novaSenha, 10);
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
      querystring: import_zod.z.object({
        // [CORREÇÃO] Simplificado para z.string().optional()
        cargo: import_zod.z.string().optional(),
        active: import_zod.z.coerce.boolean().optional().default(true)
      }),
      response: {
        200: import_zod.z.array(userResponseSchema)
      }
    }
  }, async (request, reply) => {
    const { sub: userId } = request.user;
    const { cargo, active } = request.query;
    let cargoFilter;
    if (cargo) {
      if (cargo === "Agente Social") cargoFilter = import_client2.Cargo.Agente_Social;
      else if (Object.values(import_client2.Cargo).includes(cargo)) cargoFilter = cargo;
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
        200: import_zod.z.array(import_zod.z.object({ id: import_zod.z.string(), nome: import_zod.z.string() }))
      }
    }
  }, async (request, reply) => {
    const agents = await prisma.user.findMany({
      where: { cargo: import_client2.Cargo.Agente_Social, ativo: true },
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
        200: import_zod.z.array(import_zod.z.object({ id: import_zod.z.string(), nome: import_zod.z.string() }))
      }
    }
  }, async (request, reply) => {
    const specialists = await prisma.user.findMany({
      where: { cargo: import_client2.Cargo.Especialista, ativo: true },
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
      params: import_zod.z.object({ id: import_zod.z.string().uuid() }),
      body: import_zod.z.object({
        nome: import_zod.z.string().min(3),
        email: import_zod.z.string().email(),
        matricula: import_zod.z.string().optional(),
        // [CORREÇÃO] Simplificado para string + transform
        cargo: import_zod.z.string().transform((val) => {
          if (val === "Agente Social") return import_client2.Cargo.Agente_Social;
          if (Object.values(import_client2.Cargo).includes(val)) return val;
          throw new Error("Cargo inv\xE1lido");
        })
      }),
      response: {
        200: userResponseSchema
      }
    }
  }, async (request, reply) => {
    const { cargo: requestCargo } = request.user;
    if (requestCargo !== import_client2.Cargo.Gerente) {
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
      params: import_zod.z.object({ id: import_zod.z.string().uuid() }),
      response: {
        204: import_zod.z.null()
      }
    }
  }, async (request, reply) => {
    const { cargo } = request.user;
    if (cargo !== import_client2.Cargo.Gerente) {
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  userRoutes
});
