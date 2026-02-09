// backend/src/server.ts
import fastify, { FastifyRequest, FastifyReply } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import fastifyStatic from '@fastify/static'
import multipart from '@fastify/multipart'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import rateLimit from '@fastify/rate-limit' 
import path from 'node:path'
import fs from 'node:fs'
import { 
  serializerCompiler, 
  validatorCompiler, 
  jsonSchemaTransform, 
  ZodTypeProvider 
} from 'fastify-type-provider-zod'

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
import { instrumentalRoutes } from './routes/instrumentals'

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
  connectionTimeout: 30000,
  bodyLimit: 10 * 1024 * 1024 
}).withTypeProvider<ZodTypeProvider>()

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)
app.setErrorHandler(errorHandler)

// --- PLUGINS ---

app.register(cors, { 
  origin: true, 
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Disposition'] 
})

app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  allowList: ['127.0.0.1'],
  errorResponseBuilder: () => ({ 
    statusCode: 429, 
    error: 'Too Many Requests', 
    message: 'Muitas tentativas. Tente novamente em 1 minuto.' 
  })
})

app.register(jwt, { 
  secret: process.env.JWT_SECRET || 'dev-secret-change-in-prod' 
})

app.register(multipart, { 
  limits: { 
    fileSize: 20 * 1024 * 1024,
    files: 1 
  },
  attachFieldsToBody: false 
})

app.register(fastifySwagger, {
  openapi: {
    info: { title: 'CREAS Brazlândia API', version: '8.3.0' }, // Atualizado para v8.3
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

// Decorator de Autenticação Global
app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
  try { 
    await request.jwtVerify() 
  } catch (err) { 
    reply.status(401).send({ message: 'Acesso não autorizado', code: 'UNAUTHORIZED' }) 
  }
})

// --- REGISTRO DE ROTAS ---
app.register(async (api) => {
  try {
    console.log('📦 Registrando rotas da API...')
    
    // Core & Auth
    api.register(authRoutes)
    api.register(userRoutes)
    api.register(workspaceRoutes)
    
    // Casos e Atendimento
    api.register(caseRoutes)
    api.register(evolutionRoutes)
    api.register(appointmentRoutes)
    api.register(familyRoutes)
    api.register(referralRoutes)
    api.register(waitingListRoutes)
    
    // Instrumentais Técnicos (v8.3)
    // [CORREÇÃO] Registrado corretamente no escopo 'api'
    api.register(instrumentalRoutes)
    api.register(pafRoutes) // Mantido por compatibilidade legado, se necessário
    
    // Gestão e Relatórios
    api.register(statsRoutes)
    api.register(statsRoutes, { prefix: '/dashboard' }) // Alias
    api.register(reportRoutes)
    api.register(rmaRoutes)
    api.register(deliverablesRoutes)
    
    // Sistema e Arquivos
    api.register(alertRoutes)
    api.register(auditRoutes)
    api.register(importRoutes)
    api.register(filterRoutes)
    api.register(groupRoutes)
    api.register(attachmentRoutes)
    
    console.log('✅ Todas as rotas registradas com sucesso.')
  } catch (err) {
    console.error('❌ Falha fatal no registro de rotas:', err)
    process.exit(1) // Falha no boot se rotas críticas falharem
  }

}, { prefix: '/api' })

// --- STATIC FILES (Frontend Serving) ---
const possibleDistPaths = [
  path.join(__dirname, '../../frontend/dist'),
  path.join(__dirname, '../frontend/dist'),    
  path.join(process.cwd(), 'frontend/dist')    
]

const frontendDist = possibleDistPaths.find(p => fs.existsSync(p)) || possibleDistPaths[0]

app.register(fastifyStatic, {
  root: frontendDist,
  prefix: '/',
  wildcard: false,
  preCompressed: true
})

// Fallback para SPA (Single Page Application)
app.setNotFoundHandler((req, reply) => {
  if (req.raw.url && req.raw.url.startsWith('/api')) {
    return reply.status(404).send({ 
      error: 'Not Found', 
      message: `Endpoint não encontrado: ${req.raw.url}` 
    })
  }
  // Se não for API, retorna o index.html do React
  return reply.sendFile('index.html')
})

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3333
    const host = '0.0.0.0' 
    
    await app.ready()
    await app.listen({ port, host })
    
    console.log(`🚀 Server running on http://${host}:${port}`)
    console.log(`📂 Static files path: ${frontendDist} (${fs.existsSync(frontendDist) ? 'Found' : 'Not Found'})`)
    console.log(`📚 Documentation: http://${host}:${port}/docs`)

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