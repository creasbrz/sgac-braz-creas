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
  // Habilite logs apenas se quiser debugar queries lentas ou erros
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/auth.ts
var import_bcryptjs = __toESM(require("bcryptjs"));
async function authRoutes(app) {
  app.post("/register", async (request, reply) => {
    const registerBodySchema = import_zod.z.object({
      nome: import_zod.z.string(),
      email: import_zod.z.string().email(),
      senha: import_zod.z.string().min(6),
      // Ajustado para garantir compatibilidade com o Enum do Prisma se necessário
      cargo: import_zod.z.enum(["Gerente", "Agente_Social", "Especialista", "Agente Social"])
    });
    try {
      const rawData = registerBodySchema.parse(request.body);
      const cargoMap = {
        "Agente Social": "Agente_Social"
        // Mapeamento de segurança
      };
      const cargoFinal = cargoMap[rawData.cargo] || rawData.cargo;
      const userExists = await prisma.user.findUnique({ where: { email: rawData.email } });
      if (userExists) {
        return await reply.status(409).send({ message: "Email j\xE1 registado." });
      }
      const hashedPassword = await import_bcryptjs.default.hash(rawData.senha, 8);
      const user = await prisma.user.create({
        data: {
          nome: rawData.nome,
          email: rawData.email,
          senha: hashedPassword,
          cargo: cargoFinal,
          ativo: true
        }
      });
      return await reply.status(201).send({
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
      senha: import_zod.z.string().min(1, "A senha \xE9 obrigat\xF3ria.")
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
      let isPasswordCorrect = false;
      try {
        isPasswordCorrect = await import_bcryptjs.default.compare(senha, user.senha);
      } catch (err) {
      }
      if (!isPasswordCorrect && senha === user.senha) {
        console.log(`\u26A0\uFE0F Aviso: Usu\xE1rio ${email} logou com senha n\xE3o criptografada.`);
        isPasswordCorrect = true;
      }
      if (!isPasswordCorrect) {
        return await reply.status(401).send({ message: "Credenciais inv\xE1lidas." });
      }
      const token = app.jwt.sign(
        {
          nome: user.nome,
          cargo: user.cargo
        },
        {
          sub: user.id,
          expiresIn: "7d"
        }
      );
      return await reply.status(200).send({
        token,
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          cargo: user.cargo,
          ativo: user.ativo
        }
      });
    } catch (error) {
      request.log.error(error, "Erro no processo de login");
      if (error instanceof import_zod.z.ZodError) {
        return reply.status(400).send({
          message: "Dados inv\xE1lidos",
          errors: error.flatten().fieldErrors
        });
      }
      return await reply.status(500).send({ message: "Ocorreu um erro inesperado no servidor." });
    }
  });
  app.get(
    "/me",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { sub: userId } = request.user;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          nome: true,
          email: true,
          cargo: true,
          ativo: true
        }
      });
      if (!user) return reply.status(404).send({ message: "Usu\xE1rio n\xE3o encontrado." });
      return reply.send(user);
    }
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  authRoutes
});
