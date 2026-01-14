import fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import fastifyStatic from '@fastify/static'
import multipart from '@fastify/multipart'
import path from 'node:path'
import { fileURLToPath } from 'node:url' // Necessário para ESM
import { 
  serializerCompiler, 
  validatorCompiler, 
  jsonSchemaTransform, 
  ZodTypeProvider 
} from 'fastify-type-provider-zod'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'

// Import de TODAS as rotas
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

// --- CONFIGURAÇÃO DE AMBIENTE ---
// Recria __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isDev = process.env.NODE_ENV !== 'production'

const app = fastify({
  logger: {
    // Pino-pretty apenas em DEV para não impactar performance em PROD
    transport: isDev
      ? {
          target: 'pino-pretty',
          options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname', colorize: true },
        }
      : undefined,
  },
}).withTypeProvider<ZodTypeProvider>()

// --- PLUGINS GLOBAIS ---
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

// [IMPORTANTE] CORS
app.register(cors, { 
  origin: true, // Em produção, considere restringir para o domínio do frontend
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition'] 
})

app.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret' })
app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } }) // 10MB limit

// Documentação Swagger
app.register(fastifySwagger, {
  openapi: {
    info: { title: 'CREAS API - SUAS', version: '7.2.0' },
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  },
  transform: jsonSchemaTransform,
})
app.register(fastifySwaggerUi, { routePrefix: '/docs' })

// Decorator Auth
app.decorate('authenticate', async (request: any, reply: any) => {
  try { 
    await request.jwtVerify() 
  } catch (err) { 
    reply.status(401).send({ message: 'Não autorizado', code: 'UNAUTHORIZED' }) 
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
  
  // Dashboard específico (cuidado com duplicidade se statsRoutes já tiver rotas base)
  api.register(statsRoutes, { prefix: '/dashboard' })

}, { prefix: '/api' })

// --- SERVIR FRONTEND (SPA) ---
// Caminho robusto para o build do Vite
const frontendDist = path.join(__dirname, '../../frontend/dist')

app.register(fastifyStatic, {
  root: frontendDist,
  prefix: '/',
  wildcard: false, // Importante: Desativa wildcard automático para tratarmos manualmente o SPA
})

// Handler SPA e API 404
app.setNotFoundHandler((req, reply) => {
  // Se for rota de API, retorna JSON 404
  if (req.raw.url && req.raw.url.startsWith('/api')) {
    return reply.status(404).send({ 
      error: 'Not Found',
      message: `Rota não encontrada: ${req.raw.url}` 
    })
  }
  
  // Se for navegação do browser (React Router), serve o index.html
  return reply.sendFile('index.html')
})

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3333
    const host = '0.0.0.0' // Obrigatório para Render/Docker
    
    await app.ready()
    await app.listen({ port, host })
    
    console.log(`🚀 HTTP Server running on http://${host}:${port}`)
    console.log(`📂 Serving frontend from: ${frontendDist}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()