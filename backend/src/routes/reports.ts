// backend/src/routes/reports.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { ReportService } from '../services/ReportService'

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
      // Acesso liberado a todos os níveis, mas exige login
    } catch (err) {
      await reply.status(401).send({ message: 'Não autorizado.' })
    }
  })

  // 1. [GET] Visão Geral da Equipe
  server.get('/reports/team-overview', {
    schema: {
      tags: ['Relatórios'],
      summary: 'Carga de trabalho detalhada por técnico',
      response: { 200: teamOverviewResponseSchema }
    }
  }, async (request, reply) => {
    try {
      const overview = await ReportService.getTeamOverview()
      return reply.send(overview)
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ message: 'Erro interno no servidor.' })
    }
  })

  // 2. [GET] Relatório de Desligamentos
  server.get('/reports/dismissals', {
    schema: {
      tags: ['Relatórios'],
      summary: 'Estatísticas de casos desligados/arquivados',
      querystring: z.object({ months: z.coerce.number().default(12) })
    }
  }, async (request, reply) => {
    const { months } = request.query
    try {
      const report = await ReportService.getDismissalsReport(months)
      return reply.send(report)
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ message: 'Erro ao gerar relatório de desligamentos.' })
    }
  })

  // 3. [GET] Vigilância Socioassistencial
  server.get('/reports/vigilancia', {
    schema: { tags: ['Relatórios'], summary: 'Dados para o Observatório (Mapa e Gráficos)' }
  }, async (request, reply) => {
    try {
      const stats = await ReportService.getVigilanceStats()
      return reply.send(stats)
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ message: 'Erro na vigilância.' })
    }
  })
}