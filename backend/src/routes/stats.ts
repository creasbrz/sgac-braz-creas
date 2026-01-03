// backend/src/routes/stats.ts
import { type FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { startOfMonth, endOfMonth, startOfDay, subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Cargo, CaseStatus, LogAction } from "@prisma/client"; 
import { z } from "zod";
import { cache } from "../lib/cache";

// Função auxiliar de peso para urgência (Mapa de Calor)
const calculateUrgencyWeight = (urgencia: string | null): number => {
  if (!urgencia) return 1;
  const term = urgencia.trim();
  if (['Convive com agressor', 'Idoso 80+', 'Primeira infância', 'Risco de morte'].includes(term)) return 4;
  if (['Risco de reincidência', 'Sofre ameaça', 'Risco de desabrigo', 'Criança/Adolescente'].includes(term)) return 3;
  if (['PCD', 'Idoso', 'Internação', 'Acolhimento', 'Gestante/Lactante'].includes(term)) return 2;
  return 1;
}

export async function statsRoutes(app: FastifyInstance) {
  
  // Middleware de Autenticação Global
  app.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "Não autorizado." });
    }
  });

  // 1. DASHBOARD GERAL (/stats)
  app.get("/stats", async (request, reply) => {
    const { cargo, sub: userId } = request.user as { cargo: string; sub: string };
    
    // --- LÓGICA DO GERENTE (COM CACHE) ---
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
          prisma.case.count({ where: { status: { not: CaseStatus.DESLIGADO } } }), // Total Ativos
          prisma.case.count({ where: { status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] } } }),
          prisma.case.count({ where: { status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO_PAEFI] } } }),
          prisma.case.count({ where: { status: CaseStatus.EM_MONITORAMENTO } }),
          prisma.case.count({ where: { dataEntrada: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
          prisma.case.count({ where: { status: CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
          
          // Agrupamentos
          prisma.case.groupBy({
            by: ['agenteAcolhidaId'],
            where: { status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] }, agenteAcolhidaId: { not: null } },
            _count: { _all: true }
          }),
          
          prisma.case.groupBy({
            by: ['especialistaPAEFIId'],
            where: { status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO_PAEFI] }, especialistaPAEFIId: { not: null } },
            _count: { _all: true }
          }),

          prisma.case.groupBy({ by: ['urgencia'], _count: { _all: true }, where: { status: { not: CaseStatus.DESLIGADO } } }),
          prisma.case.groupBy({ by: ['categoria'], _count: { _all: true }, where: { status: { not: CaseStatus.DESLIGADO } } }),
        ]);

        // Mapear IDs para Nomes
        const userIds = new Set([
          ...workloadAgent.map(w => w.agenteAcolhidaId), 
          ...workloadSpec.map(w => w.especialistaPAEFIId)
        ].filter(Boolean) as string[]);
        
        const users = await prisma.user.findMany({ where: { id: { in: Array.from(userIds) } }, select: { id: true, nome: true } });
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
          casesByUrgency: urgencyGroups.map(g => ({ name: g.urgencia || 'Não classificado', value: g._count._all })),
          casesByCategory: categoryGroups.map(g => ({ name: g.categoria || 'Não classificado', value: g._count._all })),
          lastUpdated: new Date().toISOString()
        };

        // Salva no cache por 5 minutos (configurado no cache.ts)
        cache.set(cacheKey, result);
        reply.header('X-Cache', 'MISS');
        return reply.send(result);

      } catch (error) {
        console.error("Erro stats:", error);
        return reply.status(500).send({ message: "Erro ao processar dados." });
      }
    }

    // --- LÓGICA DO TÉCNICO (Individual - Sem Cache pesado) ---
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
          prisma.case.count({ where: { especialistaPAEFIId: userId, status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO_PAEFI, CaseStatus.EM_MONITORAMENTO] } } }),
          prisma.case.count({ where: { especialistaPAEFIId: userId, status: CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
          prisma.case.count({ where: { especialistaPAEFIId: userId, dataInicioPAEFI: { gte: firstDayOfMonth, lte: lastDayOfMonth } } })
        ]);
        return reply.send({ role: 'Especialista', myActiveCases: myActive, myClosedMonth: myClosed, myNewCasesMonth: myNew });
      }
      return reply.status(200).send({ message: "Sem dados específicos." });
    } catch (error) { return reply.status(500).send({ message: "Erro interno." }); }
  });

  // 2. PRODUTIVIDADE E PERFORMANCE (/stats/productivity)
  app.get("/stats/productivity", async (request, reply) => {
    const querySchema = z.object({
      mode: z.enum(['workload', 'performance']).default('workload'),
      months: z.coerce.number().default(1)
    });

    const { mode, months } = querySchema.parse(request.query);

    try {
      const users = await prisma.user.findMany({
        where: { ativo: true, cargo: { not: Cargo.Gerente } },
        select: { id: true, nome: true, cargo: true }
      });

      // --- MODO PERFORMANCE (Gráfico de Barras) ---
      if (mode === 'performance') {
        const startDate = subMonths(new Date(), months);

        // Lista dinâmica de ações do Enum
        const safeActions = Object.values(LogAction);

        const activityCounts = await prisma.caseLog.groupBy({
          by: ['autorId'],
          where: {
            createdAt: { gte: startDate },
            acao: { in: safeActions }
          },
          _count: { _all: true }
        });

        const data = users.map(u => {
          const stats = activityCounts.find(a => a.autorId === u.id);
          return {
            name: u.nome.split(' ')[0], 
            value: stats ? stats._count._all : 0, 
            role: u.cargo
          };
        }).sort((a, b) => b.value - a.value);

        return reply.send(data);
      }

      // --- MODO WORKLOAD (Tabela da Equipe) ---
      // Realizamos duas queries agrupadas para não sobrecarregar
      const specialistStats = await prisma.case.groupBy({
        by: ['especialistaPAEFIId', 'status'],
        where: {
          especialistaPAEFIId: { in: users.map(u => u.id) },
          status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO_PAEFI, CaseStatus.EM_MONITORAMENTO] }
        },
        _count: { _all: true }
      });

      const agentStats = await prisma.case.groupBy({
        by: ['agenteAcolhidaId', 'status'],
        where: {
          agenteAcolhidaId: { in: users.map(u => u.id) },
          status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] }
        },
        _count: { _all: true }
      });

      const data = users.map(u => {
        let active = 0;
        let monitoring = 0;

        if (u.cargo === Cargo.Especialista) {
          const stats = specialistStats.filter(s => s.especialistaPAEFIId === u.id);
          active = stats
            .filter(s => s.status !== CaseStatus.EM_MONITORAMENTO)
            .reduce((acc, curr) => acc + curr._count._all, 0);
          monitoring = stats
            .filter(s => s.status === CaseStatus.EM_MONITORAMENTO)
            .reduce((acc, curr) => acc + curr._count._all, 0);
        } 
        else if (u.cargo === Cargo.Agente_Social) {
          const stats = agentStats.filter(s => s.agenteAcolhidaId === u.id);
          active = stats.reduce((acc, curr) => acc + curr._count._all, 0);
        }

        return {
          id: u.id,
          name: u.nome,
          role: u.cargo,
          active,
          monitoring,
          totalLoad: active + (monitoring * 0.2) // Peso menor para monitoramento
        };
      }).sort((a,b) => b.totalLoad - a.totalLoad);

      return reply.send(data);

    } catch (error) { 
      console.error("Erro em /stats/productivity:", error);
      return reply.status(500).send([]); 
    }
  });

  // 3. RELATÓRIO VIGILÂNCIA COMPLETO (/stats/vigilancia)
  // Rota pesada otimizada com Promise.all
  app.get("/stats/vigilancia", async (request, reply) => {
    const { cargo } = request.user as { cargo: string };
    if (!['Gerente', 'Especialista'].includes(cargo)) return reply.status(403).send({ message: "Acesso restrito." });

    try {
      const today = new Date();
      const sixMonthsAgo = subMonths(today, 6);

      // PARALELISMO: Dispara todas as queries pesadas simultaneamente
      const [
        allCases,
        violations,
        urgencies,
        origins,
        referrals,
        benefits,
        groupCount,
        participantsCount,
        demographicsRaw
      ] = await Promise.all([
        // 1. Dados Brutos para Cálculos de Tempo
        prisma.case.findMany({
          where: { OR: [{ dataEntrada: { gte: sixMonthsAgo } }, { dataDesligamento: { gte: sixMonthsAgo } }] },
          select: { dataEntrada: true, dataDesligamento: true, dataInicioPAEFI: true, status: true, id: true, urgencia: true }
        }),
        // 2. Violações
        prisma.case.groupBy({ by: ['violacao'], _count: { _all: true }, where: { status: { not: CaseStatus.DESLIGADO } } }),
        // 3. Urgências
        prisma.case.groupBy({ by: ['urgencia'], _count: { _all: true }, where: { status: { not: CaseStatus.DESLIGADO } } }),
        // 4. Origens
        prisma.case.groupBy({ by: ['orgaoDemandante'], _count: { _all: true }, where: { status: { not: CaseStatus.DESLIGADO } }, orderBy: { _count: { orgaoDemandante: 'desc' } }, take: 10 }),
        // 5. Encaminhamentos
        prisma.encaminhamento.groupBy({ by: ['instituicao'], _count: { _all: true }, orderBy: { _count: { instituicao: 'desc' } }, take: 10 }),
        // 6. Benefícios
        prisma.serviceDeliverable.groupBy({ by: ['tipo'], _count: { _all: true }, orderBy: { _count: { tipo: 'desc' } } }),
        // 7. Grupos
        prisma.groupActivity.count({ where: { dataRealizacao: { gte: sixMonthsAgo } } }),
        // 8. Participantes
        prisma.groupAttendance.count({ where: { presente: true, grupo: { dataRealizacao: { gte: sixMonthsAgo } } } }),
        // 9. Dados para o Mapa e Demografia
        prisma.case.findMany({
          where: { status: { not: CaseStatus.DESLIGADO } },
          select: { nascimento: true, sexo: true, id: true, urgencia: true, violacao: true, categoria: true }
        })
      ]);

      // --- PROCESSAMENTO (CPU-Bound, mas rápido em memória) ---

      // Evolução Mensal
      const monthsMap = new Map<string, { name: string, novos: number, desligados: number }>();
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(today, i);
        const key = format(d, 'yyyy-MM');
        const label = format(d, 'MMM/yy', { locale: ptBR });
        monthsMap.set(key, { name: label.charAt(0).toUpperCase() + label.slice(1), novos: 0, desligados: 0 });
      }
      allCases.forEach(c => {
        const entryKey = format(c.dataEntrada, 'yyyy-MM');
        const exitKey = c.dataDesligamento ? format(c.dataDesligamento, 'yyyy-MM') : null;
        if (monthsMap.has(entryKey)) monthsMap.get(entryKey)!.novos++;
        if (exitKey && monthsMap.has(exitKey)) monthsMap.get(exitKey)!.desligados++;
      });
      const evolutionData = Array.from(monthsMap.values());

      // Formatação para Gráficos
      const violationData = violations.map(v => ({ name: v.violacao || 'N/A', value: v._count._all })).sort((a,b) => b.value - a.value);
      const urgencyData = urgencies.map(u => ({ 
        name: u.urgencia || 'N/A', value: u._count._all, weight: calculateUrgencyWeight(u.urgencia) 
      })).sort((a,b) => b.weight - a.weight);
      const originData = origins.map(o => ({ name: o.orgaoDemandante || 'N/A', value: o._count._all }));
      const networkData = referrals.map(r => ({ name: r.instituicao, value: r._count._all }));
      const benefitsData = benefits.map(b => ({ name: b.tipo, value: b._count._all }));

      const collectiveData = { 
        totalGroups: groupCount, 
        totalParticipants: participantsCount, 
        avgAttendance: groupCount > 0 ? Math.round(participantsCount / groupCount) : 0 
      };

      // Eficiência (Tempos médios)
      const closedCases = allCases.filter(c => c.dataDesligamento && c.dataEntrada);
      const totalDaysOpen = closedCases.reduce((acc, c) => {
        const diff = Math.abs(c.dataDesligamento!.getTime() - c.dataEntrada.getTime());
        return acc + Math.ceil(diff / (1000 * 60 * 60 * 24)); 
      }, 0);
      const avgPermanence = closedCases.length ? Math.round(totalDaysOpen / closedCases.length) : 0;

      const paefiCases = allCases.filter(c => c.dataInicioPAEFI && c.dataEntrada);
      const totalWaitDays = paefiCases.reduce((acc, c) => {
        const diff = Math.abs(c.dataInicioPAEFI!.getTime() - c.dataEntrada.getTime());
        return acc + Math.ceil(diff / (1000 * 60 * 60 * 24));
      }, 0);
      const avgWaitTime = paefiCases.length ? Math.round(totalWaitDays / paefiCases.length) : 0;

      const efficiencyData = {
        avgPermanence, avgWaitTime, totalClosed: closedCases.length,
        retentionRate: Math.round((1 - (closedCases.length / (allCases.length || 1))) * 100) 
      };

      // Demografia
      const demographics = {
        sexo: { Masculino: 0, Feminino: 0, Outro: 0 },
        etaria: { '0-11 (Criança)': 0, '12-17 (Adolescente)': 0, '18-59 (Adulto)': 0, '60+ (Idoso)': 0 }
      };

      demographicsRaw.forEach(c => {
        if (c.sexo === 'Masculino') demographics.sexo.Masculino++; else if (c.sexo === 'Feminino') demographics.sexo.Feminino++; else demographics.sexo.Outro++;
        
        if (c.nascimento) {
            const age = new Date().getFullYear() - c.nascimento.getFullYear();
            if (age < 12) demographics.etaria['0-11 (Criança)']++; 
            else if (age < 18) demographics.etaria['12-17 (Adolescente)']++; 
            else if (age < 60) demographics.etaria['18-59 (Adulto)']++; 
            else demographics.etaria['60+ (Idoso)']++;
        }
      });

      const ageData = Object.entries(demographics.etaria).map(([name, value]) => ({ name, value }));
      const sexData = Object.entries(demographics.sexo).map(([name, value]) => ({ name, value }));

      // Mapa (Pseudo-geocodificação)
      const mapData = demographicsRaw.map(c => {
        const pseudoRandom = c.id.charCodeAt(0) + c.id.charCodeAt(c.id.length - 1);
        const latOffset = (pseudoRandom % 100 - 50) / 4000; 
        const lngOffset = (pseudoRandom % 100 - 50) / 4000;
        return { 
          id: c.id, 
          lat: -15.668 + latOffset, // Coordenada base (ex: Brasília) - ideal ser configurável
          lng: -48.201 + lngOffset, 
          intensity: calculateUrgencyWeight(c.urgencia), 
          label: c.urgencia,
          violacao: c.violacao || 'Não Informado',
          categoria: c.categoria || 'Não Informado'
        };
      });

      return reply.send({ evolutionData, violationData, urgencyData, originData, collectiveData, ageData, sexData, mapData, networkData, benefitsData, efficiencyData });

    } catch (error) { 
        console.error("Erro vigilância:", error); 
        return reply.status(500).send({ message: "Erro de vigilância." }); 
    }
  });

  // 4. INDICADORES AVANÇADOS (/stats/advanced)
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
      
      const pieData = Object.entries(violationCount)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
      
      const closedCases = cases.filter(c => c.dataDesligamento);
      const totalDays = closedCases.reduce((acc, c) => { 
        return acc + Math.ceil(Math.abs(c.dataDesligamento!.getTime() - c.dataEntrada.getTime()) / (86400000)); 
      }, 0);
      const avgHandlingTime = closedCases.length > 0 ? Math.round(totalDays / closedCases.length) : 0;
      
      const activeTotal = await prisma.case.count({ where: { status: { not: CaseStatus.DESLIGADO } } });
      
      // Insights (Heurísticas simples)
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

  // 5. HELPER: MAPA DE CALOR DE ATIVIDADE
  app.get("/stats/heatmap", async (request, reply) => {
    const querySchema = z.object({ months: z.coerce.number().default(12) });
    const { months } = querySchema.parse(request.query);
    try {
      const startDate = subMonths(new Date(), months);
      const logs = await prisma.caseLog.findMany({ where: { createdAt: { gte: startDate } }, select: { createdAt: true } });
      const map = new Map<string, number>();
      logs.forEach(l => { const day = format(l.createdAt, 'yyyy-MM-dd'); map.set(day, (map.get(day) || 0) + 1); });
      const result = Array.from(map.entries()).map(([date, count]) => ({ date, count }));
      return reply.send(result);
    } catch { return reply.status(500).send([]); }
  });

  // 6. HELPER: AGENDA RÁPIDA
  app.get("/stats/my-agenda", async (request, reply) => {
    const { sub: userId } = request.user as { sub: string };
    try {
      const start = startOfDay(new Date());
      const appointments = await prisma.agendamento.findMany({ 
        where: { responsavelId: userId, data: { gte: start } }, orderBy: { data: "asc" }, take: 5, include: { caso: { select: { id: true, nomeCompleto: true } } } 
      });
      return reply.send(appointments);
    } catch { return reply.status(500).send({ message: "Erro agenda." }); }
  });
}