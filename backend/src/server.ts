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

// --- IMPORTAÇÃO DAS ROTAS ---
import { authRoutes } from './routes/auth'
import { caseRoutes } from './routes/cases'
import { userRoutes } from './routes/users'
import { evolutionRoutes } from './routes/evolutions'
import { pafRoutes } from './routes/paf'
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

// AQUI ESTÁ A CORREÇÃO:
// O dashboard usa a mesma lógica das estatísticas, então importamos apenas statsRoutes
import { statsRoutes } from './routes/stats'

// Inicialização
const app = fastify({
  logger: {
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname', colorize: true },
    } : undefined,
  },
}).withTypeProvider<ZodTypeProvider>()

// --- ZOD & SWAGGER ---
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.register(fastifySwagger, {
  openapi: {
    info: { title: 'CREAS API', description: 'Sistema de Gestão SGAC', version: '7.1.3' },
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  },
  transform: jsonSchemaTransform,
})

app.register(fastifySwaggerUi, { routePrefix: '/docs' })

// --- PLUGINS ---
app.register(cors, { origin: true })
app.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret-key' })
app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } })

app.decorate('authenticate', async (request: any, reply: any) => {
  try { await request.jwtVerify() } catch (err) { reply.send(err) }
})

// --- ROTAS DA API (PREFIXO /api) ---
app.register(async (api) => {
  api.register(authRoutes)
  api.register(caseRoutes, { prefix: '/cases' })
  api.register(userRoutes, { prefix: '/users' })
  api.register(evolutionRoutes, { prefix: '/evolutions' })
  api.register(pafRoutes, { prefix: '/paf' })
  api.register(appointmentRoutes, { prefix: '/appointments' })
  api.register(reportRoutes, { prefix: '/reports' })
  api.register(alertRoutes, { prefix: '/alerts' })
  api.register(auditRoutes, { prefix: '/audit' })
  api.register(attachmentRoutes, { prefix: '/attachments' })
  api.register(importRoutes, { prefix: '/import' })
  api.register(filterRoutes, { prefix: '/filters' })
  api.register(referralRoutes, { prefix: '/referrals' })
  api.register(familyRoutes, { prefix: '/family' })
  api.register(deliverablesRoutes, { prefix: '/deliverables' })
  api.register(groupRoutes, { prefix: '/groups' })
  api.register(workspaceRoutes, { prefix: '/workspace' })
  api.register(waitingListRoutes, { prefix: '/waiting-list' })
  
  // CORREÇÃO AQUI:
  // Registramos statsRoutes tanto em /stats quanto em /dashboard (alias)
  // Isso garante compatibilidade se o frontend chamar qualquer um dos dois
  api.register(statsRoutes, { prefix: '/stats' })
  api.register(statsRoutes, { prefix: '/dashboard' }) 

}, { prefix: '/api' })


// --- SERVIR FRONTEND (SPA) ---
const frontendDist = path.join(__dirname, '../../frontend/dist')

app.register(fastifyStatic, {
  root: frontendDist,
  prefix: '/',
  wildcard: false,
})

app.setNotFoundHandler((req, reply) => {
  if (req.raw.url && req.raw.url.startsWith('/api')) {
    return reply.status(404).send({ error: 'Not Found', message: `Route ${req.raw.url} not found` })
  }
  return reply.sendFile('index.html')
})

// --- START ---
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3333
    const host = '0.0.0.0'
    await app.listen({ port, host })
    console.log(`🚀 HTTP Server running on http://${host}:${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()