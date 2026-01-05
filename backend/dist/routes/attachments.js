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

// src/routes/attachments.ts
var attachments_exports = {};
__export(attachments_exports, {
  attachmentRoutes: () => attachmentRoutes
});
module.exports = __toCommonJS(attachments_exports);

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var globalForPrisma = global;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient({
  log: ["error"]
  // Reduzi logs para limpar o terminal, use ['query'] para debug
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/attachments.ts
var import_zod = require("zod");
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_node_crypto = require("crypto");
var import_client2 = require("@prisma/client");
var UPLOAD_DIR = import_path.default.resolve(process.cwd(), "uploads");
if (!import_fs.default.existsSync(UPLOAD_DIR)) {
  import_fs.default.mkdirSync(UPLOAD_DIR, { recursive: true });
}
async function validateFileSignature(buffer) {
  const bytes = buffer.subarray(0, 4).toString("hex").toUpperCase();
  const signatures = {
    "25504446": ["pdf"],
    "FFD8FFE0": ["image"],
    "FFD8FFE1": ["image"],
    "FFD8FFEE": ["image"],
    "FFD8FFDB": ["image"],
    "89504E47": ["image"]
  };
  for (const [sig, types] of Object.entries(signatures)) {
    if (bytes.startsWith(sig)) return types[0];
  }
  return null;
}
async function attachmentRoutes(app) {
  app.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app.get("/cases/:caseId/attachments", async (request, reply) => {
    const paramsSchema = import_zod.z.object({ caseId: import_zod.z.string().uuid() });
    const params = paramsSchema.parse(request.params);
    const caseId = params.caseId;
    const attachments = await prisma.anexo.findMany({
      where: { casoId: caseId },
      orderBy: { createdAt: "desc" },
      include: { autor: { select: { nome: true } } }
    });
    const host = request.protocol + "://" + request.hostname;
    const serialized = attachments.map((a) => ({
      ...a,
      url: `${host}/uploads/${a.url}`
    }));
    return reply.send(serialized);
  });
  app.post("/attachments", async (request, reply) => {
    if (!request.isMultipart()) {
      return reply.status(400).send({ message: "Requisi\xE7\xE3o deve ser multipart/form-data" });
    }
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ message: "Nenhum arquivo enviado." });
    }
    const buffer = await data.toBuffer();
    const fileType = await validateFileSignature(buffer);
    if (!fileType) {
      return reply.status(400).send({ message: "Tipo de arquivo inv\xE1lido. Apenas PDF e Imagens (JPG/PNG)." });
    }
    const querySchema = import_zod.z.object({ casoId: import_zod.z.string().uuid() });
    let casoId;
    try {
      const query = querySchema.parse(request.query);
      casoId = query.casoId;
    } catch {
      return reply.status(400).send({ message: "casoId \xE9 obrigat\xF3rio na Query String (?casoId=uuid)" });
    }
    const ext = import_path.default.extname(data.filename).toLowerCase();
    const safeFileName = `${(0, import_node_crypto.randomUUID)()}${ext}`;
    const filePath = import_path.default.join(UPLOAD_DIR, safeFileName);
    try {
      import_fs.default.writeFileSync(filePath, buffer);
    } catch (e) {
      return reply.status(500).send({ message: "Erro ao gravar arquivo no disco." });
    }
    const { sub: userId } = request.user;
    const anexo = await prisma.anexo.create({
      data: {
        nome: data.filename,
        tipo: fileType,
        url: safeFileName,
        tamanho: buffer.length,
        casoId,
        autorId: userId
      }
    });
    try {
      await prisma.caseLog.create({
        data: {
          casoId,
          autorId: userId,
          acao: import_client2.LogAction.ANEXO_ADICIONADO,
          descricao: `Anexo adicionado: ${data.filename}`
        }
      });
    } catch (error) {
      console.warn("Falha ao criar log de anexo:", error);
    }
    return reply.status(201).send(anexo);
  });
  app.delete("/attachments/:id", async (request, reply) => {
    const paramsSchema = import_zod.z.object({ id: import_zod.z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const { sub: userId, cargo } = request.user;
    const anexo = await prisma.anexo.findUnique({ where: { id } });
    if (!anexo) return reply.status(404).send({ message: "Arquivo n\xE3o encontrado." });
    if (anexo.autorId !== userId && cargo !== import_client2.Cargo.Gerente && cargo !== import_client2.Cargo.Coordenador) {
      return reply.status(403).send({ message: "Sem permiss\xE3o." });
    }
    await prisma.anexo.delete({ where: { id } });
    try {
      const filePath = import_path.default.join(UPLOAD_DIR, anexo.url);
      if (import_fs.default.existsSync(filePath)) {
        import_fs.default.unlinkSync(filePath);
      }
    } catch (e) {
      console.warn("Arquivo f\xEDsico n\xE3o encontrado ou erro ao apagar:", e);
    }
    try {
      await prisma.caseLog.create({
        data: {
          casoId: anexo.casoId,
          autorId: userId,
          acao: import_client2.LogAction.OUTRO,
          descricao: `Anexo removido: ${anexo.nome}`
        }
      });
    } catch (e) {
    }
    return reply.status(204).send();
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  attachmentRoutes
});
