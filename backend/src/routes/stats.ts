// backend/src/routes/stats.ts
import { type FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { startOfMonth, endOfMonth, startOfDay, endOfDay, addDays, subMonths, format } from "date-fns";
import { Cargo, CaseStatus } from "@prisma/client"; 
import { z } from "zod";

export async function statsRoutes(app: FastifyInstance) {
  
  app.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "Não autorizado." });
    }
  });

  /**
   * [GET] /stats/advanced — Dados Gerais e Insights
   */
  app.get("/stats/advanced", async (request, reply) => {
    const { cargo } = request.user as { cargo: string };
    
    const querySchema = z.object({
      months: z.coerce.number().default(12),
      violacao: z.string().optional()
    });
    const { months, violacao } = querySchema.parse(request.query);

    if (cargo !== Cargo.Gerente) return reply.status(403).send({ message: "Acesso restrito." });

    try {
      const today = new Date();
      const startDate = startOfMonth(subMonths(today, months - 1));

      const whereClause: any = {
        OR: [
          { dataEntrada: { gte: startDate } },
          { dataDesligamento: { gte: startDate } }
        ]
      };

      if (violacao && violacao !== 'all') {
        whereClause.violacao = violacao;
      }

      // 1. Buscar dados
      const cases = await prisma.case.findMany({
        where: whereClause,
        select: {
          id: true, dataEntrada: true, dataDesligamento: true, status: true, violacao: true
        }
      });

      // 2. Timeline (Tendência)
      const monthlyStats = new Map<string, { name: string; novos: number; fechados: number }>();
      for (let i = 0; i < months; i++) {
        const d = subMonths(today, (months - 1) - i);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        monthlyStats.set(key, {
          name: d.toLocaleDateString("pt-BR", { month: "short" }).toUpperCase(),
          novos: 0, fechados: 0,
        });
      }

      // 3. Distribuição de Violações (CORREÇÃO APLICADA AQUI)
      const violationCount: Record<string, number> = {};

      cases.forEach(c => {
        // Timeline
        const inKey = `${c.dataEntrada.getFullYear()}-${c.dataEntrada.getMonth()}`;
        if (monthlyStats.has(inKey)) monthlyStats.get(inKey)!.novos++;
        
        if (c.dataDesligamento) {
          const outKey = `${c.dataDesligamento.getFullYear()}-${c.dataDesligamento.getMonth()}`;
          if (monthlyStats.has(outKey)) monthlyStats.get(outKey)!.fechados++;
        }

        // Contagem de Violações
        const v = c.violacao || "Não Informado";
        violationCount[v] = (violationCount[v] || 0) + 1;
      });

      // Transforma o objeto de contagem em array para o gráfico
      const pieData = Object.entries(violationCount)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value) // Ordena do maior para o menor
        .slice(0, 5); // Pega apenas os top 5

      // 4. Tempo Médio
      const closedCases = cases.filter(c => c.dataDesligamento);
      const totalDays = closedCases.reduce((acc, c) => {
        return acc + Math.ceil(Math.abs(c.dataDesligamento!.getTime() - c.dataEntrada.getTime()) / (86400000));
      }, 0);
      const avgHandlingTime = closedCases.length > 0 ? Math.round(totalDays / closedCases.length) : 0;

      // 5. Insights
      const activeTotal = await prisma.case.count({ where: { status: { not: CaseStatus.DESLIGADO } } });
      const insights: string[] = [];
      const trendData = Array.from(monthlyStats.values());
      const last = trendData[trendData.length - 1];
      const prev = trendData[trendData.length - 2];

      if (last && prev && prev.novos > 0) {
        const diff = ((last.novos - prev.novos) / prev.novos) * 100;
        if (diff > 15) insights.push(`📈 Aumento de ${Math.round(diff)}% na demanda.`);
        else if (diff < -15) insights.push(`📉 Queda de ${Math.abs(Math.round(diff))}% na demanda.`);
      }
      if (avgHandlingTime > 120) insights.push(`⚠️ Tempo médio alto (${avgHandlingTime} dias).`);
      
      // Insight sobre violação
      if (pieData.length > 0) {
        insights.push(`🔍 Principal demanda: ${pieData[0].name} (${pieData[0].value} casos).`);
      }

      return reply.send({
        trendData,
        avgHandlingTime,
        totalActive: activeTotal,
        insights,
        pieData // Agora enviamos os dados reais
      });

    } catch (error) {
      console.error(error);
      return reply.status(500).send({ message: "Erro interno." });
    }
  });

  // [GET] /stats/productivity
  app.get("/stats/productivity", async (request, reply) => {
    try {
      const users = await prisma.user.findMany({
        where: { ativo: true, cargo: { not: Cargo.Gerente } },
        select: {
          id: true, nome: true, cargo: true,
          _count: {
            select: {
              casosDeAcolhida: { where: { status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] } } },
              casosDeAcompanhamento: { where: { status: CaseStatus.EM_ACOMPANHAMENTO_PAEFI } }
            }
          }
        }
      });

      const data = users.map(u => ({
        name: u.nome.split(' ')[0],
        value: u._count.casosDeAcolhida + u._count.casosDeAcompanhamento,
        role: u.cargo
      })).sort((a,b) => b.value - a.value);

      return reply.send(data);
    } catch (error) {
      return reply.status(500).send([]);
    }
  });

  // [GET] /stats/heatmap
  app.get("/stats/heatmap", async (request, reply) => {
    const querySchema = z.object({ months: z.coerce.number().default(12) });
    const { months } = querySchema.parse(request.query);

    try {
      const startDate = subMonths(new Date(), months);
      const logs = await prisma.caseLog.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true }
      });

      const map = new Map<string, number>();
      logs.forEach(l => {
        const day = format(l.createdAt, 'yyyy-MM-dd');
        map.set(day, (map.get(day) || 0) + 1);
      });

      const result = Array.from(map.entries()).map(([date, count]) => ({ date, count }));
      return reply.send(result);
    } catch (error) {
      return reply.status(500).send([]);
    }
  });

  // [GET] /stats (Legado/Operacional)
  app.get("/stats", async (request, reply) => {
    const { cargo, sub: userId } = request.user as { cargo: string; sub: string };
    const today = new Date();
    const firstDayOfMonth = startOfMonth(today);
    const lastDayOfMonth = endOfMonth(today);

    try {
      if (cargo === Cargo.Gerente) {
        const [totalCases, acolhidasCount, acompanhamentosCount, newCases, closedCases] = await Promise.all([
          prisma.case.count(),
          prisma.case.count({ where: { status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] } } }),
          prisma.case.count({ where: { status: CaseStatus.EM_ACOMPANHAMENTO_PAEFI } }),
          prisma.case.count({ where: { dataEntrada: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
          prisma.case.count({ where: { status: CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } })
        ]);

        const [agentWorkload, specialistWorkload] = await Promise.all([
          prisma.user.findMany({
            where: { cargo: Cargo.Agente_Social, ativo: true },
            select: { nome: true, casosDeAcolhida: { where: { status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] } } } }
          }),
          prisma.user.findMany({
            where: { cargo: Cargo.Especialista, ativo: true },
            select: { nome: true, casosDeAcompanhamento: { where: { status: CaseStatus.EM_ACOMPANHAMENTO_PAEFI } } }
          })
        ]);

        const [urgencyGroups, categoryGroups, violationGroups] = await Promise.all([
            prisma.case.groupBy({ by: ['urgencia'], _count: { _all: true }, where: { status: { not: CaseStatus.DESLIGADO } } }),
            prisma.case.groupBy({ by: ['categoria'], _count: { _all: true }, where: { status: { not: CaseStatus.DESLIGADO } } }),
            prisma.case.groupBy({ by: ['violacao'], _count: { _all: true }, where: { status: { not: CaseStatus.DESLIGADO } } })
        ]);

        return reply.send({
          role: 'Gerente',
          totalCases, acolhidasCount, acompanhamentosCount, 
          newCasesThisMonth: newCases, closedCasesThisMonth: closedCases,
          workloadByAgent: agentWorkload.map(u => ({ name: u.nome, value: u.casosDeAcolhida.length })),
          workloadBySpecialist: specialistWorkload.map(u => ({ name: u.nome, value: u.casosDeAcompanhamento.length })),
          casesByUrgency: urgencyGroups.map(g => ({ name: g.urgencia, value: g._count._all })),
          casesByCategory: categoryGroups.map(g => ({ name: g.categoria, value: g._count._all })),
          productivity: [...agentWorkload, ...specialistWorkload].map(u => ({ name: u.nome, value: (u.casosDeAcolhida?.length || 0) + (u.casosDeAcompanhamento?.length || 0) }))
        });
      }

      if (cargo === Cargo.Agente_Social) {
        const [myActive, myClosed, myNew] = await Promise.all([
          prisma.case.count({ where: { agenteAcolhidaId: userId, status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] } } }),
          prisma.case.count({ where: { agenteAcolhidaId: userId, status: CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
          prisma.case.count({ where: { agenteAcolhidaId: userId, dataEntrada: { gte: firstDayOfMonth, lte: lastDayOfMonth } } })
        ]);
        return reply.send({ role: 'Agente Social', myActiveCases: myActive, myClosedMonth: myClosed, myNewCasesMonth: myNew });
      }

      if (cargo === Cargo.Especialista) {
        const [myActive, myClosed, myNew] = await Promise.all([
          prisma.case.count({ where: { especialistaPAEFIId: userId, status: CaseStatus.EM_ACOMPANHAMENTO_PAEFI } }),
          prisma.case.count({ where: { especialistaPAEFIId: userId, status: CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
          prisma.case.count({ where: { especialistaPAEFIId: userId, dataInicioPAEFI: { gte: firstDayOfMonth, lte: lastDayOfMonth } } })
        ]);
        return reply.send({ role: 'Especialista', myActiveCases: myActive, myClosedMonth: myClosed, myNewCasesMonth: myNew });
      }

      return reply.status(200).send({ message: "Sem dados." });
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ message: "Erro no servidor." });
    }
  });

  app.get("/stats/my-agenda", async (request, reply) => {
    const { sub: userId } = request.user as { sub: string };
    try {
      const start = startOfDay(new Date());
      const end = endOfDay(addDays(start, 30));
      const appointments = await prisma.agendamento.findMany({
        where: { responsavelId: userId, data: { gte: start, lte: end } },
        orderBy: { data: "asc" },
        take: 5,
        include: { caso: { select: { id: true, nomeCompleto: true } } }
      });
      return reply.send(appointments);
    } catch {
      return reply.status(500).send({ message: "Erro ao buscar agenda." });
    }
  });
}