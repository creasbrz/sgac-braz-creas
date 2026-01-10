import fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import fastifyStatic from '@fastify/static'
import multipart from '@fastify/multipart'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
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
import { uploadRoutes } from './routes/upload' // Se tiver criado essa rota separada
import { dashboardRoutes } from './routes/dashboard'

// Configuração de diretórios (ESM workaroud)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Inicialização
const app = fastify({
  logger: {
    // Pretty print apenas em dev para performance
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
    info: { title: 'CREAS API', description: 'Sistema de Gestão SGAC', version: '7.1.1' },
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  },
  transform: jsonSchemaTransform,
})

app.register(fastifySwaggerUi, { routePrefix: '/docs' })

// --- PLUGINS ---
app.register(cors, { origin: true })
app.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret-key' })
app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } }) // 10MB

// Decorator Auth
app.decorate('authenticate', async (request: any, reply: any) => {
  try { await request.jwtVerify() } catch (err) { reply.send(err) }
})

// --- ROTAS DA API (PREFIXO /api) ---
// Agrupando para organização e evitar colisão com frontend
app.register(async (api) => {
  api.register(authRoutes) // /api/login, /api/register
  api.register(caseRoutes, { prefix: '/cases' })
  api.register(userRoutes, { prefix: '/users' })
  api.register(evolutionRoutes, { prefix: '/evolutions' })
  api.register(pafRoutes, { prefix: '/paf' })
  api.register(statsRoutes, { prefix: '/stats' })
  api.register(dashboardRoutes, { prefix: '/dashboard' })
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
  // Se tiver rota de upload dedicada:
  // api.register(uploadRoutes, { prefix: '/upload' }) 
}, { prefix: '/api' })


// --- SERVIR FRONTEND (SPA) ---
// Resolve o caminho para a pasta 'dist' do frontend (gerada pelo Vite)
// Em dev (src/), volta 2 níveis. Em prod (dist/), volta 2 níveis.
const frontendDist = path.resolve(__dirname, '../../frontend/dist')

app.register(fastifyStatic, {
  root: frontendDist,
  prefix: '/',
  wildcard: false, // Desativa wildcard automático p/ tratar 404 manualmente
})

// Handler SPA: Se não for API nem arquivo estático, devolve index.html
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