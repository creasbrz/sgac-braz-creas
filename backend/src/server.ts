import fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import fastifyStatic from '@fastify/static'
import multipart from '@fastify/multipart'
import path from 'node:path'
import fs from 'node:fs'
import { 
  serializerCompiler, 
  validatorCompiler, 
  jsonSchemaTransform, 
  ZodTypeProvider 
} from 'fastify-type-provider-zod'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'

// Rotas
import { authRoutes } from './routes/auth'
import { caseRoutes } from './routes/cases'
import { userRoutes } from './routes/users'
import { evolutionRoutes } from './routes/evolutions'
import { pafRoutes } from './routes/paf'
import { statsRoutes } from './routes/stats'
import { appointmentRoutes } from './routes/appointments'
import { reportRoutes } from './routes/reports'
import { alertRoutes } from './routes/alerts'
import { auditRoutes } from './routes/audit'
import { attachmentRoutes } from './routes/attachments'
import { importRoutes } from './routes/import'
import { filterRoutes } from './routes/filters'
import { referralRoutes } from './routes/referrals'
import { familyRoutes } from './routes/family'
import { deliverablesRoutes } from './routes/deliverables'
import { groupRoutes } from './routes/groups'
import { workspaceRoutes } from './routes/workspace'
import { waitingListRoutes } from './routes/waitingList'

const app = fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname', colorize: true },
    },
  },
}).withTypeProvider<ZodTypeProvider>()

// --- PLUGINS GLOBAIS ---
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)
app.register(cors, { origin: true })
app.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret' })
app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } })

app.register(fastifySwagger, {
  openapi: {
    info: { title: 'CREAS API', version: '7.2.0' },
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  },
  transform: jsonSchemaTransform,
})
app.register(fastifySwaggerUi, { routePrefix: '/docs' })

app.decorate('authenticate', async (request: any, reply: any) => {
  try { await request.jwtVerify() } catch (err) { reply.send(err) }
})

// --- REGISTRO DE ROTAS CORRIGIDO ---
// Criamos um grupo '/api'. Dentro dele, registramos as rotas SEM adicionar prefixo extra.
// Como os arquivos já tem '/cases', '/users', etc., o resultado final será '/api/cases'.
app.register(async (api) => {
  api.register(authRoutes)         // -> /api/login
  api.register(caseRoutes)         // -> /api/cases
  api.register(userRoutes)         // -> /api/users
  api.register(evolutionRoutes)    // -> /api/evolutions
  api.register(pafRoutes)          // -> /api/paf
  api.register(statsRoutes)        // -> /api/stats
  api.register(appointmentRoutes)  // -> /api/appointments
  api.register(reportRoutes)       // -> /api/reports
  api.register(alertRoutes)        // -> /api/alerts
  api.register(auditRoutes)        // -> /api/audit
  api.register(attachmentRoutes)   // -> /api/attachments
  api.register(importRoutes)       // -> /api/import
  api.register(filterRoutes)       // -> /api/filters
  api.register(referralRoutes)     // -> /api/referrals
  api.register(familyRoutes)       // -> /api/family
  api.register(deliverablesRoutes) // -> /api/deliverables
  api.register(groupRoutes)        // -> /api/groups
  api.register(workspaceRoutes)    // -> /api/workspace
  api.register(waitingListRoutes)  // -> /api/waiting-list
  
  // Dashboard é especial (alias). Se statsRoutes define /stats, e colocarmos prefixo /dashboard...
  // ficaria /api/dashboard/stats. Vamos deixar assim por compatibilidade.
  api.register(statsRoutes, { prefix: '/dashboard' })

}, { prefix: '/api' })

// --- SERVIR FRONTEND ---
const frontendDist = path.join(__dirname, '../../frontend/dist')
app.register(fastifyStatic, {
  root: frontendDist,
  prefix: '/',
  wildcard: false,
})

app.setNotFoundHandler((req, reply) => {
  if (req.raw.url && req.raw.url.startsWith('/api')) {
    return reply.status(404).send({ message: `Rota não encontrada: ${req.raw.url}` })
  }
  return reply.sendFile('index.html')
})

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3333
    const host = '0.0.0.0'
    
    // Imprime rotas para confirmar a correção
    await app.ready()
    console.log(app.printRoutes()) 

    await app.listen({ port, host })
    console.log(`🚀 HTTP Server running on http://${host}:${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()