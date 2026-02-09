// backend/src/routes/stats.ts
import { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { StatsController } from "../controllers/StatsController"

// Schemas
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

  server.get("/stats", {
    schema: { tags: ['Dashboard'], summary: 'Indicadores principais' }
  }, StatsController.getDashboard)

  server.get("/stats/productivity", {
    schema: { tags: ['Dashboard'], querystring: productivityQuerySchema }
  }, StatsController.getProductivity)

  server.get("/stats/vigilancia", {
    schema: { tags: ['Dashboard'], summary: 'Relatório avançado de vigilância' }
  }, StatsController.getVigilance)

  server.get("/stats/advanced", {
    schema: { tags: ['Dashboard'], querystring: statsQuerySchema }
  }, StatsController.getAdvanced)

  server.get("/stats/activity", {
    schema: { tags: ['Dashboard'] }
  }, StatsController.getActivity)
}