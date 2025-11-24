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

// src/routes/users.ts
var users_exports = {};
__export(users_exports, {
  userRoutes: () => userRoutes
});
module.exports = __toCommonJS(users_exports);
var import_zod = require("zod");

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var prisma = new import_client.PrismaClient();

// src/routes/users.ts
var import_client2 = require("@prisma/client");
async function userRoutes(app) {
  app.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      await reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app.get("/users", async (request, reply) => {
    const { sub: userId, cargo } = request.user;
    if (cargo !== import_client2.Cargo.Gerente) {
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
  app.get("/users/agents", async (request, reply) => {
    try {
      const agents = await prisma.user.findMany({
        where: {
          cargo: import_client2.Cargo.Agente_Social,
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
  app.get("/users/specialists", async (request, reply) => {
    try {
      const specialists = await prisma.user.findMany({
        where: {
          cargo: import_client2.Cargo.Especialista,
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
  app.put("/users/:id", async (request, reply) => {
    const { cargo } = request.user;
    if (cargo !== import_client2.Cargo.Gerente) {
      return reply.status(403).send({ message: "Acesso negado." });
    }
    const paramsSchema = import_zod.z.object({ id: import_zod.z.string().uuid() });
    const bodySchema = import_zod.z.object({
      nome: import_zod.z.string().min(3),
      email: import_zod.z.string().email(),
      cargo: import_zod.z.nativeEnum(import_client2.Cargo)
      // Valida se é "Gerente", "Agente_Social", etc.
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
          cargo: data.cargo
        }
      });
      return reply.status(200).send(updatedUser);
    } catch (error) {
      console.error("Erro ao atualizar usu\xE1rio:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
  app.delete("/users/:id", async (request, reply) => {
    const { cargo } = request.user;
    if (cargo !== import_client2.Cargo.Gerente) {
      return reply.status(403).send({ message: "Acesso negado." });
    }
    const paramsSchema = import_zod.z.object({ id: import_zod.z.string().uuid() });
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  userRoutes
});
