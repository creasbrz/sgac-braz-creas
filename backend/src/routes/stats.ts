// backend/src/routes/stats.ts
import { type FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma"; //
import { 
  startOfMonth, 
  endOfMonth, 
  startOfDay, 
  endOfDay, 
  addDays 
} from "date-fns";

export async function statsRoutes(app: FastifyInstance) {
  // Proteção: todas as rotas exigem JWT
  app.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "Não autorizado." });
    }
  });

  /**
   * ======================================================
   * GET /stats  → Painel do Gerente E Relatórios
   * ======================================================
   */
  app.get("/stats", async (request, reply) => {
    const { cargo } = request.user as { cargo: string };

    if (cargo !== "Gerente") {
      return reply.status(403).send({ message: "Acesso negado." });
    }

    try {
      const today = new Date();
      const firstDayOfMonth = startOfMonth(today);
      const lastDayOfMonth  = endOfMonth(today);

      /** =======================
       * 1. CONTAGENS PRINCIPAIS
       * =======================*/
      const totalCases = await prisma.case.count();

      const acolhidasCount = await prisma.case.count({
        where: {
          status: { in: ["AGUARDANDO_ACOLHIDA", "EM_ACOLHIDA"] },
        },
      });

      const acompanhamentosCount = await prisma.case.count({
        where: { status: "EM_ACOMPANHAMENTO_PAEFI" },
      });

      const newCasesThisMonth = await prisma.case.count({
        where: {
          dataEntrada: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth,
          },
        },
      });

      const closedCasesThisMonth = await prisma.case.count({
        where: {
          status: "DESLIGADO",
          dataDesligamento: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth,
          },
        },
      });

      /** ==================================
       * 2. WORKLOAD (Carga de Trabalho)
       * ==================================*/

      // --- CORREÇÃO AQUI ---
      // Removido o 'OR: [{ativo: true}, {ativo: null}]' que causava o erro 500
      // Como o campo é obrigatório no banco, buscamos apenas 'ativo: true'
      
      const agentWorkload = await prisma.user.findMany({
        where: {
          cargo: "Agente Social",
          ativo: true, 
        },
        select: {
          nome: true,
          casosDeAcolhida: {
            where: { status: { in: ["AGUARDANDO_ACOLHIDA", "EM_ACOLHIDA"] } },
          },
        },
      });

      const specialistWorkload = await prisma.user.findMany({
        where: {
          cargo: "Especialista",
          ativo: true,
        },
        select: {
          nome: true,
          casosDeAcompanhamento: {
            where: { status: "EM_ACOMPANHAMENTO_PAEFI" },
          },
        },
      });
      // --- FIM DA CORREÇÃO ---

      const workloadByAgent = agentWorkload.map((u) => ({
        name: u.nome,
        value: u.casosDeAcolhida?.length ?? 0,
      }));

      const workloadBySpecialist = specialistWorkload.map((u) => ({
        name: u.nome,
        value: u.casosDeAcompanhamento?.length ?? 0,
      }));

      /** ==================================
       * 3. ESTATÍSTICAS PARA RELATÓRIOS
       * ==================================*/
      
      const productivity = [...workloadByAgent, ...workloadBySpecialist].sort((a,b) => b.value - a.value);

      const urgencyGroups = await prisma.case.groupBy({
        by: ['urgencia'],
        _count: { _all: true },
        where: { status: { not: 'DESLIGADO' } },
      });
      const casesByUrgency = urgencyGroups.map(g => ({ name: g.urgencia, value: g._count._all }));

      const categoryGroups = await prisma.case.groupBy({
        by: ['categoria'],
        _count: { _all: true },
        where: { status: { not: 'DESLIGADO' } },
      });
      const casesByCategory = categoryGroups.map(g => ({ name: g.categoria, value: g._count._all }));

      const violationGroups = await prisma.case.groupBy({
        by: ['violacao'],
        _count: { _all: true },
        where: { status: { not: 'DESLIGADO' } },
      });
      const casesByViolation = violationGroups.map(g => ({ name: g.violacao, value: g._count._all }));

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
      console.error("Erro ao buscar estatísticas:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });

  /**
   * ======================================================
   * GET /stats/my-agenda
   * ======================================================
   */
  app.get("/stats/my-agenda", async (request, reply) => {
    const { sub: userId } = request.user as { sub: string };

    try {
      const today = startOfDay(new Date());
      const cutoffDate = endOfDay(addDays(today, 30));

      const appointments = await prisma.agendamento.findMany({
        where: {
          responsavelId: userId,
          data: {
            gte: today,
            lte: cutoffDate,
          },
        },
        orderBy: { data: "asc" },
        take: 5,
        include: {
          caso: {
            select: { id: true, nomeCompleto: true },
          },
        },
      });

      return reply.status(200).send(appointments);

    } catch (error) {
      console.error("Erro ao buscar próximos agendamentos:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });
}