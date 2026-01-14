import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { startOfMonth, endOfMonth, subMonths, format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Cargo, CaseStatus, LogAction } from "@prisma/client"; 
import { cache } from "../lib/cache";
import { AnalyticsAI } from "../services/AnalyticsAI";

// --- FUNÇÕES AUXILIARES ---
const calculateUrgencyWeight = (urgencia: string | null): number => {
  if (!urgencia) return 1;
  const term = urgencia.trim();
  if (['Convive com agressor', 'Idoso 80+', 'Primeira infância', 'Risco de morte', 'Violência sexual'].includes(term)) return 4;
  if (['Risco de reincidência', 'Sofre ameaça', 'Risco de desabrigo', 'Criança/Adolescente', 'Violência física'].includes(term)) return 3;
  if (['PCD', 'Idoso', 'Internação', 'Acolhimento', 'Gestante/Lactante', 'Situação de rua'].includes(term)) return 2;
  return 1;
}

const statsQuerySchema = z.object({
  months: z.coerce.number().min(1).max(60).default(12),
  violacao: z.string().optional()
});

const productivityQuerySchema = z.object({
  mode: z.enum(['workload', 'performance']).default('workload'),
  months: z.coerce.number().default(1)
});

export async function statsRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();
  
  server.addHook("onRequest", async (request, reply) => {
    try { await request.jwtVerify(); } 
    catch { return reply.status(401).send({ message: "Não autorizado." }); }
  });

  // 1. [GET] /stats - DASHBOARD GERAL
  server.get("/stats", {
    schema: { tags: ['Dashboard'], summary: 'Indicadores principais e contagens gerais' }
  }, async (request, reply) => {
    const { cargo, sub: userId } = request.user as { cargo: string; sub: string };
    
    if (cargo === Cargo.Gerente) {
      const cacheKey = "manager_stats_main";
      const cachedData = cache.get(cacheKey);
      if (cachedData) { reply.header('X-Cache', 'HIT'); return reply.send(cachedData as any); }

      const today = new Date();
      const firstDayOfMonth = startOfMonth(today);
      const lastDayOfMonth = endOfMonth(today);

      const [
        totalCases, acolhidasCount, acompanhamentosCount, monitoringCount,
        newCasesThisMonth, closedCasesThisMonth, workloadAgent, workloadSpec,
        urgencyGroups, categoryGroups
      ] = await Promise.all([
        prisma.case.count(),
        prisma.case.count({ where: { status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] } } }),
        prisma.case.count({ where: { status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO] } } }),
        prisma.case.count({ where: { status: CaseStatus.EM_MONITORAMENTO } }),
        prisma.case.count({ where: { dataEntrada: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
        prisma.case.count({ where: { status: CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
        prisma.case.groupBy({ by: ['agenteAcolhidaId'], where: { status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] }, agenteAcolhidaId: { not: null } }, _count: { _all: true } }),
        prisma.case.groupBy({ by: ['especialistaPAEFIId'], where: { status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO] }, especialistaPAEFIId: { not: null } }, _count: { _all: true } }),
        prisma.case.groupBy({ by: ['urgencia'], _count: { _all: true }, where: { status: { not: CaseStatus.DESLIGADO } } }),
        prisma.case.groupBy({ by: ['categoria'], _count: { _all: true }, where: { status: { not: CaseStatus.DESLIGADO } } }),
      ]);

      const userIds = [...new Set([...workloadAgent.map(w => w.agenteAcolhidaId), ...workloadSpec.map(w => w.especialistaPAEFIId)])].filter(Boolean) as string[];
      const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, nome: true } });
      const userMap = new Map(users.map(u => [u.id, u.nome]));

      const result = {
        role: 'Gerente',
        totalCases, acolhidasCount, acompanhamentosCount, monitoringCount,
        newCasesThisMonth, closedCasesThisMonth,
        workloadByAgent: workloadAgent.map(w => ({ name: userMap.get(w.agenteAcolhidaId!) || 'Desconhecido', value: w._count._all })),
        workloadBySpecialist: workloadSpec.map(w => ({ name: userMap.get(w.especialistaPAEFIId!) || 'Desconhecido', value: w._count._all })),
        casesByUrgency: urgencyGroups.map(g => ({ name: g.urgencia, value: g._count._all })),
        casesByCategory: categoryGroups.map(g => ({ name: g.categoria, value: g._count._all })),
        productivity: [],
        lastUpdated: new Date().toISOString()
      };
      cache.set(cacheKey, result);
      return reply.send(result);
    }

    const today = new Date();
    const firstDayOfMonth = startOfMonth(today);
    const lastDayOfMonth = endOfMonth(today);

    if (cargo === Cargo.Agente_Social || cargo === Cargo.Especialista) {
        const isAgent = cargo === Cargo.Agente_Social;
        const filterField = isAgent ? 'agenteAcolhidaId' : 'especialistaPAEFIId';
        const statusFilter = isAgent ? { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] } : { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO, CaseStatus.EM_MONITORAMENTO] };

        const [myActive, myClosed, myNew] = await Promise.all([
            prisma.case.count({ where: { [filterField]: userId, status: statusFilter } }),
            prisma.case.count({ where: { [filterField]: userId, status: CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
            prisma.case.count({ where: { [filterField]: userId, [isAgent ? 'dataEntrada' : 'dataInicioPAEFI']: { gte: firstDayOfMonth, lte: lastDayOfMonth } } })
        ]);
        return reply.send({ role: cargo, myActiveCases: myActive, myClosedMonth: myClosed, myNewCasesMonth: myNew });
    }
    return reply.status(200).send({ role: 'Visitante', message: "Sem dados." });
  });

  // 2. [GET] /stats/productivity
  server.get("/stats/productivity", {
    schema: { tags: ['Dashboard'], querystring: productivityQuerySchema }
  }, async (request, reply) => {
    const { mode, months } = request.query;
    const users = await prisma.user.findMany({ where: { ativo: true, cargo: { not: Cargo.Gerente } }, select: { id: true, nome: true, cargo: true } });

    if (mode === 'performance') {
      const startDate = subMonths(new Date(), months);
      const rawActivity = await prisma.caseLog.findMany({ 
        where: { createdAt: { gte: startDate }, acao: { in: [LogAction.MUDANCA_STATUS, LogAction.DESLIGAMENTO, LogAction.ATRIBUICAO] } }, 
        select: { autorId: true, casoId: true } 
      });
      const statsMap = new Map<string, Set<string>>();
      rawActivity.forEach(log => {
        if (!statsMap.has(log.autorId)) statsMap.set(log.autorId, new Set());
        statsMap.get(log.autorId)?.add(log.casoId);
      });
      return reply.send(users.map(u => ({ name: u.nome.split(' ')[0], value: statsMap.get(u.id)?.size || 0, role: u.cargo })).sort((a, b) => b.value - a.value));
    }

    const [specialistStats, agentStats] = await Promise.all([
        prisma.case.groupBy({ by: ['especialistaPAEFIId', 'status'], where: { especialistaPAEFIId: { in: users.map(u => u.id) }, status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO, CaseStatus.EM_MONITORAMENTO] } }, _count: { _all: true } }),
        prisma.case.groupBy({ by: ['agenteAcolhidaId', 'status'], where: { agenteAcolhidaId: { in: users.map(u => u.id) }, status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] } }, _count: { _all: true } })
    ]);

    return reply.send(users.map(u => {
        let active = 0, monitoring = 0;
        if (u.cargo === Cargo.Especialista) {
            const stats = specialistStats.filter(s => s.especialistaPAEFIId === u.id);
            active = stats.filter(s => s.status !== CaseStatus.EM_MONITORAMENTO).reduce((acc, curr) => acc + curr._count._all, 0);
            monitoring = stats.filter(s => s.status === CaseStatus.EM_MONITORAMENTO).reduce((acc, curr) => acc + curr._count._all, 0);
        } else if (u.cargo === Cargo.Agente_Social) {
            active = agentStats.filter(s => s.agenteAcolhidaId === u.id).reduce((acc, curr) => acc + curr._count._all, 0);
        }
        return { id: u.id, name: u.nome, role: u.cargo, active, monitoring, totalLoad: active + (monitoring * 0.2) };
    }).sort((a,b) => b.totalLoad - a.totalLoad));
  });

  // 3. [GET] /stats/vigilancia
  server.get("/stats/vigilancia", {
    schema: { tags: ['Dashboard'], summary: 'Relatório avançado de vigilância' }
  }, async (request, reply) => {
    const { cargo } = request.user as { cargo: string };
    if (!['Gerente', 'Especialista'].includes(cargo)) return reply.status(403).send({ message: "Acesso restrito." });

    const today = new Date();
    const sixMonthsAgo = subMonths(today, 6);

    const cases = await prisma.case.findMany({
      where: { OR: [{ createdAt: { gte: sixMonthsAgo } }, { dataDesligamento: { gte: sixMonthsAgo } }, { status: { not: CaseStatus.DESLIGADO } }] },
      select: {
        id: true, createdAt: true, dataEntrada: true, dataDesligamento: true, dataInicioPAEFI: true,
        status: true, urgencia: true, violacao: true, categoria: true, sexo: true, nascimento: true, origem: true,
        latitude: true, longitude: true, endereco_ra: true,
        encaminhamentos: { select: { instituicao: true } }, entregas: { select: { tipo: true } }
      }
    });

    const monthsMap = new Map();
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(today, i);
      const key = format(d, 'yyyy-MM');
      const label = format(d, 'MMM/yy', { locale: ptBR });
      monthsMap.set(key, { name: label.charAt(0).toUpperCase() + label.slice(1), novos: 0, desligados: 0 });
    }
    cases.forEach(c => {
      const entryKey = format(c.dataEntrada, 'yyyy-MM');
      if (monthsMap.has(entryKey)) monthsMap.get(entryKey).novos++;
      if (c.dataDesligamento) {
        const exitKey = format(c.dataDesligamento, 'yyyy-MM');
        if (monthsMap.has(exitKey)) monthsMap.get(exitKey).desligados++;
      }
    });

    const benefitsMap: Record<string, number> = {}, violationMap: Record<string, number> = {}, urgencyMap: Record<string, number> = {}, originMap: Record<string, number> = {}, networkMap: Record<string, number> = {};
    const demographics = { sexo: { Masculino: 0, Feminino: 0, Outro: 0 } as any, etaria: { '0-11 (Criança)': 0, '12-17 (Adolescente)': 0, '18-59 (Adulto)': 0, '60+ (Idoso)': 0 } as any };

    cases.forEach(c => {
      c.entregas.forEach(e => benefitsMap[e.tipo] = (benefitsMap[e.tipo] || 0) + 1);
      c.encaminhamentos.forEach(e => networkMap[e.instituicao] = (networkMap[e.instituicao] || 0) + 1);
      
      if (c.status !== CaseStatus.DESLIGADO) {
        // [CORREÇÃO: TRATAMENTO DE ARRAY]
        const violationsArray = Array.isArray(c.violacao) ? c.violacao : [];
        violationsArray.forEach(vStr => {
            // Se houver strings combinadas por virgula (legado), separa agora
            vStr.split(',').forEach(subV => {
                const label = subV.trim();
                if(label) violationMap[label] = (violationMap[label] || 0) + 1;
            });
        });
        
        const urgencia = c.urgencia || "Não Classificado";
        urgencyMap[urgencia] = (urgencyMap[urgencia] || 0) + 1;
        const origem = c.origem || "Não Informada";
        originMap[origem] = (originMap[origem] || 0) + 1;
        
        if (c.sexo === 'Masculino') demographics.sexo.Masculino++; else if (c.sexo === 'Feminino') demographics.sexo.Feminino++; else demographics.sexo.Outro++;
        const age = today.getFullYear() - c.nascimento.getFullYear();
        if (age < 12) demographics.etaria['0-11 (Criança)']++; else if (age < 18) demographics.etaria['12-17 (Adolescente)']++; else if (age < 60) demographics.etaria['18-59 (Adulto)']++; else demographics.etaria['60+ (Idoso)']++;
      }
    });

    // Eficiência
    let totalWaitTime = 0, countWaitTime = 0, totalPermanence = 0, countPermanence = 0;
    cases.forEach(c => {
      if (c.dataEntrada && c.dataInicioPAEFI) {
        const wait = differenceInDays(new Date(c.dataInicioPAEFI), new Date(c.dataEntrada));
        if (wait >= 0) { totalWaitTime += wait; countWaitTime++; }
      }
      if (c.status === CaseStatus.DESLIGADO && c.dataInicioPAEFI && c.dataDesligamento) {
        const perm = differenceInDays(new Date(c.dataDesligamento), new Date(c.dataInicioPAEFI));
        if (perm >= 0) { totalPermanence += perm; countPermanence++; }
      }
    });

    const avgWaitTime = countWaitTime ? Math.round(totalWaitTime / countWaitTime) : 0;
    const avgPermanence = countPermanence ? Math.round(totalPermanence / countPermanence) : 0;
    const totalClosed = cases.filter(c => c.dataDesligamento && c.dataDesligamento >= sixMonthsAgo).length;

    const mapData = cases.filter(c => c.latitude && c.longitude && c.status !== CaseStatus.DESLIGADO).map(c => ({ id: c.id, lat: c.latitude, lng: c.longitude, intensity: calculateUrgencyWeight(c.urgencia), label: c.categoria || 'Caso', violacao: c.violacao, categoria: c.categoria, endereco: c.endereco_ra }));

    const collectiveData = { totalGroups: 0, totalParticipants: 0, avgAttendance: 0 }; 
    try {
        collectiveData.totalGroups = await prisma.groupActivity.count({ where: { dataRealizacao: { gte: sixMonthsAgo } } });
        collectiveData.totalParticipants = await prisma.groupAttendance.count({ where: { presente: true, grupo: { dataRealizacao: { gte: sixMonthsAgo } } } });
        if(collectiveData.totalGroups > 0) collectiveData.avgAttendance = Math.round(collectiveData.totalParticipants / collectiveData.totalGroups);
    } catch(e) {}

    return reply.send({
      evolutionData: Array.from(monthsMap.values()),
      violationData: Object.entries(violationMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      urgencyData: Object.entries(urgencyMap).map(([name, value]) => ({ name, value, weight: calculateUrgencyWeight(name) })).sort((a, b) => b.weight - a.weight),
      originData: Object.entries(originMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10),
      networkData: Object.entries(networkMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10),
      benefitsData: Object.entries(benefitsMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5),
      mapData,
      efficiencyData: { avgWaitTime, avgPermanence, totalClosed },
      collectiveData,
      ageData: Object.entries(demographics.etaria).map(([name, value]) => ({ name, value })),
      sexData: Object.entries(demographics.sexo).map(([name, value]) => ({ name, value }))
    });
  });

  // 4. [GET] /stats/advanced - ANALYTICS IA
  server.get("/stats/advanced", {
    schema: { tags: ['Dashboard'], summary: 'Análise de tendências e IA', querystring: statsQuerySchema }
  }, async (request, reply) => {
    const { cargo } = request.user as { cargo: string };
    if (cargo !== Cargo.Gerente) return reply.status(403).send({ message: "Acesso restrito." });

    const { months, violacao } = request.query;
    const today = new Date();
    const startDate = startOfMonth(subMonths(today, months - 1));
    
    const whereClause: any = { OR: [{ dataEntrada: { gte: startDate } }, { dataDesligamento: { gte: startDate } }] };
    if (violacao && violacao !== 'all') { whereClause.violacao = { has: violacao }; }
    
    const cases = await prisma.case.findMany({ where: whereClause, select: { id: true, dataEntrada: true, dataDesligamento: true, status: true, violacao: true, urgencia: true } });
    
    const monthlyStats = new Map();
    for (let i = 0; i < months; i++) {
      const d = subMonths(today, (months - 1) - i);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthlyStats.set(key, { name: d.toLocaleDateString("pt-BR", { month: "short" }).toUpperCase(), novos: 0, fechados: 0 });
    }
    
    const violationCount: Record<string, number> = {};
    cases.forEach(c => {
      const inKey = `${c.dataEntrada.getFullYear()}-${c.dataEntrada.getMonth()}`;
      if (monthlyStats.has(inKey)) monthlyStats.get(inKey).novos++;
      if (c.dataDesligamento) {
        const outKey = `${c.dataDesligamento.getFullYear()}-${c.dataDesligamento.getMonth()}`;
        if (monthlyStats.has(outKey)) monthlyStats.get(outKey).fechados++;
      }
      
      // [CORREÇÃO: TRATAMENTO DE ARRAY]
      const violationsArray = Array.isArray(c.violacao) ? c.violacao : [];
      violationsArray.forEach(vStr => {
          vStr.split(',').forEach(subV => {
              const label = subV.trim();
              if(label) violationCount[label] = (violationCount[label] || 0) + 1;
          });
      });
    });
    
    const pieData = Object.entries(violationCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
    const insights = await AnalyticsAI.generateInsights(months);
    const totalActive = await prisma.case.count({ where: { status: { not: CaseStatus.DESLIGADO } } });

    return reply.send({ trendData: Array.from(monthlyStats.values()), totalActive, insights, pieData, avgHandlingTime: 45 });
  });

  // 5. [GET] /stats/activity
  server.get("/stats/activity", {
    schema: { tags: ['Dashboard'] }
  }, async (request, reply) => {
    const { sub: userId, cargo } = request.user as { sub: string, cargo: string };
    const whereScope = cargo === Cargo.Gerente ? {} : { caso: { OR: [{ agenteAcolhidaId: userId }, { especialistaPAEFIId: userId }] } };
    const logs = await prisma.caseLog.findMany({ where: whereScope, take: 10, orderBy: { createdAt: 'desc' }, include: { autor: { select: { nome: true, cargo: true } }, caso: { select: { id: true, nomeCompleto: true } } } });
    return reply.send(logs);
  });
}