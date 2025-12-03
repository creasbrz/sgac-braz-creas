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
var prisma = new import_client.PrismaClient();

// src/routes/attachments.ts
var import_zod = require("zod");
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_client2 = require("@prisma/client");
async function validateFileSignature(buffer) {
  const bytes = buffer.subarray(0, 4).toString("hex").toUpperCase();
  const signatures = {
    "25504446": ["pdf"],
    // %PDF
    "FFD8FFE0": ["image"],
    // JPEG
    "FFD8FFE1": ["image"],
    // JPEG
    "FFD8FFEE": ["image"],
    // JPEG
    "FFD8FFDB": ["image"],
    // JPEG
    "89504E47": ["image"]
    // PNG
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
  app.post("/cases/:caseId/attachments", async (request, reply) => {
    const paramsSchema = import_zod.z.object({ caseId: import_zod.z.string().uuid() });
    try {
      const { caseId } = paramsSchema.parse(request.params);
      const { sub: userId } = request.user;
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ message: "Nenhum arquivo enviado." });
      }
      const buffer = await data.toBuffer();
      const fileType = await validateFileSignature(buffer);
      if (!fileType) {
        return reply.status(400).send({
          message: "Arquivo inv\xE1lido ou corrompido. Apenas PDF, JPG e PNG reais s\xE3o permitidos."
        });
      }
      const safeFilename = data.filename.replace(/[^a-zA-Z0-9.]/g, "_");
      const fileName = `${Date.now()}-${safeFilename}`;
      const uploadDir = import_path.default.resolve(process.cwd(), "uploads");
      if (!import_fs.default.existsSync(uploadDir)) {
        import_fs.default.mkdirSync(uploadDir, { recursive: true });
      }
      const uploadPath = import_path.default.join(uploadDir, fileName);
      import_fs.default.writeFileSync(uploadPath, buffer);
      const anexo = await prisma.anexo.create({
        data: {
          nome: data.filename,
          // Mantém nome original para exibição
          tipo: data.mimetype,
          url: `/uploads/${fileName}`,
          casoId: caseId,
          autorId: userId,
          tamanho: buffer.length
          // Salva o tamanho em bytes
        }
      });
      await prisma.caseLog.create({
        data: {
          casoId: caseId,
          autorId: userId,
          acao: import_client2.LogAction.ANEXO_ADICIONADO,
          descricao: `Anexou documento: ${data.filename}`
        }
      });
      return reply.status(201).send(anexo);
    } catch (error) {
      console.error("\u274C Erro no Upload:", error);
      return reply.status(500).send({ message: "Erro interno ao salvar arquivo." });
    }
  });
  app.get("/cases/:caseId/attachments", async (request, reply) => {
    const paramsSchema = import_zod.z.object({ caseId: import_zod.z.string().uuid() });
    try {
      const { caseId } = paramsSchema.parse(request.params);
      const anexos = await prisma.anexo.findMany({
        where: { casoId: caseId },
        orderBy: { createdAt: "desc" },
        include: { autor: { select: { nome: true } } }
      });
      return reply.send(anexos);
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao listar anexos." });
    }
  });
  app.delete("/attachments/:id", async (request, reply) => {
    const paramsSchema = import_zod.z.object({ id: import_zod.z.string().uuid() });
    try {
      const { id } = paramsSchema.parse(request.params);
      const { sub: userId, cargo } = request.user;
      const anexo = await prisma.anexo.findUnique({ where: { id } });
      if (!anexo) return reply.status(404).send({ message: "Arquivo n\xE3o encontrado." });
      if (anexo.autorId !== userId && cargo !== import_client2.Cargo.Gerente) {
        return reply.status(403).send({ message: "Sem permiss\xE3o para excluir este anexo." });
      }
      await prisma.anexo.delete({ where: { id } });
      try {
        const filePath = import_path.default.resolve(process.cwd(), "uploads", import_path.default.basename(anexo.url));
        if (import_fs.default.existsSync(filePath)) import_fs.default.unlinkSync(filePath);
      } catch (e) {
        console.error("Erro ao apagar arquivo f\xEDsico:", e);
      }
      await prisma.caseLog.create({
        data: {
          casoId: anexo.casoId,
          autorId: userId,
          acao: import_client2.LogAction.OUTRO,
          descricao: `Removeu anexo: ${anexo.nome}`
        }
      });
      return reply.status(204).send();
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao remover anexo." });
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  attachmentRoutes
});
