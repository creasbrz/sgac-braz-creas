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

  // 1. Rota Principal do Dashboard (/stats)
  // Retorna números gerais para o Gerente ou números pessoais para Agentes/Especialistas
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
          acompanhamentosCount, 
          monitoringCount,
          newCases, 
          closedCases,
          workloadAgent,
          workloadSpec,
          urgencyGroups, 
          categoryGroups
        ] = await Promise.all([
          // Total Geral
          prisma.case.count(),
          
          // Total em Acolhida/Triagem
          prisma.case.count({ where: { status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] } } }),
          
          // Total em Acompanhamento Ativo (PAEFI + Acolhida Especializada)
          prisma.case.count({ where: { status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO_PAEFI] } } }),
          
          // Total em Monitoramento
          prisma.case.count({ where: { status: CaseStatus.EM_MONITORAMENTO } }),
          
          // Novos este mês
          prisma.case.count({ where: { dataEntrada: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
          
          // Fechados este mês
          prisma.case.count({ where: { status: CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
          
          // Carga por Agente (Apenas casos de acolhida)
          prisma.case.groupBy({
            by: ['agenteAcolhidaId'],
            where: { status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] }, agenteAcolhidaId: { not: null } },
            _count: { _all: true }
          }),
          
          // Carga por Especialista (Apenas casos ativos de PAEFI/Esp)
          prisma.case.groupBy({
            by: ['especialistaPAEFIId'],
            where: { status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO_PAEFI] }, especialistaPAEFIId: { not: null } },
            _count: { _all: true }
          }),

          // Agrupamentos Demográficos
          prisma.case.groupBy({ by: ['urgencia'], _count: { _all: true }, where: { status: { not: CaseStatus.DESLIGADO } } }),
          prisma.case.groupBy({ by: ['categoria'], _count: { _all: true }, where: { status: { not: CaseStatus.DESLIGADO } } }),
        ]);

        // Mapear IDs para Nomes para os gráficos
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
          monitoringCount,
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

    // --- LÓGICA PARA TÉCNICOS (Agentes e Especialistas) ---
    const today = new Date();
    const firstDayOfMonth = startOfMonth(today);
    const lastDayOfMonth = endOfMonth(today);

    try {
      if (cargo === Cargo.Agente_Social) {
        // Agente vê: Triagem Ativa + Seus Fechados + Seus Novos
        const [myActive, myClosed, myNew] = await Promise.all([
          prisma.case.count({ where: { agenteAcolhidaId: userId, status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] } } }),
          prisma.case.count({ where: { agenteAcolhidaId: userId, status: CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
          prisma.case.count({ where: { agenteAcolhidaId: userId, dataEntrada: { gte: firstDayOfMonth, lte: lastDayOfMonth } } })
        ]);
        return reply.send({ role: 'Agente_Social', myActiveCases: myActive, myClosedMonth: myClosed, myNewCasesMonth: myNew });
      }

      if (cargo === Cargo.Especialista) {
        // Especialista vê: PAEFI + Acolhida Esp + Monitoramento
        const [myActive, myClosed, myNew] = await Promise.all([
          prisma.case.count({ 
            where: { 
              especialistaPAEFIId: userId, 
              status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO_PAEFI, CaseStatus.EM_MONITORAMENTO] } 
            } 
          }),
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

  // 2. Rota de Produtividade da Equipe (/stats/productivity)
  // Alimenta a página TeamOverview.tsx
  app.get("/stats/productivity", async (request, reply) => {
    try {
      // A. Buscar todos os usuários ativos da equipe (exclui Gerente)
      const users = await prisma.user.findMany({
        where: { ativo: true, cargo: { not: Cargo.Gerente } },
        select: { id: true, nome: true, cargo: true }
      });

      // B. Agrupar contagens por Especialista e Status (Para PAEFI e Monitoramento)
      const specialistStats = await prisma.case.groupBy({
        by: ['especialistaPAEFIId', 'status'],
        where: {
          especialistaPAEFIId: { in: users.map(u => u.id) },
          status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO_PAEFI, CaseStatus.EM_MONITORAMENTO] }
        },
        _count: { _all: true }
      });

      // C. Agrupar contagens por Agente e Status (Para Triagem/Acolhida)
      // Nota: Ignoramos 'AGUARDANDO_DISTRIBUICAO_PAEFI' aqui pois é responsabilidade do Gerente
      const agentStats = await prisma.case.groupBy({
        by: ['agenteAcolhidaId', 'status'],
        where: {
          agenteAcolhidaId: { in: users.map(u => u.id) },
          status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] }
        },
        _count: { _all: true }
      });

      // D. Processar e Combinar Dados para o Frontend
      const data = users.map(u => {
        let active = 0;
        let monitoring = 0;

        if (u.cargo === Cargo.Especialista) {
          // Filtrar estatísticas deste especialista
          const stats = specialistStats.filter(s => s.especialistaPAEFIId === u.id);
          
          // Somar Ativos (Acolhida Especializada + PAEFI)
          active = stats
            .filter(s => s.status === CaseStatus.EM_ACOLHIDA_ESPECIALIZADA || s.status === CaseStatus.EM_ACOMPANHAMENTO_PAEFI)
            .reduce((acc, curr) => acc + curr._count._all, 0);
            
          // Somar Monitoramento
          monitoring = stats
            .filter(s => s.status === CaseStatus.EM_MONITORAMENTO)
            .reduce((acc, curr) => acc + curr._count._all, 0);
        } 
        else if (u.cargo === Cargo.Agente_Social) {
          // Para agentes, "Ativo" são os casos em acolhida/triagem
          const stats = agentStats.filter(s => s.agenteAcolhidaId === u.id);
          active = stats.reduce((acc, curr) => acc + curr._count._all, 0);
        }

        return {
          id: u.id,
          name: u.nome,
          role: u.cargo,
          active,
          monitoring,
          // Peso para ordenação: Monitoramento pesa apenas 20% de um caso ativo
          totalLoad: active + (monitoring * 0.2) 
        };
      }).sort((a,b) => b.totalLoad - a.totalLoad); // Ordena do mais sobrecarregado para o menos

      return reply.send(data);
    } catch (error) { 
      console.error("Erro em /stats/productivity:", error);
      return reply.status(500).send([]); 
    }
  });

  // 3. Rota de Analytics Avançado (/stats/advanced)
  app.get("/stats/advanced", async (request, reply) => {
    const { cargo } = request.user as { cargo: string };
    const querySchema = z.object({ months: z.coerce.number().default(12), violacao: z.string().optional() });
    const { months, violacao } = querySchema.parse(request.query);
    
    if (cargo !== Cargo.Gerente) return reply.status(403).send({ message: "Acesso restrito." });
    
    try {
      const today = new Date();
      const startDate = startOfMonth(subMonths(today, months - 1));
      
      const whereClause: any = { OR: [{ dataEntrada: { gte: startDate } }, { dataDesligamento: { gte: startDate } }] };
      if (violacao && violacao !== 'all') { whereClause.violacao = violacao; }
      
      const cases = await prisma.case.findMany({ 
        where: whereClause, 
        select: { id: true, dataEntrada: true, dataDesligamento: true, status: true, violacao: true } 
      });
      
      // Inicializar mapa de meses
      const monthlyStats = new Map<string, { name: string; novos: number; fechados: number }>();
      for (let i = 0; i < months; i++) {
        const d = subMonths(today, (months - 1) - i);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        monthlyStats.set(key, { name: d.toLocaleDateString("pt-BR", { month: "short" }).toUpperCase(), novos: 0, fechados: 0 });
      }
      
      const violationCount: Record<string, number> = {};
      
      cases.forEach(c => {
        // Contabilizar Novos
        const inKey = `${c.dataEntrada.getFullYear()}-${c.dataEntrada.getMonth()}`;
        if (monthlyStats.has(inKey)) monthlyStats.get(inKey)!.novos++;
        
        // Contabilizar Fechados
        if (c.dataDesligamento) {
          const outKey = `${c.dataDesligamento.getFullYear()}-${c.dataDesligamento.getMonth()}`;
          if (monthlyStats.has(outKey)) monthlyStats.get(outKey)!.fechados++;
        }
        
        // Contabilizar Violações
        const v = c.violacao || "Não Informado";
        violationCount[v] = (violationCount[v] || 0) + 1;
      });
      
      const pieData = Object.entries(violationCount)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // Top 5 violações
      
      // Calcular Tempo Médio
      const closedCases = cases.filter(c => c.dataDesligamento);
      const totalDays = closedCases.reduce((acc, c) => { 
        return acc + Math.ceil(Math.abs(c.dataDesligamento!.getTime() - c.dataEntrada.getTime()) / (86400000)); 
      }, 0);
      const avgHandlingTime = closedCases.length > 0 ? Math.round(totalDays / closedCases.length) : 0;
      
      const activeTotal = await prisma.case.count({ where: { status: { not: CaseStatus.DESLIGADO } } });
      
      // Gerar Insights Automáticos
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
    } catch (error) { 
      return reply.status(500).send({ message: "Erro interno ao processar analytics." }); 
    }
  });

  // 4. Rota de Mapa de Calor (/stats/heatmap)
  app.get("/stats/heatmap", async (request, reply) => {
    const querySchema = z.object({ months: z.coerce.number().default(12) });
    const { months } = querySchema.parse(request.query);
    try {
      const startDate = subMonths(new Date(), months);
      // Busca logs para montar o heatmap de atividade
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
    } catch (error) { return reply.status(500).send([]); }
  });

  // 5. Rota de Agenda Pessoal (/stats/my-agenda)
  app.get("/stats/my-agenda", async (request, reply) => {
    const { sub: userId } = request.user as { sub: string };
    try {
      const start = startOfDay(new Date());
      // Próximos 5 agendamentos do usuário
      const appointments = await prisma.agendamento.findMany({ 
        where: { responsavelId: userId, data: { gte: start } }, 
        orderBy: { data: "asc" }, 
        take: 5, 
        include: { caso: { select: { id: true, nomeCompleto: true } } } 
      });
      return reply.send(appointments);
    } catch { return reply.status(500).send({ message: "Erro ao buscar agenda." }); }
  });
}