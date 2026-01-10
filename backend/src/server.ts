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

// Importação das rotas
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

// --- CONFIGS GERAIS ---
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.register(cors, { origin: true })
app.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret' })
app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } })

// Swagger
app.register(fastifySwagger, {
  openapi: {
    info: { title: 'CREAS API', version: '7.1.5' },
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  },
  transform: jsonSchemaTransform,
})
app.register(fastifySwaggerUi, { routePrefix: '/docs' })

// Decorator Auth
app.decorate('authenticate', async (request: any, reply: any) => {
  try { await request.jwtVerify() } catch (err) { reply.send(err) }
})

// --- REGISTRO DE ROTAS PLANO (SEM WRAPPERS) ---
// Tentativa 1: Registrar Auth com prefixo /api (O padrão esperado)
app.register(authRoutes, { prefix: '/api' })

// Tentativa 2: Registrar Auth SEM prefixo (Caso o arquivo auth.ts já tenha '/api' dentro dele)
// O Fastify avisa se tiver rota duplicada, mas se auth.ts usar '/login', isso cria a rota '/login' raiz
// Se auth.ts usar '/api/login', isso cria a rota '/api/login' corretamente.
// app.register(authRoutes) <--- Deixei comentado para não dar conflito, vamos testar o prefixo primeiro.

// Demais rotas (Forçando /api explicitamente)
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

// Alias Dashboard
app.register(statsRoutes, { prefix: '/api/dashboard' })

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

// --- START & DEBUG ---
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3333
    const host = '0.0.0.0'
    
    // Mostra todas as rotas registradas no log ao iniciar!
    await app.ready()
    console.log('\n--- MAPA DE ROTAS REGISTRADAS ---')
    console.log(app.printRoutes()) 
    console.log('---------------------------------\n')

    await app.listen({ port, host })
    console.log(`🚀 HTTP Server running on http://${host}:${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()