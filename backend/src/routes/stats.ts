// backend/src/routes/stats.ts
import { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { Cargo } from "@prisma/client"
import { StatsService } from "../services/StatsService"

const statsQuerySchema = z.object({
  months: z.coerce.number().min(1).max(60).default(12),
  violacao: z.string().optional()
})

const productivityQuerySchema = z.object({
  mode: z.enum(['workload', 'performance']).default('workload'),
  months: z.coerce.number().default(1)
})

export async function statsRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()
  
  server.addHook("onRequest", async (request, reply) => {
    try { await request.jwtVerify() } 
    catch { return reply.status(401).send({ message: "Não autorizado." }) }
  })

  // 1. [GET] /stats - DASHBOARD GERAL
  server.get("/stats", {
    schema: { tags: ['Dashboard'], summary: 'Indicadores principais e contagens gerais' }
  }, async (request, reply) => {
    const { cargo, sub } = request.user as { cargo: string; sub: string }
    const result = await StatsService.getDashboard({ sub, cargo })
    
    if ((result as any).cached) {
        reply.header('X-Cache', 'HIT')
    }
    return reply.send(result)
  })

  // 2. [GET] /stats/productivity
  server.get("/stats/productivity", {
    schema: { tags: ['Dashboard'], querystring: productivityQuerySchema }
  }, async (request, reply) => {
    const { mode, months } = request.query
    const result = await StatsService.getProductivity(mode, months)
    return reply.send(result)
  })

  // 3. [GET] /stats/vigilancia
  server.get("/stats/vigilancia", {
    schema: { tags: ['Dashboard'], summary: 'Relatório avançado de vigilância' }
  }, async (request, reply) => {
    const { cargo } = request.user as { cargo: string }
    if (!['Gerente', 'Especialista'].includes(cargo)) return reply.status(403).send({ message: "Acesso restrito." })

    const result = await StatsService.getVigilanceStats()
    return reply.send(result)
  })

  // 4. [GET] /stats/advanced - ANALYTICS IA
  server.get("/stats/advanced", {
    schema: { tags: ['Dashboard'], summary: 'Análise de tendências e IA', querystring: statsQuerySchema }
  }, async (request, reply) => {
    const { cargo } = request.user as { cargo: string }
    if (cargo !== Cargo.Gerente) return reply.status(403).send({ message: "Acesso restrito." })

    const { months, violacao } = request.query
    const result = await StatsService.getAdvancedStats(months, violacao)
    return reply.send(result)
  })

  // 5. [GET] /stats/activity
  server.get("/stats/activity", {
    schema: { tags: ['Dashboard'] }
  }, async (request, reply) => {
    const { cargo, sub } = request.user as { cargo: string; sub: string }
    const result = await StatsService.getRecentActivity({ sub, cargo })
    return reply.send(result)
  })
}