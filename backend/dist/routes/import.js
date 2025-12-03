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

// src/routes/import.ts
var import_exports = {};
__export(import_exports, {
  importRoutes: () => importRoutes
});
module.exports = __toCommonJS(import_exports);

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var prisma = new import_client.PrismaClient();

// src/routes/import.ts
var import_fast_csv = require("fast-csv");
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_promises = require("stream/promises");
var import_client2 = require("@prisma/client");
async function importRoutes(app) {
  app.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
      const { cargo } = request.user;
      if (cargo !== import_client2.Cargo.Gerente) {
        return reply.status(403).send({ message: "Acesso restrito \xE0 Ger\xEAncia." });
      }
    } catch (err) {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app.post("/import/cases", async (request, reply) => {
    const { sub: userId } = request.user;
    const data = await request.file();
    if (!data || data.mimetype !== "text/csv") {
      return reply.status(400).send({ message: "Por favor, envie um ficheiro CSV v\xE1lido." });
    }
    const uploadDir = import_path.default.resolve(__dirname, "../../uploads");
    if (!import_fs.default.existsSync(uploadDir)) import_fs.default.mkdirSync(uploadDir, { recursive: true });
    const tempFilePath = import_path.default.join(uploadDir, `import_${Date.now()}.csv`);
    await (0, import_promises.pipeline)(data.file, import_fs.default.createWriteStream(tempFilePath));
    const results = [];
    const errors = [];
    let successCount = 0;
    return new Promise((resolve, reject) => {
      import_fs.default.createReadStream(tempFilePath).pipe((0, import_fast_csv.parse)({ headers: true, ignoreEmpty: true, delimiter: "," })).on("error", (error) => {
        console.error(error);
        import_fs.default.unlinkSync(tempFilePath);
        reject(reply.status(500).send({ message: "Erro ao ler o ficheiro CSV." }));
      }).on("data", (row) => results.push(row)).on("end", async () => {
        if (import_fs.default.existsSync(tempFilePath)) import_fs.default.unlinkSync(tempFilePath);
        await prisma.$transaction(async (tx) => {
          for (const [index, row] of results.entries()) {
            const rowNum = index + 2;
            if (!row.Nome || !row.CPF) {
              errors.push(`Linha ${rowNum}: Nome ou CPF em falta.`);
              continue;
            }
            const cpfLimpo = row.CPF.replace(/\D/g, "");
            if (cpfLimpo.length !== 11) {
              errors.push(`Linha ${rowNum}: CPF inv\xE1lido (${row.CPF}).`);
              continue;
            }
            const exists = await tx.case.findUnique({ where: { cpf: cpfLimpo } });
            if (exists) {
              errors.push(`Linha ${rowNum}: CPF j\xE1 cadastrado (${row.Nome}).`);
              continue;
            }
            let beneficiosArray = [];
            if (row.Beneficios) {
              beneficiosArray = row.Beneficios.split(";").map((b) => b.trim()).filter((b) => b !== "");
            }
            try {
              await tx.case.create({
                data: {
                  // Obrigatórios
                  nomeCompleto: row.Nome,
                  cpf: cpfLimpo,
                  nascimento: new Date(row.Nascimento || /* @__PURE__ */ new Date()),
                  // Fallback hoje
                  sexo: row.Sexo || "N\xE3o Informado",
                  telefone: row.Telefone || "",
                  endereco: row.Endereco || "",
                  urgencia: row.Urgencia || "Sem risco imediato",
                  violacao: row.Violacao || "Outros",
                  categoria: row.Categoria || "Fam\xEDlia em vulnerabilidade",
                  orgaoDemandante: row.Orgao || "Demanda Espont\xE2nea",
                  // Opcionais (Novos Campos)
                  numeroSei: row.NumeroSEI || null,
                  linkSei: row.LinkSEI || null,
                  observacoes: row.Observacoes || `Importado via CSV em ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`,
                  beneficios: beneficiosArray,
                  // Sistema
                  pesoUrgencia: 1,
                  status: "AGUARDANDO_ACOLHIDA",
                  criadoPorId: userId
                }
              });
              successCount++;
            } catch (err) {
              console.error(err);
              errors.push(`Linha ${rowNum}: Erro ao salvar no banco. Verifique formato de data (AAAA-MM-DD).`);
            }
          }
        });
        resolve(reply.send({
          message: "Processamento conclu\xEDdo.",
          total: results.length,
          success: successCount,
          failed: errors.length,
          errors: errors.slice(0, 50)
        }));
      });
    });
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  importRoutes
});
