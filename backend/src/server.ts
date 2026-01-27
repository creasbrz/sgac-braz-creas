// backend/src/server.ts
import fastify, { FastifyRequest, FastifyReply } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import fastifyStatic from '@fastify/static'
import multipart from '@fastify/multipart'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import path from 'node:path'
import fs from 'node:fs'
import { 
  serializerCompiler, 
  validatorCompiler, 
  jsonSchemaTransform, 
  ZodTypeProvider 
} from 'fastify-type-provider-zod'

// Error Handler
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

// --- CONFIGURAÇÃO DE AMBIENTE ---
const isDev = process.env.NODE_ENV !== 'production'

// --- INSTÂNCIA DO SERVIDOR ---
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
  connectionTimeout: 30000,
  // Aumenta o limite de tamanho do corpo globalmente para evitar erros em JSONs grandes
  bodyLimit: 10 * 1024 * 1024 
}).withTypeProvider<ZodTypeProvider>()

// --- VALIDAÇÃO (ZOD) ---
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)
app.setErrorHandler(errorHandler)

// --- PLUGINS ---

// 1. CORS
app.register(cors, { 
  origin: true, // Em produção, considere restringir para o domínio exato
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Disposition'] 
})

// 2. JWT
app.register(jwt, { 
  secret: process.env.JWT_SECRET || 'dev-secret-change-in-prod' 
})

// 3. MULTIPART (Uploads)
app.register(multipart, { 
  limits: { 
    fileSize: 20 * 1024 * 1024, // 20MB
    files: 1 
  },
  attachFieldsToBody: false 
})

// 4. SWAGGER (Docs)
app.register(fastifySwagger, {
  openapi: {
    info: { title: 'CREAS Brazlândia API', version: '7.6.6' },
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

// --- ROTAS (API) ---
app.register(async (api) => {
  // Core
  api.register(authRoutes)
  api.register(userRoutes)
  api.register(workspaceRoutes)
  
  // Casos e Atendimentos
  api.register(caseRoutes)
  api.register(evolutionRoutes)
  api.register(pafRoutes)
  api.register(appointmentRoutes)
  api.register(referralRoutes)
  api.register(familyRoutes)
  api.register(rmaRoutes)
  api.register(waitingListRoutes)
  
  // Gestão e Ferramentas
  api.register(statsRoutes)
  api.register(statsRoutes, { prefix: '/dashboard' }) // Alias
  api.register(reportRoutes)
  api.register(alertRoutes)
  api.register(auditRoutes)
  api.register(importRoutes)
  api.register(filterRoutes)
  api.register(deliverablesRoutes)
  api.register(groupRoutes)
  api.register(attachmentRoutes)

}, { prefix: '/api' })

// --- SERVIR FRONTEND (STATIC) ---
// [CORREÇÃO] Em CommonJS, __dirname é global. Usamos ele para garantir compatibilidade.
const possibleDistPaths = [
  path.join(__dirname, '../../frontend/dist'), // Dev: backend/src -> frontend/dist
  path.join(__dirname, '../frontend/dist'),    // Prod: backend/dist -> frontend/dist
  path.join(process.cwd(), 'frontend/dist')    // Fallback: raiz do processo
]

const frontendDist = possibleDistPaths.find(p => fs.existsSync(p)) || possibleDistPaths[0]

app.register(fastifyStatic, {
  root: frontendDist,
  prefix: '/',
  wildcard: false,
  preCompressed: true
})

// SPA Fallback (Qualquer rota não-API retorna o index.html)
app.setNotFoundHandler((req, reply) => {
  if (req.raw.url && req.raw.url.startsWith('/api')) {
    return reply.status(404).send({ 
      error: 'Not Found',
      message: `Endpoint não encontrado: ${req.raw.url}` 
    })
  }
  return reply.sendFile('index.html')
})

// --- INICIALIZAÇÃO E SHUTDOWN ---
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3333
    const host = '0.0.0.0' 
    
    await app.ready()
    await app.listen({ port, host })
    
    console.log(`🚀 Server running on http://${host}:${port}`)
    console.log(`📂 Static files path: ${frontendDist} (${fs.existsSync(frontendDist) ? 'Found' : 'Not Found'})`)
    console.log(`📚 Documentation: http://${host}:${port}/docs`)

    // Graceful Shutdown para Render/Docker
    const signals = ['SIGINT', 'SIGTERM']
    signals.forEach((signal) => {
      process.on(signal, async () => {
        console.log(`\n🛑 Recebido ${signal}. Encerrando servidor graciosamente...`)
        await app.close()
        process.exit(0)
      })
    })

  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()