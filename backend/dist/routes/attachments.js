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

// src/routes/attachments.ts
var attachments_exports = {};
__export(attachments_exports, {
  attachmentRoutes: () => attachmentRoutes
});
module.exports = __toCommonJS(attachments_exports);
var import_zod = require("zod");

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var globalForPrisma = global;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient({
  log: ["error"]
  // Reduzi logs para limpar o terminal, use ['query'] para debug
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/routes/attachments.ts
var import_client2 = require("@prisma/client");
var import_cloudinary = require("cloudinary");
import_cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
var uploadToCloudinary = (buffer, folder, resourceType) => {
  return new Promise((resolve, reject) => {
    const uploadStream = import_cloudinary.v2.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType
        // Mantém o nome original ou gera um UUID, aqui deixamos o Cloudinary gerenciar ou usamos o ID
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};
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
var attachmentResponseSchema = import_zod.z.object({
  id: import_zod.z.string().uuid(),
  nome: import_zod.z.string(),
  tipo: import_zod.z.string(),
  url: import_zod.z.string(),
  tamanho: import_zod.z.number().nullable(),
  createdAt: import_zod.z.date(),
  autor: import_zod.z.object({ nome: import_zod.z.string() }).optional()
});
async function attachmentRoutes(app) {
  const server = app.withTypeProvider();
  server.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  server.get("/cases/:caseId/attachments", {
    schema: {
      tags: ["Anexos"],
      summary: "Listar arquivos anexados ao caso",
      params: import_zod.z.object({ caseId: import_zod.z.string().uuid() }),
      response: {
        200: import_zod.z.array(attachmentResponseSchema)
      }
    }
  }, async (request, reply) => {
    const { caseId } = request.params;
    const attachments = await prisma.anexo.findMany({
      where: { casoId: caseId },
      orderBy: { createdAt: "desc" },
      include: { autor: { select: { nome: true } } }
    });
    return reply.send(attachments);
  });
  server.post("/attachments", {
    schema: {
      tags: ["Anexos"],
      summary: "Fazer upload de arquivo (PDF/Imagem) para o Cloudinary",
      querystring: import_zod.z.object({ caseId: import_zod.z.string().uuid() })
    }
  }, async (request, reply) => {
    if (!request.isMultipart()) {
      return reply.status(400).send({ message: "Requisi\xE7\xE3o deve ser multipart/form-data" });
    }
    const { caseId } = request.query;
    const data = await request.file();
    if (!data) return reply.status(400).send({ message: "Nenhum arquivo enviado." });
    const buffer = await data.toBuffer();
    const fileType = await validateFileSignature(buffer);
    if (!fileType) {
      return reply.status(400).send({ message: "Tipo de arquivo inv\xE1lido. Apenas PDF e Imagens (JPG/PNG)." });
    }
    try {
      const uploadResult = await uploadToCloudinary(buffer, "sgac_anexos", "auto");
      const { sub: userId } = request.user;
      const anexo = await prisma.anexo.create({
        data: {
          nome: data.filename,
          tipo: fileType,
          // Salvamos a URL segura completa (https://...)
          url: uploadResult.secure_url,
          // Podemos salvar o public_id se quisermos deletar depois, mas a URL serve por agora
          tamanho: buffer.length,
          casoId: caseId,
          autorId: userId
        }
      });
      prisma.caseLog.create({
        data: {
          casoId: caseId,
          autorId: userId,
          acao: import_client2.LogAction.ANEXO_ADICIONADO,
          descricao: `Anexo adicionado: ${data.filename}`
        }
      }).catch(console.error);
      return reply.status(201).send(anexo);
    } catch (error) {
      console.error("Erro Upload Cloudinary:", error);
      return reply.status(500).send({ message: "Erro ao fazer upload para a nuvem." });
    }
  });
  server.delete("/attachments/:id", {
    schema: {
      tags: ["Anexos"],
      summary: "Remover um arquivo anexo",
      params: import_zod.z.object({ id: import_zod.z.string().uuid() }),
      response: {
        204: import_zod.z.null()
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { sub: userId, cargo } = request.user;
    const anexo = await prisma.anexo.findUnique({ where: { id } });
    if (!anexo) return reply.status(404).send({ message: "Arquivo n\xE3o encontrado." });
    const canDelete = anexo.autorId === userId || cargo === import_client2.Cargo.Gerente || cargo === import_client2.Cargo.Auditor;
    if (!canDelete) {
      return reply.status(403).send({ message: "Sem permiss\xE3o." });
    }
    await prisma.anexo.delete({ where: { id } });
    try {
      const urlParts = anexo.url.split("/");
      const fileNameWithExt = urlParts[urlParts.length - 1];
      const fileName = fileNameWithExt.split(".")[0];
      const publicId = `sgac_anexos/${fileName}`;
      await import_cloudinary.v2.uploader.destroy(publicId);
    } catch (e) {
      request.log.warn(`Erro ao deletar do Cloudinary (pode j\xE1 ter sido removido): ${anexo.url}`);
    }
    prisma.caseLog.create({
      data: {
        casoId: anexo.casoId,
        autorId: userId,
        acao: import_client2.LogAction.OUTRO,
        descricao: `Anexo removido: ${anexo.nome}`
      }
    }).catch(console.error);
    return reply.status(204).send();
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  attachmentRoutes
});
