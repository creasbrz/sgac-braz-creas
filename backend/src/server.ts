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

// --- INICIALIZAÇÃO DO APP ---
const app = fastify({
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

// --- 1. CONFIGURAÇÃO ZOD & SWAGGER ---
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'CREAS Brazlândia API',
      description: 'Sistema de Gestão de Atendimentos Social (SGAC)',
      version: '7.1.0',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  transform: jsonSchemaTransform,
})

app.register(fastifySwaggerUi, {
  routePrefix: '/docs',
})

// --- 2. CONFIGURAÇÃO DE DIRETÓRIOS E ARQUIVOS ---
// Uploads
const uploadDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

app.register(multipart, { 
  limits: { fileSize: 10 * 1024 * 1024 } // Aumentado para 10MB para segurança
})

// Servir Uploads
app.register(fastifyStatic, {
  root: uploadDir,
  prefix: '/uploads/',
  decorateReply: false 
})

// --- 3. PLUGINS GERAIS ---
app.register(cors, { 
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] 
})

app.register(jwt, { 
  secret: process.env.JWT_SECRET || 'dev-secret' 
})

// Decorator de Autenticação
app.decorate('authenticate', async (request: any, reply: any) => {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.send(err)
  }
})

// --- 4. REGISTRO DE ROTAS (MANTENDO NOMES ORIGINAIS) ---
app.register(authRoutes)
app.register(caseRoutes)
app.register(userRoutes)
app.register(evolutionRoutes)
app.register(pafRoutes)
app.register(statsRoutes)
app.register(appointmentRoutes)
app.register(reportRoutes)
app.register(alertRoutes)
app.register(auditRoutes)
app.register(attachmentRoutes)
app.register(importRoutes)
app.register(filterRoutes)
app.register(referralRoutes)
app.register(familyRoutes)
app.register(deliverablesRoutes)
app.register(groupRoutes)
app.register(workspaceRoutes)
app.register(waitingListRoutes)

// Alias para Dashboard (apontando para statsRoutes, caso frontend chame)
app.register(statsRoutes, { prefix: '/dashboard' })

// --- 5. SERVIR FRONTEND (SPA) ---
// Resolve o caminho corretamente mesmo após build (tsup/dist)
const frontendDist = path.join(__dirname, '../../frontend/dist')

app.register(fastifyStatic, {
  root: frontendDist,
  prefix: '/',
  wildcard: false, // Importante: Desativa wildcard automático para o handler abaixo funcionar
})

// Handler SPA (Fallback para React Router)
app.setNotFoundHandler((req, reply) => {
  // Se for rota de API, Uploads ou Docs, retorna 404 JSON
  if (req.raw.url && (
    req.raw.url.startsWith('/api') || 
    req.raw.url.startsWith('/uploads') || 
    req.raw.url.startsWith('/docs')
  )) {
    return reply.status(404).send({ 
      message: 'Recurso não encontrado', 
      url: req.raw.url 
    })
  }
  // Caso contrário, retorna o index.html do frontend
  return reply.sendFile('index.html')
})

// --- 6. TRATAMENTO DE ERROS GLOBAL ---
app.setErrorHandler((error, request, reply) => {
  request.log.error(error)
  
  if (error.statusCode === 401) {
    return reply.status(401).send({ message: 'Não autorizado' })
  }
  
  // Erros de validação Zod
  if (error.validation) {
    return reply.status(400).send({ 
      message: 'Erro de validação', 
      errors: error.validation 
    })
  }

  return reply.status(500).send({ 
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  })
})

// --- 7. START ---
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3333
    const host = '0.0.0.0' // Obrigatório para Render
    await app.listen({ port, host })
    console.log(`🚀 Servidor rodando em http://${host}:${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()