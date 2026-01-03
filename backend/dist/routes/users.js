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
  // Habilite logs apenas se quiser debugar queries lentas ou erros
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/users.ts
var import_client2 = require("@prisma/client");
var import_bcryptjs = __toESM(require("bcryptjs"));
async function userRoutes(app) {
  app.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      await reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app.post("/users", async (request, reply) => {
    const { cargo } = request.user;
    const userRole = cargo === "Agente Social" ? import_client2.Cargo.Agente_Social : cargo;
    if (userRole !== import_client2.Cargo.Gerente) {
      return reply.status(403).send({ message: "Apenas gerentes podem cadastrar novos servidores." });
    }
    const schema = import_zod.z.object({
      nome: import_zod.z.string().min(3),
      email: import_zod.z.string().email(),
      matricula: import_zod.z.string().optional(),
      cargo: import_zod.z.nativeEnum(import_client2.Cargo),
      // Espera: 'Gerente', 'Agente_Social', 'Especialista'
      senhaInicial: import_zod.z.string().min(6).default("123456")
    });
    try {
      const rawBody = request.body;
      if (rawBody.cargo === "Agente Social") rawBody.cargo = import_client2.Cargo.Agente_Social;
      const data = schema.parse(rawBody);
      const userExists = await prisma.user.findUnique({ where: { email: data.email } });
      if (userExists) return reply.status(409).send({ message: "E-mail j\xE1 cadastrado." });
      const passwordHash = await import_bcryptjs.default.hash(data.senhaInicial, 6);
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
  app.patch("/users/me/password", async (request, reply) => {
    const schema = import_zod.z.object({
      senhaAtual: import_zod.z.string(),
      novaSenha: import_zod.z.string().min(6)
    });
    try {
      const { senhaAtual, novaSenha } = schema.parse(request.body);
      const userId = request.user.sub;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return reply.status(404).send({ message: "Usu\xE1rio n\xE3o encontrado." });
      let isPasswordValid = false;
      try {
        isPasswordValid = await import_bcryptjs.default.compare(senhaAtual, user.senha);
      } catch (e) {
        isPasswordValid = false;
      }
      if (!isPasswordValid && senhaAtual === user.senha) {
        isPasswordValid = true;
      }
      if (!isPasswordValid) {
        return reply.status(400).send({ message: "A senha atual est\xE1 incorreta." });
      }
      const newPasswordHash = await import_bcryptjs.default.hash(novaSenha, 6);
      await prisma.user.update({
        where: { id: userId },
        data: { senha: newPasswordHash }
      });
      return reply.send({ message: "Senha alterada com sucesso!" });
    } catch (error) {
      return reply.status(400).send({ message: "Erro ao alterar senha." });
    }
  });
  app.get("/users", async (request, reply) => {
    const { sub: userId, cargo } = request.user;
    const userRole = cargo === "Agente Social" ? import_client2.Cargo.Agente_Social : cargo;
    if (userRole !== import_client2.Cargo.Gerente) {
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
  app.get("/users/agents", async (request, reply) => {
    try {
      const agents = await prisma.user.findMany({
        where: {
          cargo: import_client2.Cargo.Agente_Social,
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
  app.get("/users/specialists", async (request, reply) => {
    try {
      const specialists = await prisma.user.findMany({
        where: {
          cargo: import_client2.Cargo.Especialista,
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
  app.put("/users/:id", async (request, reply) => {
    const { cargo } = request.user;
    const userRole = cargo === "Agente Social" ? import_client2.Cargo.Agente_Social : cargo;
    if (userRole !== import_client2.Cargo.Gerente) {
      return reply.status(403).send({ message: "Acesso negado." });
    }
    const paramsSchema = import_zod.z.object({ id: import_zod.z.string().uuid() });
    const bodySchema = import_zod.z.object({
      nome: import_zod.z.string().min(3),
      email: import_zod.z.string().email(),
      cargo: import_zod.z.nativeEnum(import_client2.Cargo),
      matricula: import_zod.z.string().optional()
    });
    try {
      const { id } = paramsSchema.parse(request.params);
      const rawData = request.body;
      let cargoValue = rawData.cargo;
      if (cargoValue === "Agente Social") cargoValue = import_client2.Cargo.Agente_Social;
      if (cargoValue === "Especialista") cargoValue = import_client2.Cargo.Especialista;
      if (cargoValue === "Gerente") cargoValue = import_client2.Cargo.Gerente;
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
  app.delete("/users/:id", async (request, reply) => {
    const { cargo } = request.user;
    const userRole = cargo === "Agente Social" ? import_client2.Cargo.Agente_Social : cargo;
    if (userRole !== import_client2.Cargo.Gerente) {
      return reply.status(403).send({ message: "Acesso negado." });
    }
    const paramsSchema = import_zod.z.object({ id: import_zod.z.string().uuid() });
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  userRoutes
});
