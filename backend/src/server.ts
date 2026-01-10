import fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import fastifyStatic from '@fastify/static'
import multipart from '@fastify/multipart'
import path from 'node:path'
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
import { statsRoutes } from './routes/stats'

// Inicialização
const app = fastify({
  // FORÇANDO LOGS BONITOS MESMO EM PRODUÇÃO PARA DEBUG
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
        colorize: true,
      },
    },
  },
}).withTypeProvider<ZodTypeProvider>()

// --- ZOD & SWAGGER ---
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.register(fastifySwagger, {
  openapi: {
    info: { title: 'CREAS API', description: 'Sistema de Gestão SGAC', version: '7.1.4' },
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  },
  transform: jsonSchemaTransform,
})

app.register(fastifySwaggerUi, { routePrefix: '/docs' })

// --- PLUGINS GLOBAIS ---
app.register(cors, { origin: true })
app.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret-key' })
app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } })

// DECORATOR DE AUTH
app.decorate('authenticate', async (request: any, reply: any) => {
  try { await request.jwtVerify() } catch (err) { reply.send(err) }
})

// --- REGISTRO DE ROTAS (CAMINHO COMPLETO) ---
// Removemos o aninhamento para garantir que todas funcionem
app.register(authRoutes, { prefix: '/api' }) // Login fica em /api/login

app.register(caseRoutes, { prefix: '/api/cases' })
app.register(userRoutes, { prefix: '/api/users' })
app.register(evolutionRoutes, { prefix: '/api/evolutions' })
app.register(pafRoutes, { prefix: '/api/paf' })
app.register(statsRoutes, { prefix: '/api/stats' })
app.register(appointmentRoutes, { prefix: '/api/appointments' })
app.register(reportRoutes, { prefix: '/api/reports' })
app.register(alertRoutes, { prefix: '/api/alerts' })
app.register(auditRoutes, { prefix: '/api/audit' })
app.register(attachmentRoutes, { prefix: '/api/attachments' })
app.register(importRoutes, { prefix: '/api/import' })
app.register(filterRoutes, { prefix: '/api/filters' })
app.register(referralRoutes, { prefix: '/api/referrals' })
app.register(familyRoutes, { prefix: '/api/family' })
app.register(deliverablesRoutes, { prefix: '/api/deliverables' })
app.register(groupRoutes, { prefix: '/api/groups' })
app.register(workspaceRoutes, { prefix: '/api/workspace' })
app.register(waitingListRoutes, { prefix: '/api/waiting-list' })

// ALIAS PARA DASHBOARD
app.register(statsRoutes, { prefix: '/api/dashboard' })


// --- TRATAMENTO DE ERROS GLOBAL ---
app.setErrorHandler((error, request, reply) => {
  app.log.error(error) // Loga o erro real no console do Render
  
  if (error.statusCode === 401) {
    return reply.status(401).send({ message: 'Não autorizado' })
  }
  
  // Se for erro de validação do Zod
  if (error.validation) {
    return reply.status(400).send({ message: 'Erro de validação', errors: error.validation })
  }

  return reply.status(500).send({ 
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined 
  })
})

// --- SERVIR FRONTEND (SPA) ---
const frontendDist = path.join(__dirname, '../../frontend/dist')

app.register(fastifyStatic, {
  root: frontendDist,
  prefix: '/',
  wildcard: false,
})

app.setNotFoundHandler((req, reply) => {
  if (req.raw.url && req.raw.url.startsWith('/api')) {
    return reply.status(404).send({ error: 'Not Found', message: `Rota API '${req.raw.url}' não existe.` })
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
    console.log(`📋 Rotas disponíveis: /api/cases, /api/users, etc...`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()