// backend/src/routes/reports.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { Cargo, CaseStatus } from '@prisma/client'
import { subMonths, format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// --- Helpers ---
const calculateUrgencyWeight = (urgencia: string | null): number => {
  if (!urgencia) return 1;
  const term = urgencia.trim();
  if (['Convive com agressor', 'Idoso 80+', 'Primeira infância', 'Risco de morte'].includes(term)) return 4;
  if (['Risco de reincidência', 'Sofre ameaça', 'Risco de desabrigo', 'Criança/Adolescente'].includes(term)) return 3;
  if (['PCD', 'Idoso', 'Internação', 'Acolhimento'].includes(term)) return 2;
  return 1;
}

// --- Schemas ---
const teamOverviewResponseSchema = z.array(z.object({
  nome: z.string(),
  cargo: z.string(),
  cases: z.array(z.object({
    id: z.string(),
    nomeCompleto: z.string(),
    status: z.string(),
    urgencia: z.string(),
    violacao: z.array(z.string())
  }))
}))

export async function reportRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()
  
  server.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
      // [CORREÇÃO 2.1] Removida restrição de acesso por cargo para relatórios gerais
      // const { cargo } = request.user as { cargo: string }
      // if (cargo !== Cargo.Gerente && cargo !== Cargo.Auditor) { ... }
    } catch (err) {
      await reply.status(401).send({ message: 'Não autorizado.' })
    }
  })

  // 1. [GET] Visão Geral da Equipe (Carga de Trabalho Detalhada)
  server.get('/reports/team-overview', {
    schema: {
      tags: ['Relatórios'],
      summary: 'Carga de trabalho detalhada por técnico',
      response: {
        200: teamOverviewResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      // 1. Busca técnicos ativos
      const technicians = await prisma.user.findMany({
        where: {
          cargo: { in: [Cargo.Agente_Social, Cargo.Especialista] },
          ativo: true,
        },
        select: { id: true, nome: true, cargo: true },
        orderBy: { cargo: 'asc' },
      })

      // 2. Busca casos ativos
      const activeCases = await prisma.case.findMany({
        where: {
          status: { not: CaseStatus.DESLIGADO },
        },
        select: {
          id: true, 
          nomeCompleto: true, 
          status: true,
          urgencia: true,
          violacao: true, 
          agenteAcolhidaId: true, 
          especialistaPAEFIId: true,
        },
        orderBy: { pesoUrgencia: 'desc' }
      })

      // 3. Cruzamento em Memória
      const overview = technicians.map((tech) => {
        const techCases = activeCases.filter((c) => {
          if (tech.cargo === Cargo.Agente_Social) {
            return (
              c.agenteAcolhidaId === tech.id && 
              (c.status === CaseStatus.AGUARDANDO_ACOLHIDA || c.status === CaseStatus.EM_ACOLHIDA)
            )
          }
          if (tech.cargo === Cargo.Especialista) {
            return (
              c.especialistaPAEFIId === tech.id && 
              (c.status === CaseStatus.EM_ACOLHIDA_ESPECIALIZADA || c.status === CaseStatus.EM_ACOMPANHAMENTO || c.status === CaseStatus.EM_MONITORAMENTO)
            )
          }
          return false
        })

        return {
          nome: tech.nome,
          cargo: tech.cargo === Cargo.Agente_Social ? 'Agente Social' : 'Especialista',
          cases: techCases.map(c => ({
            ...c,
            // Garante array caso venha null ou string antiga
            violacao: Array.isArray(c.violacao) ? c.violacao : (c.violacao ? [c.violacao] : [])
          })), 
        }
      })

      return reply.send(overview)

    } catch (error) {
      console.error('Erro /reports/team-overview:', error)
      return reply.status(500).send({ message: 'Erro interno no servidor.' })
    }
  })

  // 2. [GET] Relatório de Desligamentos (Dismissals)
  server.get('/reports/dismissals', {
    schema: {
      tags: ['Relatórios'],
      summary: 'Estatísticas de casos desligados/arquivados',
      querystring: z.object({ months: z.coerce.number().default(12) })
    }
  }, async (request, reply) => {
    const { months } = request.query
    const startDate = subMonths(new Date(), months)

    try {
      const closedCases = await prisma.case.findMany({
        where: {
          status: CaseStatus.DESLIGADO,
          dataDesligamento: { gte: startDate }
        },
        select: {
          id: true,
          motivoDesligamento: true,
          destinoDesligamento: true,
          dataDesligamento: true,
          dataInicioPAEFI: true
        }
      })

      const motivosCount: Record<string, number> = {}
      const destinosCount: Record<string, number> = {}

      const processedList = closedCases.map(c => {
        const mot = c.motivoDesligamento || 'Não informado'
        const dest = c.destinoDesligamento || 'Não informado'
        
        motivosCount[mot] = (motivosCount[mot] || 0) + 1
        destinosCount[dest] = (destinosCount[dest] || 0) + 1

        let dias = 0;
        if (c.dataInicioPAEFI && c.dataDesligamento) {
            dias = differenceInDays(c.dataDesligamento, c.dataInicioPAEFI);
        }

        return {
            ...c,
            tempoAcompanhamento: dias
        }
      })

      return reply.send({
        total: closedCases.length,
        byMotivo: Object.entries(motivosCount).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value),
        byDestino: Object.entries(destinosCount).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value),
        list: processedList.slice(0, 50)
      })
    } catch (error) {
      console.error(error)
      return reply.status(500).send({ message: 'Erro ao gerar relatório de desligamentos.' })
    }
  })

  // 3. [GET] Vigilância Socioassistencial (Mapas e Gráficos)
  server.get('/reports/vigilancia', {
    schema: { tags: ['Relatórios'], summary: 'Dados para o Observatório (Mapa e Gráficos)' }
  }, async (request, reply) => {
    const today = new Date()
    const sixMonthsAgo = subMonths(today, 6)

    try {
      // Busca ampla
      const cases = await prisma.case.findMany({
        where: {
          OR: [
            { createdAt: { gte: sixMonthsAgo } }, 
            { dataDesligamento: { gte: sixMonthsAgo } },
            { status: { not: CaseStatus.DESLIGADO } } 
          ]
        },
        select: {
          id: true, 
          nomeCompleto: true, 
          dataEntrada: true, 
          dataDesligamento: true,
          status: true, 
          urgencia: true, 
          violacao: true, 
          categoria: true,
          latitude: true, 
          longitude: true, 
          endereco_ra: true,
          orgaoDemandante: true // [CORREÇÃO] Necessário para o gráfico de Rede
        }
      })

      // Evolução Temporal
      const monthsMap = new Map()
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(today, i)
        const key = format(d, 'yyyy-MM')
        monthsMap.set(key, { name: format(d, 'MMM/yy', { locale: ptBR }), novos: 0, desligados: 0 })
      }
      
      const violationMap: Record<string, number> = {}
      const originMap: Record<string, number> = {} // [CORREÇÃO] Mapa para Órgãos
      const mapData: any[] = []

      cases.forEach(c => {
        // Evolução
        const entryKey = format(c.dataEntrada, 'yyyy-MM')
        if (monthsMap.has(entryKey)) monthsMap.get(entryKey).novos++
        if (c.dataDesligamento) {
          const exitKey = format(c.dataDesligamento, 'yyyy-MM')
          if (monthsMap.has(exitKey)) monthsMap.get(exitKey).desligados++
        }

        // Mapa (Apenas Ativos com Geo)
        if (c.status !== CaseStatus.DESLIGADO && c.latitude && c.longitude) {
          mapData.push({
            id: c.id, 
            lat: c.latitude, 
            lng: c.longitude, 
            intensity: calculateUrgencyWeight(c.urgencia),
            label: c.nomeCompleto, 
            violacao: Array.isArray(c.violacao) ? c.violacao.join(', ') : c.violacao,
            endereco: c.endereco_ra,
            categoria: c.categoria 
          })
        }

        // Contagem de Órgãos Demandantes (Todos os casos do período)
        if (c.orgaoDemandante) {
            const org = c.orgaoDemandante.trim()
            originMap[org] = (originMap[org] || 0) + 1
        }

        // Violações (Apenas Ativos)
        if (c.status !== CaseStatus.DESLIGADO) {
          const violations = Array.isArray(c.violacao) ? c.violacao : (c.violacao ? [c.violacao] : [])
          violations.forEach(v => {
              v.split(',').forEach(subV => {
                  const label = subV.trim()
                  if(label) violationMap[label] = (violationMap[label] || 0) + 1
              })
          })
        }
      })

      // Formata dados para o gráfico de Rede
      const originData = Object.entries(originMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)

      return reply.send({
        evolutionData: Array.from(monthsMap.values()),
        violationData: Object.entries(violationMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value),
        originData, // [CORREÇÃO] Retorna dados para o frontend
        mapData,
        totalActive: cases.filter(c => c.status !== CaseStatus.DESLIGADO).length
      })
    } catch (error) {
      console.error(error)
      return reply.status(500).send({ message: 'Erro na vigilância.' })
    }
  })
}