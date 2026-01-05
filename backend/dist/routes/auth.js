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
  app.post("/register", async (request, reply) => {
    const registerBodySchema = import_zod.z.object({
      nome: import_zod.z.string().min(3),
      email: import_zod.z.string().email(),
      senha: import_zod.z.string().min(6),
      cargo: import_zod.z.string().transform((val) => {
        if (val === "Agente Social") return import_client2.Cargo.Agente_Social;
        return val;
      }),
      matricula: import_zod.z.string().optional()
    });
    try {
      const { nome, email, senha, cargo, matricula } = registerBodySchema.parse(request.body);
      const userExists = await prisma.user.findUnique({ where: { email } });
      if (userExists) return reply.status(409).send({ message: "Email j\xE1 registrado." });
      const hashedPassword = await import_bcryptjs.default.hash(senha, 8);
      const user = await prisma.user.create({
        data: { nome, email, senha: hashedPassword, cargo, matricula, ativo: true }
      });
      const { senha: _, ...userSafe } = user;
      return reply.status(201).send(userSafe);
    } catch (error) {
      return reply.status(400).send({ message: "Erro no registro", error });
    }
  });
  app.post("/login", async (request, reply) => {
    const loginBodySchema = import_zod.z.object({ email: import_zod.z.string().email(), senha: import_zod.z.string() });
    try {
      const { email, senha } = loginBodySchema.parse(request.body);
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return reply.status(401).send({ message: "Credenciais inv\xE1lidas." });
      if (!user.ativo) return reply.status(401).send({ message: "Usu\xE1rio desativado." });
      const isPasswordCorrect = await import_bcryptjs.default.compare(senha, user.senha);
      if (!isPasswordCorrect) return reply.status(401).send({ message: "Credenciais inv\xE1lidas." });
      const token = app.jwt.sign(
        { nome: user.nome, cargo: user.cargo, email: user.email },
        { sub: user.id, expiresIn: "7d" }
      );
      return reply.status(200).send({ token });
    } catch (error) {
      return reply.status(500).send({ message: "Erro interno no login." });
    }
  });
  app.get("/me", { onRequest: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.sub;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nome: true,
        email: true,
        cargo: true,
        matricula: true,
        ativo: true
        // Selecionamos o campo para checar depois
      }
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
