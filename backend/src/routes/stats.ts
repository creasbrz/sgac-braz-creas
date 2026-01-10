// backend/src/routes/stats.ts
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { startOfMonth, endOfMonth, startOfDay, subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Cargo, CaseStatus, LogAction } from "@prisma/client"; 
import { cache } from "../lib/cache";
import { AnalyticsAI } from "../services/AnalyticsAI";

// --- FUNÇÕES AUXILIARES ---

const calculateUrgencyWeight = (urgencia: string | null): number => {
  if (!urgencia) return 1;
  const term = urgencia.trim();
  if (['Convive com agressor', 'Idoso 80+', 'Primeira infância', 'Risco de morte'].includes(term)) return 4;
  if (['Risco de reincidência', 'Sofre ameaça', 'Risco de desabrigo', 'Criança/Adolescente'].includes(term)) return 3;
  if (['PCD', 'Idoso', 'Internação', 'Acolhimento', 'Gestante/Lactante'].includes(term)) return 2;
  return 1;
}

// --- SCHEMAS (Reutilizáveis) ---

const statsQuerySchema = z.object({
  months: z.coerce.number().min(1).max(60).default(12),
  violacao: z.string().optional()
});

const productivityQuerySchema = z.object({
  mode: z.enum(['workload', 'performance']).default('workload'),
  months: z.coerce.number().default(1)
});

// Schema explícito para evitar problemas com z.any()
const simpleStatSchema = z.object({
  name: z.string(),
  value: z.number()
})

// --- ROTAS ---

export async function statsRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();
  
  server.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "Não autorizado." });
    }
  });

  // 1. [GET] DASHBOARD GERAL
  server.get("/stats", {
    schema: {
      tags: ['Dashboard'],
      summary: 'Indicadores principais (Cards do Topo)',
      response: {
        200: z.object({
          role: z.string(),
          totalCases: z.number().optional(),
          acolhidasCount: z.number().optional(),
          acompanhamentosCount: z.number().optional(),
          monitoringCount: z.number().optional(),
          newCasesThisMonth: z.number().optional(),
          closedCasesThisMonth: z.number().optional(),
          workloadByAgent: z.array(simpleStatSchema).optional(),
          workloadBySpecialist: z.array(simpleStatSchema).optional(),
          casesByUrgency: z.array(simpleStatSchema).optional(),
          casesByCategory: z.array(simpleStatSchema).optional(),
          productivity: z.array(z.any()).optional(), 
          lastUpdated: z.string().optional(),
          myActiveCases: z.number().optional(),
          myClosedMonth: z.number().optional(),
          myNewCasesMonth: z.number().optional(),
          message: z.string().optional()
        })
      }
    }
  }, async (request, reply) => {
    const { cargo, sub: userId } = request.user as { cargo: string; sub: string };
    
    if (cargo === Cargo.Gerente) {
      const cacheKey = "manager_stats_main";
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        reply.header('X-Cache', 'HIT');
        return reply.send(cachedData as any);
      }

      const today = new Date();
      const firstDayOfMonth = startOfMonth(today);
      const lastDayOfMonth = endOfMonth(today);

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
        prisma.case.count(),
        prisma.case.count({ where: { status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] } } }),
        prisma.case.count({ where: { status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO] } } }),
        prisma.case.count({ where: { status: CaseStatus.EM_MONITORAMENTO } }),
        prisma.case.count({ where: { dataEntrada: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
        prisma.case.count({ where: { status: CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
        
        prisma.case.groupBy({
          by: ['agenteAcolhidaId'],
          where: { status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] }, agenteAcolhidaId: { not: null } },
          _count: { _all: true }
        }),
        
        prisma.case.groupBy({
          by: ['especialistaPAEFIId'],
          where: { status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO] }, especialistaPAEFIId: { not: null } },
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
    }

    const today = new Date();
    const firstDayOfMonth = startOfMonth(today);
    const lastDayOfMonth = endOfMonth(today);

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
        prisma.case.count({ where: { especialistaPAEFIId: userId, status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO, CaseStatus.EM_MONITORAMENTO] } } }),
        prisma.case.count({ where: { especialistaPAEFIId: userId, status: CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDayOfMonth, lte: lastDayOfMonth } } }),
        prisma.case.count({ where: { especialistaPAEFIId: userId, dataInicioPAEFI: { gte: firstDayOfMonth, lte: lastDayOfMonth } } })
      ]);
      return reply.send({ role: 'Especialista', myActiveCases: myActive, myClosedMonth: myClosed, myNewCasesMonth: myNew });
    }
    
    return reply.status(200).send({ role: 'Visitante', message: "Sem dados." });
  });

  // 2. [GET] PRODUTIVIDADE E PERFORMANCE
  server.get("/stats/productivity", {
    schema: {
      tags: ['Dashboard'],
      summary: 'Métricas de produtividade da equipe',
      querystring: productivityQuerySchema
    }
  }, async (request, reply) => {
    const { mode, months } = request.query;

    const users = await prisma.user.findMany({
      where: { ativo: true, cargo: { not: Cargo.Gerente } },
      select: { id: true, nome: true, cargo: true }
    });

    if (mode === 'performance') {
      const startDate = subMonths(new Date(), months);
      const flowActions = [LogAction.MUDANCA_STATUS, LogAction.DESLIGAMENTO, LogAction.ATRIBUICAO];

      const rawActivity = await prisma.caseLog.findMany({
        where: {
          createdAt: { gte: startDate },
          acao: { in: flowActions }
        },
        select: { autorId: true, casoId: true }
      });

      const statsMap = new Map<string, Set<string>>();
      rawActivity.forEach(log => {
        if (!statsMap.has(log.autorId)) statsMap.set(log.autorId, new Set());
        statsMap.get(log.autorId)?.add(log.casoId);
      });

      const data = users.map(u => ({
        name: u.nome.split(' ')[0], 
        value: statsMap.get(u.id)?.size || 0,
        role: u.cargo
      })).sort((a, b) => b.value - a.value);

      return reply.send(data);
    }

    const [specialistStats, agentStats] = await Promise.all([
      prisma.case.groupBy({
        by: ['especialistaPAEFIId', 'status'],
        where: {
          especialistaPAEFIId: { in: users.map(u => u.id) },
          status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO, CaseStatus.EM_MONITORAMENTO] }
        },
        _count: { _all: true }
      }),
      prisma.case.groupBy({
        by: ['agenteAcolhidaId', 'status'],
        where: {
          agenteAcolhidaId: { in: users.map(u => u.id) },
          status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] }
        },
        _count: { _all: true }
      })
    ]);

    const data = users.map(u => {
      let active = 0;
      let monitoring = 0;

      if (u.cargo === Cargo.Especialista) {
        const stats = specialistStats.filter(s => s.especialistaPAEFIId === u.id);
        active = stats.filter(s => s.status !== CaseStatus.EM_MONITORAMENTO).reduce((acc, curr) => acc + curr._count._all, 0);
        monitoring = stats.filter(s => s.status === CaseStatus.EM_MONITORAMENTO).reduce((acc, curr) => acc + curr._count._all, 0);
      } else if (u.cargo === Cargo.Agente_Social) {
        const stats = agentStats.filter(s => s.agenteAcolhidaId === u.id);
        active = stats.reduce((acc, curr) => acc + curr._count._all, 0);
      }

      return {
        id: u.id,
        name: u.nome,
        role: u.cargo,
        active,
        monitoring,
        totalLoad: active + (monitoring * 0.2)
      };
    }).sort((a,b) => b.totalLoad - a.totalLoad);

    return reply.send(data);
  });

  // 3. [GET] RELATÓRIO VIGILÂNCIA
  server.get("/stats/vigilancia", {
    schema: {
      tags: ['Dashboard'],
      summary: 'Relatório avançado de vigilância sociassistencial'
    }
  }, async (request, reply) => {
    const { cargo } = request.user as { cargo: string };
    if (!['Gerente', 'Especialista'].includes(cargo)) {
        return reply.status(403).send({ message: "Acesso restrito." });
    }

    const today = new Date();
    const sixMonthsAgo = subMonths(today, 6);

    const allCases = await prisma.case.findMany({
      where: { 
        OR: [
            { dataEntrada: { gte: sixMonthsAgo } }, 
            { dataDesligamento: { gte: sixMonthsAgo } }
        ] 
      },
      select: { 
          id: true, 
          dataEntrada: true, 
          dataDesligamento: true, 
          dataInicioPAEFI: true, 
          status: true, 
          urgencia: true, 
          violacao: true, 
          categoria: true, 
          sexo: true, 
          nascimento: true 
      }
    });

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

    // [CORREÇÃO] Declaração da variável que faltava
    const evolutionData = Array.from(monthsMap.values());

    const [violations, urgencies, origins, referrals, benefits] = await Promise.all([
      prisma.case.groupBy({ by: ['violacao'], _count: { _all: true }, where: { status: { not: CaseStatus.DESLIGADO } } }),
      prisma.case.groupBy({ by: ['urgencia'], _count: { _all: true }, where: { status: { not: CaseStatus.DESLIGADO } } }),
      prisma.case.groupBy({ by: ['orgaoDemandante'], _count: { _all: true }, where: { status: { not: CaseStatus.DESLIGADO } }, orderBy: { _count: { orgaoDemandante: 'desc' } }, take: 10 }),
      prisma.encaminhamento.groupBy({ by: ['instituicao'], _count: { _all: true }, orderBy: { _count: { instituicao: 'desc' } }, take: 10 }),
      prisma.serviceDeliverable.groupBy({ by: ['tipo'], _count: { _all: true }, orderBy: { _count: { tipo: 'desc' } } })
    ]);

    const violationData = violations.map(v => ({ name: v.violacao, value: v._count._all })).sort((a,b) => b.value - a.value);
    const urgencyData = urgencies.map(u => ({ name: u.urgencia, value: u._count._all, weight: calculateUrgencyWeight(u.urgencia) })).sort((a,b) => b.weight - a.weight);
    const originData = origins.map(o => ({ name: o.orgaoDemandante, value: o._count._all }));
    const networkData = referrals.map(r => ({ name: r.instituicao, value: r._count._all }));
    const benefitsData = benefits.map(b => ({ name: b.tipo, value: b._count._all }));

    const demographics = { sexo: { Masculino: 0, Feminino: 0, Outro: 0 } as any, etaria: { '0-11 (Criança)': 0, '12-17 (Adolescente)': 0, '18-59 (Adulto)': 0, '60+ (Idoso)': 0 } as any };
    const mapData = [];

    for (const c of allCases) {
        if (c.status === CaseStatus.DESLIGADO) continue;
        if (c.sexo === 'Masculino') demographics.sexo.Masculino++; else if (c.sexo === 'Feminino') demographics.sexo.Feminino++; else demographics.sexo.Outro++;
        const age = today.getFullYear() - c.nascimento.getFullYear();
        if (age < 12) demographics.etaria['0-11 (Criança)']++; else if (age < 18) demographics.etaria['12-17 (Adolescente)']++; else if (age < 60) demographics.etaria['18-59 (Adulto)']++; else demographics.etaria['60+ (Idoso)']++;
        const pseudoRandom = c.id.charCodeAt(0) + c.id.charCodeAt(c.id.length - 1);
        mapData.push({ id: c.id, lat: -15.668 + ((pseudoRandom % 100 - 50) / 4000), lng: -48.201 + ((pseudoRandom % 100 - 50) / 4000), intensity: calculateUrgencyWeight(c.urgencia), label: c.urgencia, violacao: c.violacao || 'Não Informado', categoria: c.categoria || 'Não Informado' });
    }

    const [groupCount, participantsCount] = await Promise.all([
        prisma.groupActivity.count({ where: { dataRealizacao: { gte: sixMonthsAgo } } }),
        prisma.groupAttendance.count({ where: { presente: true, grupo: { dataRealizacao: { gte: sixMonthsAgo } } } })
    ]);

    const collectiveData = { totalGroups: groupCount, totalParticipants: participantsCount, avgAttendance: groupCount > 0 ? Math.round(participantsCount / groupCount) : 0 };
    const closedCases = allCases.filter(c => c.dataDesligamento);
    const totalPermanence = closedCases.reduce((acc, c) => acc + (c.dataDesligamento!.getTime() - c.dataEntrada.getTime()), 0);
    const avgPermanence = closedCases.length ? Math.round((totalPermanence / closedCases.length) / 86400000) : 0;

    return reply.send({ 
        evolutionData, violationData, urgencyData, originData, networkData, benefitsData, 
        collectiveData, ageData: Object.entries(demographics.etaria).map(([name, value]) => ({ name, value })), sexData: Object.entries(demographics.sexo).map(([name, value]) => ({ name, value })), 
        mapData, efficiencyData: { avgPermanence, totalClosed: closedCases.length, retentionRate: Math.round((1 - (closedCases.length / (allCases.length || 1))) * 100) } 
    });
  });

  // 4. [GET] ANALYTICS AVANÇADO
  server.get("/stats/advanced", {
    schema: {
      tags: ['Dashboard'],
      summary: 'Análise de tendências e IA',
      querystring: statsQuerySchema
    }
  }, async (request, reply) => {
    const { cargo } = request.user as { cargo: string };
    if (cargo !== Cargo.Gerente) return reply.status(403).send({ message: "Acesso restrito." });

    const { months, violacao } = request.query;
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
    
    const pieData = Object.entries(violationCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
    const insights = await AnalyticsAI.generateInsights(months);
    
    return reply.send({ trendData: Array.from(monthlyStats.values()), totalActive: await prisma.case.count({ where: { status: { not: CaseStatus.DESLIGADO } } }), insights, pieData });
  });

  // 5. [GET] ATIVIDADE RECENTE
  server.get("/stats/activity", {
    schema: {
      tags: ['Dashboard'],
      summary: 'Feed de atividades em tempo real'
    }
  }, async (request, reply) => {
    const { sub: userId, cargo } = request.user as { sub: string, cargo: string };
    const whereScope = cargo === Cargo.Gerente ? {} : { caso: { OR: [{ agenteAcolhidaId: userId }, { especialistaPAEFIId: userId }] } };
    const logs = await prisma.caseLog.findMany({ where: whereScope, take: 10, orderBy: { createdAt: 'desc' }, include: { autor: { select: { nome: true, cargo: true } }, caso: { select: { id: true, nomeCompleto: true } } } });
    return reply.send(logs);
  });
}