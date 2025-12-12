// backend/src/routes/stats.ts
import { type FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { startOfMonth, endOfMonth, startOfDay, subMonths, format } from "date-fns";
import { Cargo, CaseStatus } from "@prisma/client"; 
import { z } from "zod";
import { cache } from "../lib/cache";

export async function statsRoutes(app: FastifyInstance) {
  
  app.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "Não autorizado." });
    }
  });

  app.get("/stats", async (request, reply) => {
    const { cargo, sub: userId } = request.user as { cargo: string; sub: string };
    
    // --- LÓGICA PARA GERENTE ---
    if (cargo === Cargo.Gerente) {
      const cacheKey = "manager_stats_main";
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        reply.header('X-Cache', 'HIT');
        return reply.send(cachedData);
      }

      const today = new Date();
      const firstDayOfMonth = startOfMonth(today);
      const lastDayOfMonth = endOfMonth(today);

      try {
        const [
          totalCases, 
          acolhidasCount, 
          acompanhamentosCount, // [NOTA] Isso inclui Especializada + PAEFI Contínuo
          newCases, 
          closedCases,
          workloadAgent,
          workloadSpec,
          urgencyGroups, 
          categoryGroups
        ] = await Promise.all([
          prisma.case.count(),
          prisma.case.count({ where: { status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] } } }),
          // [ATUALIZAÇÃO] Soma os dois status de PAEFI
          prisma.case.count({ where: { status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO_PAEFI] } } }),
          prisma.case.count({ where: { dataEntrada: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
          prisma.case.count({ where: { status: CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
          
          prisma.case.groupBy({
            by: ['agenteAcolhidaId'],
            where: { status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] }, agenteAcolhidaId: { not: null } },
            _count: { _all: true }
          }),
          prisma.case.groupBy({
            by: ['especialistaPAEFIId'],
            // [ATUALIZAÇÃO] Agrupa carga considerando ambos os status
            where: { status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO_PAEFI] }, especialistaPAEFIId: { not: null } },
            _count: { _all: true }
          }),

          prisma.case.groupBy({ by: ['urgencia'], _count: { _all: true }, where: { status: { not: CaseStatus.DESLIGADO } } }),
          prisma.case.groupBy({ by: ['categoria'], _count: { _all: true }, where: { status: { not: CaseStatus.DESLIGADO } } }),
        ]);

        const userIds = [
            ...new Set([
                ...workloadAgent.map(w => w.agenteAcolhidaId), 
                ...workloadSpec.map(w => w.especialistaPAEFIId)
            ])
        ].filter(id => id !== null) as string[];
        
        const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, nome: true } });
        const userMap = new Map(users.map(u => [u.id, u.nome]));

        const result = {
          role: 'Gerente',
          totalCases, 
          acolhidasCount, 
          acompanhamentosCount, 
          newCasesThisMonth: newCases, 
          closedCasesThisMonth: closedCases,
          workloadByAgent: workloadAgent.map(w => ({ name: userMap.get(w.agenteAcolhidaId!) || 'Desc.', value: w._count._all })),
          workloadBySpecialist: workloadSpec.map(w => ({ name: userMap.get(w.especialistaPAEFIId!) || 'Desc.', value: w._count._all })),
          casesByUrgency: urgencyGroups.map(g => ({ name: g.urgencia, value: g._count._all })),
          casesByCategory: categoryGroups.map(g => ({ name: g.categoria, value: g._count._all })),
          productivity: [],
          lastUpdated: new Date().toISOString()
        };

        cache.set(cacheKey, result);
        reply.header('X-Cache', 'MISS');
        return reply.send(result);

      } catch (error) {
        console.error("Erro ao gerar estatísticas gerenciais:", error);
        return reply.status(500).send({ message: "Erro ao processar dados analíticos." });
      }
    }

    // --- LÓGICA PARA TÉCNICOS ---
    const today = new Date();
    const firstDayOfMonth = startOfMonth(today);
    const lastDayOfMonth = endOfMonth(today);

    try {
      if (cargo === Cargo.Agente_Social) {
        const [myActive, myClosed, myNew] = await Promise.all([
          prisma.case.count({ where: { agenteAcolhidaId: userId, status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] } } }),
          prisma.case.count({ where: { agenteAcolhidaId: userId, status: CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
          prisma.case.count({ where: { agenteAcolhidaId: userId, dataEntrada: { gte: firstDayOfMonth, lte: lastDayOfMonth } } })
        ]);
        return reply.send({ role: 'Agente_Social', myActiveCases: myActive, myClosedMonth: myClosed, myNewCasesMonth: myNew });
      }

      if (cargo === Cargo.Especialista) {
        const [myActive, myClosed, myNew] = await Promise.all([
          // [ATUALIZAÇÃO] Considera ambos os status como "Ativos" para o técnico
          prisma.case.count({ where: { especialistaPAEFIId: userId, status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO_PAEFI] } } }),
          prisma.case.count({ where: { especialistaPAEFIId: userId, status: CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
          prisma.case.count({ where: { especialistaPAEFIId: userId, dataInicioPAEFI: { gte: firstDayOfMonth, lte: lastDayOfMonth } } })
        ]);
        return reply.send({ role: 'Especialista', myActiveCases: myActive, myClosedMonth: myClosed, myNewCasesMonth: myNew });
      }

      return reply.status(200).send({ message: "Sem dados disponíveis para este perfil." });

    } catch (error) {
      console.error("Erro ao buscar estatísticas pessoais:", error);
      return reply.status(500).send({ message: "Erro interno no servidor." });
    }
  });

  // Rotas Advanced (Analytics e Productivity) mantêm-se iguais por enquanto,
  // pois usam queries genéricas que já capturam os novos status via 'status != DESLIGADO'.
  // ... (código existente mantido) ...
  
  app.get("/stats/advanced", async (request, reply) => {
    // ... (mesmo código da versão anterior)
    const { cargo } = request.user as { cargo: string };
    const querySchema = z.object({ months: z.coerce.number().default(12), violacao: z.string().optional() });
    const { months, violacao } = querySchema.parse(request.query);
    if (cargo !== Cargo.Gerente) return reply.status(403).send({ message: "Acesso restrito." });
    try {
      const today = new Date();
      const startDate = startOfMonth(subMonths(today, months - 1));
      const whereClause: any = { OR: [{ dataEntrada: { gte: startDate } }, { dataDesligamento: { gte: startDate } }] };
      if (violacao && violacao !== 'all') { whereClause.violacao = violacao; }
      const cases = await prisma.case.findMany({ where: whereClause, select: { id: true, dataEntrada: true, dataDesligamento: true, status: true, violacao: true } });
      const monthlyStats = new Map<string, { name: string; novos: number; fechados: number }>();
      for (let i = 0; i < months; i++) {
        const d = subMonths(today, (months - 1) - i);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        monthlyStats.set(key, { name: d.toLocaleDateString("pt-BR", { month: "short" }).toUpperCase(), novos: 0, fechados: 0 });
      }
      const violationCount: Record<string, number> = {};
      cases.forEach(c => {
        const inKey = `${c.dataEntrada.getFullYear()}-${c.dataEntrada.getMonth()}`;
        if (monthlyStats.has(inKey)) monthlyStats.get(inKey)!.novos++;
        if (c.dataDesligamento) {
          const outKey = `${c.dataDesligamento.getFullYear()}-${c.dataDesligamento.getMonth()}`;
          if (monthlyStats.has(outKey)) monthlyStats.get(outKey)!.fechados++;
        }
        const v = c.violacao || "Não Informado";
        violationCount[v] = (violationCount[v] || 0) + 1;
      });
      const pieData = Object.entries(violationCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
      const closedCases = cases.filter(c => c.dataDesligamento);
      const totalDays = closedCases.reduce((acc, c) => { return acc + Math.ceil(Math.abs(c.dataDesligamento!.getTime() - c.dataEntrada.getTime()) / (86400000)); }, 0);
      const avgHandlingTime = closedCases.length > 0 ? Math.round(totalDays / closedCases.length) : 0;
      const activeTotal = await prisma.case.count({ where: { status: { not: CaseStatus.DESLIGADO } } });
      const insights: string[] = [];
      const trendData = Array.from(monthlyStats.values());
      const last = trendData[trendData.length - 1];
      const prev = trendData[trendData.length - 2];
      if (last && prev && prev.novos > 0) {
        const diff = ((last.novos - prev.novos) / prev.novos) * 100;
        if (diff > 15) insights.push(`📈 Aumento súbito de ${Math.round(diff)}% na demanda este mês.`);
        else if (diff < -15) insights.push(`📉 Queda de ${Math.abs(Math.round(diff))}% na demanda este mês.`);
      }
      if (avgHandlingTime > 120) insights.push(`⚠️ Tempo médio de acompanhamento alto (${avgHandlingTime} dias).`);
      if (pieData.length > 0) insights.push(`🔍 Principal demanda local: ${pieData[0].name} (${pieData[0].value} casos).`);
      return reply.send({ trendData, avgHandlingTime, totalActive: activeTotal, insights, pieData });
    } catch (error) { return reply.status(500).send({ message: "Erro interno ao processar analytics." }); }
  });

  app.get("/stats/productivity", async (request, reply) => {
    try {
      const users = await prisma.user.findMany({
        where: { ativo: true, cargo: { not: Cargo.Gerente } },
        select: {
          id: true, nome: true, cargo: true,
          _count: {
            select: {
              casosDeAcolhida: { where: { status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] } } },
              // [ATUALIZAÇÃO]
              casosDeAcompanhamento: { where: { status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO_PAEFI] } } }
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
    } catch (error) { return reply.status(500).send([]); }
  });

  app.get("/stats/heatmap", async (request, reply) => {
    const querySchema = z.object({ months: z.coerce.number().default(12) });
    const { months } = querySchema.parse(request.query);
    try {
      const startDate = subMonths(new Date(), months);
      const logCounts = await prisma.caseLog.groupBy({ by: ['createdAt'], where: { createdAt: { gte: startDate } }, _count: { _all: true } });
      const logs = await prisma.caseLog.findMany({ where: { createdAt: { gte: startDate } }, select: { createdAt: true } });
      const map = new Map<string, number>();
      logs.forEach(l => { const day = format(l.createdAt, 'yyyy-MM-dd'); map.set(day, (map.get(day) || 0) + 1); });
      const result = Array.from(map.entries()).map(([date, count]) => ({ date, count }));
      return reply.send(result);
    } catch (error) { return reply.status(500).send([]); }
  });

  app.get("/stats/my-agenda", async (request, reply) => {
    const { sub: userId } = request.user as { sub: string };
    try {
      const start = startOfDay(new Date());
      const appointments = await prisma.agendamento.findMany({ where: { responsavelId: userId, data: { gte: start } }, orderBy: { data: "asc" }, take: 5, include: { caso: { select: { id: true, nomeCompleto: true } } } });
      return reply.send(appointments);
    } catch { return reply.status(500).send({ message: "Erro ao buscar agenda." }); }
  });
}