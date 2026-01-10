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
var globalForPrisma = global;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient({
  log: ["error"]
  // Reduzi logs para limpar o terminal, use ['query'] para debug
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/auth.ts
var import_bcryptjs = __toESM(require("bcryptjs"));
var import_client2 = require("@prisma/client");
async function authRoutes(app) {
  const server = app.withTypeProvider();
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
    const token = app.jwt.sign(
      { nome: user.nome, cargo: user.cargo, email: user.email },
      { sub: user.id, expiresIn: "7d" }
    );
    return reply.status(200).send({ token });
  });
  server.get("/me", {
    onRequest: [app.authenticate],
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  authRoutes
});
