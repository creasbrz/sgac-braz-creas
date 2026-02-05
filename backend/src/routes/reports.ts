// backend/src/routes/reports.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { ReportController } from '../controllers/ReportController'

// Schemas simplificados para documentação (Respostas complexas tipadas como any/object para flexibilidade)
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
  
  server.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  server.get('/reports/team-overview', {
    schema: {
      tags: ['Relatórios'],
      summary: 'Carga de trabalho detalhada por técnico',
      response: { 200: teamOverviewResponseSchema }
    }
  }, ReportController.getTeamOverview)

  server.get('/reports/dismissals', {
    schema: {
      tags: ['Relatórios'],
      summary: 'Estatísticas de casos desligados/arquivados',
      querystring: z.object({ months: z.coerce.number().default(12) })
    }
  }, ReportController.getDismissals)

  server.get('/reports/vigilancia', {
    schema: { 
      tags: ['Relatórios'], 
      summary: 'Dados para o Observatório (Mapa e Gráficos)' 
    }
  }, ReportController.getVigilance)
}