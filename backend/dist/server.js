var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// src/server.ts
var import_fastify = __toESM(require("fastify"));
var import_cors = __toESM(require("@fastify/cors"));
var import_jwt = __toESM(require("@fastify/jwt"));

// src/routes/auth.ts
var import_zod = require("zod");

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var prisma = new import_client.PrismaClient();

// src/routes/auth.ts
var import_bcryptjs = __toESM(require("bcryptjs"));
async function authRoutes(app2) {
  app2.post("/register", async (request, reply) => {
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
  app2.post("/login", async (request, reply) => {
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
      const token = app2.jwt.sign(
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
  app2.get(
    "/me",
    { onRequest: [app2.authenticate] },
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

// src/routes/cases.ts
var import_zod2 = require("zod");
var import_date_fns = require("date-fns");
var import_locale = require("date-fns/locale");
var formatDateForCsv = (date) => {
  if (date && !isNaN(date.getTime())) {
    return (0, import_date_fns.format)(date, "dd/MM/yyyy", { locale: import_locale.ptBR });
  }
  return "N/A";
};
function internalError(reply, message, error) {
  console.error(message, error);
  return reply.status(500).send({ message });
}
function buildActiveCaseWhereClause(user) {
  if (user.cargo === "Agente Social") {
    return {
      agenteAcolhidaId: user.sub,
      //
      status: { in: ["AGUARDANDO_ACOLHIDA", "EM_ACOLHIDA"] }
      //
    };
  }
  if (user.cargo === "Especialista") {
    return {
      especialistaPAEFIId: user.sub,
      //
      status: "EM_ACOMPANHAMENTO_PAEFI"
      //
    };
  }
  if (user.cargo === "Gerente") {
    return {
      status: "AGUARDANDO_DISTRIBUICAO_PAEFI"
      //
    };
  }
  return { id: "-1" };
}
function buildClosedCaseWhereClause(user) {
  const where = {
    status: "DESLIGADO"
    //
  };
  if (user.cargo === "Agente Social") {
    where.agenteAcolhidaId = user.sub;
  } else if (user.cargo === "Especialista") {
    where.especialistaPAEFIId = user.sub;
  }
  return where;
}
async function caseRoutes(app2) {
  app2.post(
    "/cases",
    { onRequest: [app2.authenticate] },
    //
    async (request, reply) => {
      const createCaseBodySchema = import_zod2.z.object({
        nomeCompleto: import_zod2.z.string(),
        //
        cpf: import_zod2.z.string().length(11),
        //
        nascimento: import_zod2.z.coerce.date(),
        //
        sexo: import_zod2.z.string(),
        //
        telefone: import_zod2.z.string(),
        //
        endereco: import_zod2.z.string(),
        //
        dataEntrada: import_zod2.z.coerce.date(),
        //
        urgencia: import_zod2.z.string(),
        //
        violacao: import_zod2.z.string(),
        //
        categoria: import_zod2.z.string(),
        //
        orgaoDemandante: import_zod2.z.string(),
        //
        numeroSei: import_zod2.z.string().optional(),
        //
        linkSei: import_zod2.z.string().url().optional().or(import_zod2.z.literal("")),
        // (Aceita URL ou string vazia)
        agenteAcolhidaId: import_zod2.z.string().uuid(),
        //
        observacoes: import_zod2.z.string().optional(),
        //
        beneficios: import_zod2.z.array(import_zod2.z.string()).optional()
        //
      });
      try {
        const dataToSave = createCaseBodySchema.parse(request.body);
        const userId = request.user.sub;
        const newCase = await prisma.case.create({
          //
          data: {
            ...dataToSave,
            criadoPorId: userId,
            //
            // Garante que campos opcionais não enviados sejam null
            numeroSei: dataToSave.numeroSei || null,
            linkSei: dataToSave.linkSei || null,
            observacoes: dataToSave.observacoes || null,
            beneficios: dataToSave.beneficios || []
          }
        });
        return await reply.status(201).send(newCase);
      } catch (error) {
        if (error instanceof import_zod2.z.ZodError) {
          return await reply.status(400).send({
            message: "Dados inv\xE1lidos.",
            errors: error.flatten().fieldErrors
            //
          });
        }
        return internalError(reply, "Erro interno ao criar caso.", error);
      }
    }
  );
  app2.get(
    "/cases",
    { onRequest: [app2.authenticate] },
    //
    async (request, reply) => {
      const getCasesQuerySchema = import_zod2.z.object({
        search: import_zod2.z.string().optional(),
        //
        page: import_zod2.z.coerce.number().min(1).default(1),
        //
        pageSize: import_zod2.z.coerce.number().min(1).max(100).default(10)
        //
      });
      try {
        const { search, page, pageSize } = getCasesQuerySchema.parse(
          request.query
        );
        let whereClause = buildActiveCaseWhereClause(request.user);
        if (search) {
          whereClause.OR = [
            { nomeCompleto: { contains: search, mode: "insensitive" } },
            //
            { cpf: { contains: search } }
            //
          ];
        }
        const [cases, total] = await Promise.all([
          prisma.case.findMany({
            //
            where: whereClause,
            orderBy: { createdAt: "desc" },
            //
            take: pageSize,
            //
            skip: (page - 1) * pageSize,
            //
            include: {
              agenteAcolhida: { select: { nome: true } },
              //
              especialistaPAEFI: { select: { nome: true } }
              //
            }
          }),
          prisma.case.count({ where: whereClause })
          //
        ]);
        return await reply.status(200).send({
          //
          items: cases,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        });
      } catch (error) {
        return internalError(reply, "Erro interno ao listar casos ativos.", error);
      }
    }
  );
  app2.get(
    "/cases/closed",
    { onRequest: [app2.authenticate] },
    //
    async (request, reply) => {
      const getCasesQuerySchema = import_zod2.z.object({
        search: import_zod2.z.string().optional(),
        //
        page: import_zod2.z.coerce.number().min(1).default(1),
        //
        pageSize: import_zod2.z.coerce.number().min(1).max(100).default(10)
        //
      });
      try {
        const { search, page, pageSize } = getCasesQuerySchema.parse(
          request.query
        );
        let whereClause = buildClosedCaseWhereClause(request.user);
        if (search) {
          whereClause.OR = [
            { nomeCompleto: { contains: search, mode: "insensitive" } },
            //
            { cpf: { contains: search } }
            //
          ];
        }
        const [cases, total] = await Promise.all([
          prisma.case.findMany({
            //
            where: whereClause,
            orderBy: { dataDesligamento: "desc" },
            //
            take: pageSize,
            //
            skip: (page - 1) * pageSize,
            //
            select: {
              //
              id: true,
              nomeCompleto: true,
              cpf: true,
              status: true,
              dataDesligamento: true,
              parecerFinal: true,
              // Adiciona responsáveis para a tabela de fechados
              agenteAcolhida: { select: { nome: true } },
              especialistaPAEFI: { select: { nome: true } }
            }
          }),
          prisma.case.count({ where: whereClause })
          //
        ]);
        return await reply.status(200).send({
          //
          items: cases,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        });
      } catch (error) {
        return internalError(reply, "Erro interno ao listar casos finalizados.", error);
      }
    }
  );
  app2.get(
    "/cases/:id",
    { onRequest: [app2.authenticate] },
    //
    async (request, reply) => {
      const getCaseParamsSchema = import_zod2.z.object({
        id: import_zod2.z.string().uuid()
        //
      });
      try {
        const { id } = getCaseParamsSchema.parse(request.params);
        const caseDetail = await prisma.case.findUnique({
          //
          where: { id },
          include: {
            criadoPor: { select: { nome: true } },
            //
            agenteAcolhida: { select: { id: true, nome: true } },
            //
            especialistaPAEFI: { select: { id: true, nome: true } }
            //
          }
        });
        if (!caseDetail) {
          return await reply.status(404).send({ message: "Caso n\xE3o encontrado." });
        }
        return await reply.status(200).send(caseDetail);
      } catch (error) {
        return internalError(reply, "Erro interno ao buscar o caso.", error);
      }
    }
  );
  app2.patch(
    "/cases/:id/status",
    { onRequest: [app2.authenticate] },
    //
    async (request, reply) => {
      const paramsSchema = import_zod2.z.object({ id: import_zod2.z.string().uuid() });
      const bodySchema = import_zod2.z.object({
        status: import_zod2.z.enum([
          //
          "AGUARDANDO_ACOLHIDA",
          "EM_ACOLHIDA",
          "AGUARDANDO_DISTRIBUICAO_PAEFI",
          "EM_ACOMPANHAMENTO_PAEFI",
          "DESLIGADO"
        ])
      });
      try {
        const { id } = paramsSchema.parse(request.params);
        const { status } = bodySchema.parse(request.body);
        const { sub: userId, cargo } = request.user;
        const caseToUpdate = await prisma.case.findUnique({ where: { id } });
        if (!caseToUpdate) {
          return await reply.status(404).send({ message: "Caso n\xE3o encontrado." });
        }
        const isManager = cargo === "Gerente";
        const isResponsibleAgent = caseToUpdate.agenteAcolhidaId === userId;
        const isResponsibleSpecialist = caseToUpdate.especialistaPAEFIId === userId;
        if (caseToUpdate.status === "DESLIGADO" && status !== "DESLIGADO") {
          if (!isManager) {
            return await reply.status(403).send({ message: "Apenas Gerentes podem reabrir um caso." });
          }
        } else if (!isManager && !isResponsibleAgent && !isResponsibleSpecialist) {
          return await reply.status(403).send({ message: "Voc\xEA n\xE3o tem permiss\xE3o para esta a\xE7\xE3o." });
        }
        let data = { status };
        if (caseToUpdate.status === "DESLIGADO" && status !== "DESLIGADO") {
          data = {
            ...data,
            status: "AGUARDANDO_ACOLHIDA",
            // Sempre volta para a triagem inicial
            motivoDesligamento: null,
            //
            dataDesligamento: null,
            //
            parecerFinal: null
            //
          };
        }
        const updatedCase = await prisma.case.update({
          //
          where: { id },
          data
        });
        return await reply.status(200).send(updatedCase);
      } catch (error) {
        if (error instanceof import_zod2.z.ZodError) {
          return await reply.status(400).send({
            message: "Dados de status inv\xE1lidos.",
            errors: error.flatten().fieldErrors
            //
          });
        }
        return internalError(reply, "Erro interno ao atualizar o status.", error);
      }
    }
  );
  app2.patch(
    "/cases/:id/assign",
    { onRequest: [app2.authenticate] },
    //
    async (request, reply) => {
      const paramsSchema = import_zod2.z.object({ id: import_zod2.z.string().uuid() });
      const bodySchema = import_zod2.z.object({
        specialistId: import_zod2.z.string().uuid()
        //
      });
      try {
        const { id } = paramsSchema.parse(request.params);
        const { specialistId } = bodySchema.parse(request.body);
        const { cargo } = request.user;
        if (cargo !== "Gerente") {
          return await reply.status(403).send({ message: "Apenas gerentes podem atribuir casos." });
        }
        const updatedCase = await prisma.case.update({
          //
          where: { id },
          data: {
            especialistaPAEFIId: specialistId,
            //
            status: "EM_ACOMPANHAMENTO_PAEFI",
            //
            dataInicioPAEFI: /* @__PURE__ */ new Date()
            //
          }
        });
        return await reply.status(200).send(updatedCase);
      } catch (error) {
        return internalError(reply, "Erro interno ao atribuir especialista.", error);
      }
    }
  );
  app2.patch(
    "/cases/:id/close",
    { onRequest: [app2.authenticate] },
    //
    async (request, reply) => {
      const paramsSchema = import_zod2.z.object({ id: import_zod2.z.string().uuid() });
      const bodySchema = import_zod2.z.object({
        parecerFinal: import_zod2.z.string().min(10, "O parecer final \xE9 muito curto."),
        //
        motivoDesligamento: import_zod2.z.string().min(1, "O motivo de desligamento \xE9 obrigat\xF3rio.")
        //
      });
      try {
        const { id } = paramsSchema.parse(request.params);
        const { parecerFinal, motivoDesligamento } = bodySchema.parse(request.body);
        const { sub: userId, cargo } = request.user;
        const caseToClose = await prisma.case.findUnique({ where: { id } });
        if (!caseToClose) {
          return await reply.status(404).send({ message: "Caso n\xE3o encontrado." });
        }
        const isManager = cargo === "Gerente";
        const isResponsibleAgent = caseToClose.agenteAcolhidaId === userId;
        const isResponsibleSpecialist = caseToClose.especialistaPAEFIId === userId;
        if (!isManager && !isResponsibleAgent && !isResponsibleSpecialist) {
          return await reply.status(403).send({ message: "Voc\xEA n\xE3o tem permiss\xE3o para esta a\xE7\xE3o." });
        }
        const updatedCase = await prisma.case.update({
          //
          where: { id },
          data: {
            status: "DESLIGADO",
            //
            parecerFinal,
            //
            motivoDesligamento,
            //
            dataDesligamento: /* @__PURE__ */ new Date()
            //
          }
        });
        return await reply.status(200).send(updatedCase);
      } catch (error) {
        return internalError(reply, "Erro interno ao desligar o caso.", error);
      }
    }
  );
  app2.get(
    "/cases/export",
    { onRequest: [app2.authenticate] },
    //
    async (request, reply) => {
      if (request.user.cargo !== "Gerente") {
        return await reply.status(403).send({ message: "Acesso negado." });
      }
      try {
        const allCases = await prisma.case.findMany({
          //
          orderBy: { createdAt: "desc" },
          //
          include: {
            criadoPor: true,
            //
            agenteAcolhida: true,
            //
            especialistaPAEFI: true
            //
          }
        });
        reply.header(
          //
          "Content-Disposition",
          `attachment; filename="export_casos_${(0, import_date_fns.format)(
            /* @__PURE__ */ new Date(),
            "yyyy-MM-dd"
          )}.csv"`
          //
        );
        reply.type("text/csv; charset=utf-8");
        const csvStream = (0, import_date_fns.format)({ headers: true });
        csvStream.pipe(reply.raw);
        allCases.forEach((c) => {
          var _a, _b, _c;
          csvStream.write({
            //
            ID: c.id,
            Nome_Completo: c.nomeCompleto,
            //
            CPF: c.cpf,
            //
            Nascimento: formatDateForCsv(c.nascimento),
            //
            Sexo: c.sexo,
            //
            Telefone: c.telefone,
            //
            Endereco: c.endereco,
            //
            Data_Entrada: formatDateForCsv(c.dataEntrada),
            //
            Urgencia: c.urgencia,
            //
            Violacao: c.violacao,
            //
            Categoria: c.categoria,
            //
            Orgao_Demandante: c.orgaoDemandante,
            //
            Numero_SEI: c.numeroSei ?? "N/A",
            //
            Status: c.status,
            //
            Criado_Por: ((_a = c.criadoPor) == null ? void 0 : _a.nome) ?? "Utilizador Removido",
            //
            Agente_Acolhida: ((_b = c.agenteAcolhida) == null ? void 0 : _b.nome) ?? "N\xE3o Atribu\xEDdo",
            //
            Especialista_PAEFI: ((_c = c.especialistaPAEFI) == null ? void 0 : _c.nome) ?? "N\xE3o Atribu\xEDdo",
            //
            Data_Desligamento: formatDateForCsv(c.dataDesligamento),
            //
            Parecer_Final: c.parecerFinal ?? "N/A"
            //
          });
        });
        csvStream.end();
      } catch (error) {
        return internalError(reply, "Erro interno ao exportar dados.", error);
      }
    }
  );
}

// src/routes/users.ts
var import_zod3 = require("zod");
async function userRoutes(app2) {
  app2.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      await reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.get("/users", async (request, reply) => {
    const { sub: userId, cargo } = request.user;
    if (cargo !== "Gerente") {
      return reply.status(403).send({ message: "Acesso negado." });
    }
    try {
      const users = await prisma.user.findMany({
        where: {
          id: { not: userId },
          // Não inclui o gerente logado
          ativo: true
          // Mostra apenas usuários ativos
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
  app2.get("/users/agents", async (request, reply) => {
    try {
      const agents = await prisma.user.findMany({
        where: {
          cargo: "Agente Social",
          ativo: true
          //
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
  app2.get("/users/specialists", async (request, reply) => {
    try {
      const specialists = await prisma.user.findMany({
        where: {
          cargo: "Especialista",
          ativo: true
          //
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
  app2.put("/users/:id", async (request, reply) => {
    const { cargo } = request.user;
    if (cargo !== "Gerente") {
      return reply.status(403).send({ message: "Acesso negado." });
    }
    const paramsSchema = import_zod3.z.object({ id: import_zod3.z.string().uuid() });
    const bodySchema = import_zod3.z.object({
      nome: import_zod3.z.string().min(3),
      email: import_zod3.z.string().email(),
      cargo: import_zod3.z.enum(["Gerente", "Agente Social", "Especialista"])
    });
    try {
      const { id } = paramsSchema.parse(request.params);
      const data = bodySchema.parse(request.body);
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
  app2.delete("/users/:id", async (request, reply) => {
    const { cargo } = request.user;
    if (cargo !== "Gerente") {
      return reply.status(403).send({ message: "Acesso negado." });
    }
    const paramsSchema = import_zod3.z.object({ id: import_zod3.z.string().uuid() });
    try {
      const { id } = paramsSchema.parse(request.params);
      await prisma.user.update({
        where: { id },
        data: {
          ativo: false
          //
        }
      });
      return reply.status(204).send();
    } catch (error) {
      console.error("Erro ao desativar usu\xE1rio:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
}

// src/routes/evolutions.ts
var import_zod4 = require("zod");
var createEvolutionBodySchema = import_zod4.z.object({
  //
  conteudo: import_zod4.z.string().min(10, "A evolu\xE7\xE3o deve ter no m\xEDnimo 10 caracteres.")
  //
});
async function evolutionRoutes(app2) {
  app2.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.get("/cases/:caseId/evolutions", async (request, reply) => {
    const paramsSchema = import_zod4.z.object({ caseId: import_zod4.z.string().uuid() });
    try {
      const { caseId } = paramsSchema.parse(request.params);
      const evolutions = await prisma.evolucao.findMany({
        where: { casoId: caseId },
        //
        orderBy: { createdAt: "desc" },
        include: {
          autor: { select: { id: true, nome: true } }
          //
        }
      });
      return await reply.status(200).send(evolutions);
    } catch (error) {
      console.error("Erro ao buscar evolu\xE7\xF5es:", error);
      return await reply.status(500).send({ message: "Erro interno ao buscar evolu\xE7\xF5es." });
    }
  });
  app2.post("/cases/:caseId/evolutions", async (request, reply) => {
    const paramsSchema = import_zod4.z.object({ caseId: import_zod4.z.string().uuid() });
    try {
      const { caseId } = paramsSchema.parse(request.params);
      const data = createEvolutionBodySchema.parse(request.body);
      const { sub: autorId, nome: autorNome } = request.user;
      const newEvolution = await prisma.evolucao.create({
        //
        data: {
          // O frontend envia 'conteudo' e o banco espera 'conteudo'
          conteudo: data.conteudo,
          //
          casoId: caseId,
          //
          autorId
          //
        }
      });
      const evolutionForFrontend = {
        id: newEvolution.id,
        createdAt: newEvolution.createdAt,
        conteudo: newEvolution.conteudo,
        autor: { nome: autorNome ?? "Usu\xE1rio" }
        // Adiciona o autor para o cache
      };
      return await reply.status(201).send(evolutionForFrontend);
    } catch (error) {
      console.error("!!!!!!!!!! ERRO 500 AO CRIAR EVOLU\xC7\xC3O !!!!!!!!!!");
      console.error("DADOS RECEBIDOS:", request.body);
      console.error("AUTOR ID:", request.user.sub);
      console.error("ERRO COMPLETO:", error);
      if (error instanceof import_zod4.z.ZodError) {
        return reply.status(400).send({
          message: "Dados inv\xE1lidos.",
          errors: error.flatten().fieldErrors
        });
      }
      return await reply.status(500).send({ message: "Erro interno ao criar evolu\xE7\xE3o." });
    }
  });
}

// src/routes/paf.ts
var import_zod5 = require("zod");
async function pafRoutes(app2) {
  app2.get(
    "/cases/:caseId/paf",
    { onRequest: [app2.authenticate] },
    //
    async (request, reply) => {
      const paramsSchema = import_zod5.z.object({ caseId: import_zod5.z.string().uuid() });
      try {
        const { caseId } = paramsSchema.parse(request.params);
        const paf = await prisma.paf.findUnique({
          where: { casoId: caseId },
          //
          include: { autor: { select: { id: true, nome: true } } }
          //
        });
        return await reply.status(200).send(paf);
      } catch (error) {
        request.log.error(error, "Erro ao buscar PAF.");
        return await reply.status(500).send({ message: "Erro interno ao buscar PAF." });
      }
    }
  );
  const pafBodySchema = import_zod5.z.object({
    //
    diagnostico: import_zod5.z.string().min(10),
    //
    objetivos: import_zod5.z.string().min(10),
    //
    estrategias: import_zod5.z.string().min(10),
    //
    // Trocamos 'prazos: z.string()' por 'deadline: z.coerce.date()'
    deadline: import_zod5.z.coerce.date({
      required_error: "A data do prazo \xE9 obrigat\xF3ria."
    })
  });
  app2.post(
    "/cases/:caseId/paf",
    { onRequest: [app2.authenticate] },
    //
    async (request, reply) => {
      const paramsSchema = import_zod5.z.object({ caseId: import_zod5.z.string().uuid() });
      try {
        const { caseId } = paramsSchema.parse(request.params);
        const data = pafBodySchema.parse(request.body);
        const { sub: autorId, cargo } = request.user;
        if (cargo !== "Especialista" && cargo !== "Gerente") {
          return await reply.status(403).send({ message: "Apenas especialistas podem criar um PAF." });
        }
        const newPaf = await prisma.paf.create({
          data: {
            ...data,
            // 'data' agora contém 'deadline' em vez de 'prazos'
            casoId: caseId,
            //
            autorId
            //
          }
        });
        return await reply.status(201).send(newPaf);
      } catch (error) {
        request.log.error(error, "Erro ao criar PAF.");
        return await reply.status(500).send({ message: "Erro interno ao criar PAF." });
      }
    }
  );
  app2.put(
    "/cases/:caseId/paf",
    { onRequest: [app2.authenticate] },
    //
    async (request, reply) => {
      const paramsSchema = import_zod5.z.object({ caseId: import_zod5.z.string().uuid() });
      try {
        const { caseId } = paramsSchema.parse(request.params);
        const data = pafBodySchema.partial().parse(request.body);
        const { sub: userId, cargo } = request.user;
        const existingPaf = await prisma.paf.findUnique({
          where: { casoId: caseId }
          //
        });
        if (!existingPaf) {
          return await reply.status(404).send({ message: "PAF n\xE3o encontrado." });
        }
        if (existingPaf.autorId !== userId && cargo !== "Gerente") {
          return await reply.status(403).send({ message: "Apenas o autor ou um gerente podem editar este PAF." });
        }
        const updatedPaf = await prisma.paf.update({
          where: { casoId: caseId },
          //
          data: {
            ...data,
            // 'data' agora contém 'deadline' (se foi enviado)
            updatedAt: /* @__PURE__ */ new Date()
            //
          }
        });
        return await reply.status(200).send(updatedPaf);
      } catch (error) {
        request.log.error(error, "Erro ao atualizar PAF.");
        return await reply.status(500).send({ message: "Erro interno ao atualizar PAF." });
      }
    }
  );
}

// src/routes/stats.ts
var import_date_fns2 = require("date-fns");
async function statsRoutes(app2) {
  app2.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.get("/stats", async (request, reply) => {
    const { cargo } = request.user;
    if (cargo !== "Gerente") {
      return reply.status(403).send({ message: "Acesso negado." });
    }
    try {
      const today = /* @__PURE__ */ new Date();
      const firstDayOfMonth = (0, import_date_fns2.startOfMonth)(today);
      const lastDayOfMonth = (0, import_date_fns2.endOfMonth)(today);
      const totalCases = await prisma.case.count();
      const acolhidasCount = await prisma.case.count({
        where: {
          status: { in: ["AGUARDANDO_ACOLHIDA", "EM_ACOLHIDA"] }
        }
      });
      const acompanhamentosCount = await prisma.case.count({
        where: { status: "EM_ACOMPANHAMENTO_PAEFI" }
      });
      const newCasesThisMonth = await prisma.case.count({
        where: {
          dataEntrada: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth
          }
        }
      });
      const closedCasesThisMonth = await prisma.case.count({
        where: {
          status: "DESLIGADO",
          dataDesligamento: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth
          }
        }
      });
      const agentWorkload = await prisma.user.findMany({
        where: {
          cargo: "Agente Social",
          ativo: true
        },
        select: {
          nome: true,
          casosDeAcolhida: {
            where: { status: { in: ["AGUARDANDO_ACOLHIDA", "EM_ACOLHIDA"] } }
          }
        }
      });
      const specialistWorkload = await prisma.user.findMany({
        where: {
          cargo: "Especialista",
          ativo: true
        },
        select: {
          nome: true,
          casosDeAcompanhamento: {
            where: { status: "EM_ACOMPANHAMENTO_PAEFI" }
          }
        }
      });
      const workloadByAgent = agentWorkload.map((u) => {
        var _a;
        return {
          name: u.nome,
          value: ((_a = u.casosDeAcolhida) == null ? void 0 : _a.length) ?? 0
        };
      });
      const workloadBySpecialist = specialistWorkload.map((u) => {
        var _a;
        return {
          name: u.nome,
          value: ((_a = u.casosDeAcompanhamento) == null ? void 0 : _a.length) ?? 0
        };
      });
      const productivity = [...workloadByAgent, ...workloadBySpecialist].sort((a, b) => b.value - a.value);
      const urgencyGroups = await prisma.case.groupBy({
        by: ["urgencia"],
        _count: { _all: true },
        where: { status: { not: "DESLIGADO" } }
      });
      const casesByUrgency = urgencyGroups.map((g) => ({ name: g.urgencia, value: g._count._all }));
      const categoryGroups = await prisma.case.groupBy({
        by: ["categoria"],
        _count: { _all: true },
        where: { status: { not: "DESLIGADO" } }
      });
      const casesByCategory = categoryGroups.map((g) => ({ name: g.categoria, value: g._count._all }));
      const violationGroups = await prisma.case.groupBy({
        by: ["violacao"],
        _count: { _all: true },
        where: { status: { not: "DESLIGADO" } }
      });
      const casesByViolation = violationGroups.map((g) => ({ name: g.violacao, value: g._count._all }));
      return reply.status(200).send({
        // Dashboard
        totalCases,
        acolhidasCount,
        acompanhamentosCount,
        newCasesThisMonth,
        closedCasesThisMonth,
        workloadByAgent,
        workloadBySpecialist,
        // Relatórios
        productivity,
        casesByUrgency,
        casesByCategory,
        casesByViolation
      });
    } catch (error) {
      console.error("Erro ao buscar estat\xEDsticas:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
  app2.get("/stats/my-agenda", async (request, reply) => {
    const { sub: userId } = request.user;
    try {
      const today = (0, import_date_fns2.startOfDay)(/* @__PURE__ */ new Date());
      const cutoffDate = (0, import_date_fns2.endOfDay)((0, import_date_fns2.addDays)(today, 30));
      const appointments = await prisma.agendamento.findMany({
        where: {
          responsavelId: userId,
          data: {
            gte: today,
            lte: cutoffDate
          }
        },
        orderBy: { data: "asc" },
        take: 5,
        include: {
          caso: {
            select: { id: true, nomeCompleto: true }
          }
        }
      });
      return reply.status(200).send(appointments);
    } catch (error) {
      console.error("Erro ao buscar pr\xF3ximos agendamentos:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
}

// src/routes/appointments.ts
var import_zod6 = require("zod");
var import_date_fns3 = require("date-fns");
async function appointmentRoutes(app2) {
  app2.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      await reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.get("/appointments", async (request, reply) => {
    const { sub: userId, cargo } = request.user;
    const querySchema = import_zod6.z.object({
      month: import_zod6.z.string().regex(/^\d{4}-\d{2}$/, "Formato de m\xEAs inv\xE1lido. Use YYYY-MM."),
      userId: import_zod6.z.string().uuid().optional()
    });
    try {
      const { month, userId: queryUserId } = querySchema.parse(request.query);
      const firstDay = (0, import_date_fns3.startOfMonth)((0, import_date_fns3.parseISO)(month));
      const lastDay = (0, import_date_fns3.endOfMonth)((0, import_date_fns3.parseISO)(month));
      const whereClause = {
        data: {
          gte: firstDay,
          lte: lastDay
        }
      };
      if (cargo === "Gerente") {
        if (queryUserId) {
          whereClause.responsavelId = queryUserId;
        }
      } else {
        whereClause.responsavelId = userId;
      }
      const appointments = await prisma.agendamento.findMany({
        //
        where: whereClause,
        orderBy: {
          data: "asc"
        },
        include: {
          caso: {
            select: {
              id: true,
              nomeCompleto: true
            }
          },
          responsavel: {
            select: {
              nome: true
            }
          }
        }
      });
      return reply.status(200).send(appointments);
    } catch (error) {
      if (error instanceof import_zod6.z.ZodError) {
        return reply.status(400).send({ message: "Dados inv\xE1lidos.", errors: error.flatten() });
      }
      console.error("Erro ao buscar agendamentos:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
  app2.get("/cases/:caseId/appointments", async (request, reply) => {
    const paramsSchema = import_zod6.z.object({ caseId: import_zod6.z.string().uuid() });
    try {
      const { caseId } = paramsSchema.parse(request.params);
      const appointments = await prisma.agendamento.findMany({
        //
        where: { casoId: caseId },
        //
        orderBy: { data: "desc" },
        //
        include: {
          responsavel: { select: { id: true, nome: true } }
          //
        }
      });
      return reply.status(200).send(appointments);
    } catch (error) {
      request.log.error(error, "Erro ao buscar agendamentos do caso");
      return reply.status(500).send({ message: "Erro interno ao buscar agendamentos do caso." });
    }
  });
  app2.post("/appointments", async (request, reply) => {
    const { sub: userId } = request.user;
    const createAppointmentSchema = import_zod6.z.object({
      //
      titulo: import_zod6.z.string().min(3, "O t\xEDtulo \xE9 muito curto."),
      //
      data: import_zod6.z.string().min(1, "A data \xE9 obrigat\xF3ria."),
      //
      time: import_zod6.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Hora inv\xE1lida."),
      //
      casoId: import_zod6.z.string().uuid("Selecione um caso."),
      //
      observacoes: import_zod6.z.string().optional()
    });
    try {
      const { titulo, data, time, casoId, observacoes } = createAppointmentSchema.parse(request.body);
      const dataHoraISO = `${data}T${time}:00.000`;
      const newAppointment = await prisma.agendamento.create({
        //
        data: {
          titulo,
          data: new Date(dataHoraISO),
          // Salva o DateTime completo
          observacoes,
          casoId,
          // Campo agora existe no schema
          responsavelId: userId
          // Campo agora existe no schema
        }
      });
      return reply.status(201).send(newAppointment);
    } catch (error) {
      if (error instanceof import_zod6.z.ZodError) {
        return reply.status(400).send({ message: "Dados inv\xE1lidos.", errors: error.flatten() });
      }
      console.error("Erro ao criar agendamento:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
}

// src/routes/reports.ts
var import_zod7 = require("zod");
var import_date_fns4 = require("date-fns");
async function reportRoutes(app2) {
  app2.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
      const { cargo } = request.user;
      if (cargo !== "Gerente") {
        return reply.status(403).send({ message: "Acesso negado. Apenas gerentes podem ver relat\xF3rios." });
      }
    } catch (err) {
      await reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.get("/reports/team-overview", async (request, reply) => {
    try {
      const technicians = await prisma.user.findMany({
        where: {
          cargo: {
            in: ["Agente Social", "Especialista"]
          },
          ativo: true
          //
        },
        select: {
          id: true,
          nome: true,
          cargo: true
        },
        orderBy: {
          cargo: "asc"
        }
      });
      const activeCases = await prisma.case.findMany({
        where: {
          status: {
            not: "DESLIGADO"
          }
        },
        select: {
          id: true,
          nomeCompleto: true,
          status: true,
          agenteAcolhidaId: true,
          //
          especialistaPAEFIId: true
          //
        }
      });
      const overview = technicians.map((tech) => {
        const techCases = activeCases.filter((c) => {
          if (tech.cargo === "Agente Social") {
            return c.agenteAcolhidaId === tech.id && (c.status === "AGUARDANDO_ACOLHIDA" || c.status === "EM_ACOLHIDA");
          }
          if (tech.cargo === "Especialista") {
            return c.especialistaPAEFIId === tech.id && c.status === "EM_ACOMPANHAMENTO_PAEFI";
          }
          return false;
        }).map((c) => ({ id: c.id, nomeCompleto: c.nomeCompleto }));
        return {
          nome: tech.nome,
          //
          cargo: tech.cargo,
          //
          cases: techCases
          //
        };
      });
      return reply.status(200).send(overview);
    } catch (error) {
      console.error("Erro ao gerar relat\xF3rio de equipe:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
  app2.get("/reports/rma", async (request, reply) => {
    const querySchema = import_zod7.z.object({
      month: import_zod7.z.string().regex(/^\d{4}-\d{2}$/, "Formato de m\xEAs inv\xE1lido. Use YYYY-MM.")
    });
    try {
      const { month } = querySchema.parse(request.query);
      const targetMonth = parseISO(month);
      const firstDay = (0, import_date_fns4.startOfMonth)(targetMonth);
      const lastDay = (0, import_date_fns4.endOfMonth)(targetMonth);
      const firstDayOfPreviousMonth = (0, import_date_fns4.startOfMonth)((0, import_date_fns4.subMonths)(targetMonth, 1));
      const lastDayOfPreviousMonth = (0, import_date_fns4.endOfMonth)((0, import_date_fns4.subMonths)(targetMonth, 1));
      const initialCount = await prisma.case.count({
        where: {
          status: "EM_ACOMPANHAMENTO_PAEFI",
          dataInicioPAEFI: {
            lt: firstDay
            // Começou antes do início deste mês
          },
          OR: [
            { dataDesligamento: null },
            // Ainda ativo
            { dataDesligamento: { gte: firstDay } }
            // Ou foi desligado *neste* mês (contava no início)
          ]
        }
      });
      const newEntries = await prisma.case.findMany({
        where: {
          dataInicioPAEFI: {
            gte: firstDay,
            lte: lastDay
          }
        },
        select: {
          id: true,
          sexo: true,
          nascimento: true
        }
      });
      const closedCases = await prisma.case.count({
        where: {
          status: "DESLIGADO",
          dataDesligamento: {
            gte: firstDay,
            lte: lastDay
          }
        }
      });
      const finalCount = initialCount + newEntries.length - closedCases;
      const profileBySex = { masculino: 0, feminino: 0, outro: 0 };
      newEntries.forEach((c) => {
        if (c.sexo === "Masculino") profileBySex.masculino++;
        else if (c.sexo === "Feminino") profileBySex.feminino++;
        else profileBySex.outro++;
      });
      const profileByAgeGroup = {
        //
        "0-6": 0,
        "7-12": 0,
        "13-17": 0,
        "18-29": 0,
        "30-59": 0,
        "60+": 0
      };
      const now = /* @__PURE__ */ new Date();
      newEntries.forEach((c) => {
        const age = now.getFullYear() - new Date(c.nascimento).getFullYear();
        if (age <= 6) profileByAgeGroup["0-6"]++;
        else if (age <= 12) profileByAgeGroup["7-12"]++;
        else if (age <= 17) profileByAgeGroup["13-17"]++;
        else if (age <= 29) profileByAgeGroup["18-29"]++;
        else if (age <= 59) profileByAgeGroup["30-59"]++;
        else profileByAgeGroup["60+"]++;
      });
      const rmaData = {
        //
        initialCount,
        newEntries: newEntries.length,
        closedCases,
        finalCount,
        profileBySex,
        profileByAgeGroup
      };
      return reply.status(200).send(rmaData);
    } catch (error) {
      if (error instanceof import_zod7.z.ZodError) {
        return reply.status(400).send({ message: "Dados inv\xE1lidos.", errors: error.flatten() });
      }
      console.error("Erro ao gerar relat\xF3rio RMA:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
}

// src/routes/alerts.ts
var import_date_fns5 = require("date-fns");
var UPCOMING_DEADLINE_DAYS = 7;
async function alertRoutes(app2) {
  app2.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ message: "N\xE3o autorizado." });
    }
  });
  app2.get("/alerts/paf-deadlines", async (request, reply) => {
    const { sub: userId, cargo } = request.user;
    if (cargo === "Agente Social") {
      return reply.status(200).send([]);
    }
    try {
      const today = (0, import_date_fns5.startOfDay)(/* @__PURE__ */ new Date());
      const cutoffDate = (0, import_date_fns5.endOfDay)((0, import_date_fns5.addDays)(today, UPCOMING_DEADLINE_DAYS));
      const whereClause = {
        // Filtra pelo campo 'deadline' (DateTime)
        deadline: {
          gte: today,
          lte: cutoffDate
        },
        // Usa a relação 'caso' (minúsculo)
        caso: {
          status: "EM_ACOMPANHAMENTO_PAEFI"
          //
        }
      };
      if (cargo === "Especialista") {
        whereClause.caso.especialistaPAEFIId = userId;
      }
      const upcomingPAFs = await prisma.paf.findMany({
        where: whereClause,
        orderBy: {
          deadline: "asc"
          // Ordena pelo campo 'deadline'
        },
        select: {
          id: true,
          deadline: true,
          objetivos: true,
          caso: {
            // Usa a relação 'caso'
            select: {
              id: true,
              nomeCompleto: true,
              //
              especialistaPAEFI: {
                //
                select: {
                  nome: true
                  //
                }
              }
            }
          }
        }
      });
      const formattedAlerts = upcomingPAFs.map((paf) => {
        var _a, _b;
        return {
          pafId: paf.id,
          deadline: paf.deadline,
          caseId: paf.caso.id,
          caseName: paf.caso.nomeCompleto,
          specialistName: ((_a = paf.caso.especialistaPAEFI) == null ? void 0 : _a.nome) ?? "N\xE3o atribu\xEDdo",
          objetivosResumo: ((_b = paf.objetivos) == null ? void 0 : _b.length) > 100 ? paf.objetivos.substring(0, 100) + "..." : paf.objetivos ?? ""
        };
      });
      return reply.status(200).send(formattedAlerts);
    } catch (error) {
      console.error("Erro ao buscar alertas de prazo do PAF:", error);
      return reply.status(500).send({ message: "Erro interno ao buscar alertas." });
    }
  });
}

// src/server.ts
var app = (0, import_fastify.default)({
  logger: {
    transport: {
      target: "pino-pretty"
    }
  }
});
app.register(import_cors.default, {
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
});
app.register(import_jwt.default, {
  secret: process.env.JWT_SECRET
});
app.decorate("authenticate", async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    await reply.send(err);
  }
});
app.register(authRoutes);
app.register(caseRoutes);
app.register(userRoutes);
app.register(evolutionRoutes);
app.register(pafRoutes);
app.register(statsRoutes);
app.register(appointmentRoutes);
app.register(reportRoutes);
app.register(alertRoutes);
app.listen({
  port: 3333,
  host: "0.0.0.0"
}).then(() => {
  console.log("\u{1F680} Servidor HTTP a rodar em http://localhost:3333");
});
