// backend/src/server.ts
import fastify, { FastifyRequest, FastifyReply } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import fastifyStatic from '@fastify/static'
import multipart from '@fastify/multipart'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { 
  serializerCompiler, 
  validatorCompiler, 
  jsonSchemaTransform, 
  ZodTypeProvider 
} from 'fastify-type-provider-zod'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'

// [NOVO] Importação do Error Handler
import { errorHandler } from './lib/errorHandler'

// Importação das Rotas
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
import { rmaRoutes } from './routes/rma'

// --- CONFIGURAÇÃO DE AMBIENTE (ESM) ---
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const isDev = process.env.NODE_ENV !== 'production'

const app = fastify({
  logger: {
    transport: isDev
      ? {
          target: 'pino-pretty',
          options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname', colorize: true },
        }
      : undefined,
    level: isDev ? 'debug' : 'info'
  },
  connectionTimeout: 30000 
}).withTypeProvider<ZodTypeProvider>()

// --- PLUGINS DE VALIDAÇÃO (ZOD) ---
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

// --- GLOBAL ERROR HANDLER ---
// [MODIFICADO] Usa a função extraída
app.setErrorHandler(errorHandler)

// --- MIDDLEWARES ---
app.register(cors, { 
  origin: true, 
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition'] 
})

app.register(jwt, { 
  secret: process.env.JWT_SECRET || 'dev-secret-change-in-prod' 
})

app.register(multipart, { 
  limits: { fileSize: 10 * 1024 * 1024 },
  attachFieldsToBody: true 
})

// --- DOCUMENTAÇÃO (SWAGGER) ---
app.register(fastifySwagger, {
  openapi: {
    info: { title: 'CREAS Brazlândia API', version: '7.5.0' },
    components: { 
      securitySchemes: { 
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } 
      } 
    },
  },
  transform: jsonSchemaTransform,
})

app.register(fastifySwaggerUi, { 
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'none',
    deepLinking: false
  }
})

// --- DECORATORS ---
app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
  try { 
    await request.jwtVerify() 
  } catch (err) { 
    reply.status(401).send({ message: 'Acesso não autorizado', code: 'UNAUTHORIZED' }) 
  }
})

// --- REGISTRO DE ROTAS ---
app.register(async (api) => {
  api.register(authRoutes)
  api.register(caseRoutes)
  api.register(userRoutes)
  api.register(evolutionRoutes)
  api.register(pafRoutes)
  api.register(statsRoutes)
  api.register(appointmentRoutes)
  api.register(reportRoutes)
  api.register(alertRoutes)
  api.register(auditRoutes)
  api.register(attachmentRoutes)
  api.register(importRoutes)
  api.register(filterRoutes)
  api.register(referralRoutes)
  api.register(familyRoutes)
  api.register(deliverablesRoutes)
  api.register(groupRoutes)
  api.register(workspaceRoutes)
  api.register(waitingListRoutes)
  api.register(rmaRoutes)
  
  api.register(statsRoutes, { prefix: '/dashboard' })

}, { prefix: '/api' })

// --- SERVIR FRONTEND ---
const frontendDist = path.join(__dirname, '../../frontend/dist')

app.register(fastifyStatic, {
  root: frontendDist,
  prefix: '/',
  wildcard: false,
  preCompressed: true
})

app.setNotFoundHandler((req, reply) => {
  if (req.raw.url && req.raw.url.startsWith('/api')) {
    return reply.status(404).send({ 
      error: 'Not Found',
      message: `Endpoint não encontrado: ${req.raw.url}` 
    })
  }
  return reply.sendFile('index.html')
})

// --- INICIALIZAÇÃO ---
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3333
    const host = '0.0.0.0' 
    
    await app.ready()
    await app.listen({ port, host })
    
    console.log(`🚀 Server running on http://${host}:${port}`)
    console.log(`📂 Static files path: ${frontendDist}`)
    console.log(`📚 Documentation: http://${host}:${port}/docs`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()