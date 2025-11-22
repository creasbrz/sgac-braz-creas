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

// src/routes/auth.ts
var auth_exports = {};
__export(auth_exports, {
  authRoutes: () => authRoutes
});
module.exports = __toCommonJS(auth_exports);
var import_zod = require("zod");

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var prisma = new import_client.PrismaClient();

// src/routes/auth.ts
var import_bcryptjs = __toESM(require("bcryptjs"));
async function authRoutes(app) {
  app.post("/register", async (request, reply) => {
    const registerBodySchema = import_zod.z.object({
      nome: import_zod.z.string(),
      email: import_zod.z.string().email(),
      senha: import_zod.z.string().min(6),
      cargo: import_zod.z.enum(["Gerente", "Agente Social", "Especialista"])
      //
    });
    try {
      const { nome, email, senha, cargo } = registerBodySchema.parse(
        request.body
      );
      const userExists = await prisma.user.findUnique({ where: { email } });
      if (userExists) {
        return await reply.status(409).send({ message: "Email j\xE1 registado." });
      }
      const hashedPassword = await import_bcryptjs.default.hash(senha, 8);
      const user = await prisma.user.create({
        data: {
          nome,
          email,
          senha: hashedPassword,
          cargo,
          ativo: true
          // Garante que o usuário registrado seja ativo
        }
      });
      return await reply.status(201).send({
        //
        message: "Utilizador criado com sucesso!",
        user: { id: user.id, nome: user.nome, email: user.email }
      });
    } catch (error) {
      request.log.error(error, "Erro ao registar utilizador");
      return await reply.status(500).send({ message: "Erro interno do servidor." });
    }
  });
  app.post("/login", async (request, reply) => {
    const loginBodySchema = import_zod.z.object({
      email: import_zod.z.string().email("Email inv\xE1lido."),
      senha: import_zod.z.string().min(6, "A senha deve ter no m\xEDnimo 6 caracteres.")
      //
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
      const isPasswordCorrect = await import_bcryptjs.default.compare(senha, user.senha);
      if (!isPasswordCorrect) {
        return await reply.status(401).send({ message: "Credenciais inv\xE1lidas." });
      }
      const token = app.jwt.sign(
        {
          // Payload (informações dentro do token)
          nome: user.nome,
          //
          cargo: user.cargo
          //
        },
        {
          // Metadados (informações sobre o token)
          sub: user.id,
          // 'sub' (subject) é o ID do usuário
          expiresIn: "7d"
          // Token expira em 7 dias
        }
      );
      return await reply.status(200).send({ token });
    } catch (error) {
      request.log.error(error, "Erro no processo de login");
      return await reply.status(500).send({ message: "Ocorreu um erro inesperado no servidor." });
    }
  });
  app.get(
    "/me",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const userId = request.user.sub;
      const user = await prisma.user.findUnique({
        where: { id: userId, ativo: true },
        // Garante que o usuário ainda está ativo
        select: {
          id: true,
          //
          nome: true,
          //
          email: true,
          //
          cargo: true
          //
        }
      });
      if (!user) {
        return await reply.status(404).send({ message: "Utilizador n\xE3o encontrado." });
      }
      return await reply.status(200).send(user);
    }
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  authRoutes
});
