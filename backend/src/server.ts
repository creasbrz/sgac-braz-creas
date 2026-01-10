import fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import fastifyStatic from '@fastify/static'
import multipart from '@fastify/multipart'
import path from 'path'
import fs from 'fs'
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

// Inicialização do App com Tipagem Zod
const app = fastify({
 logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z', // Mostra a hora legível
        ignore: 'pid,hostname',       // Esconde ID do processo e nome da máquina (poluição visual)
        colorize: true                // Força as cores
      },
    },
  },
}).withTypeProvider<ZodTypeProvider>()

// --- 1. CONFIGURAÇÃO DO ZOD (VALIDATION) ---
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

// --- 2. CONFIGURAÇÃO DO SWAGGER (DOCUMENTAÇÃO) ---
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

// --- 3. CONFIGURAÇÃO DE ARQUIVOS (UPLOADS & ESTÁTICOS) ---
// ALERTA: No Render, arquivos em disco são deletados a cada deploy.
const uploadDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

app.register(multipart, { 
  limits: { fileSize: 5 * 1024 * 1024 } // Limite de 5MB
})

// Servir arquivos de upload (prefixo /uploads/)
app.register(fastifyStatic, {
  root: uploadDir,
  prefix: '/uploads/',
  decorateReply: false 
})

// Servir Frontend (SPA) - Ajuste o caminho '../frontend/dist' conforme sua estrutura de pastas real
const frontendDist = path.join(__dirname, '../../frontend/dist')

app.register(fastifyStatic, {
  root: frontendDist,
  prefix: '/',
  wildcard: false, // Desativa wildcard automático para tratarmos SPA manualmente abaixo
})

// --- 4. PLUGINS GERAIS ---
app.register(cors, { 
  origin: true, 
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] 
})

app.register(jwt, { 
  secret: process.env.JWT_SECRET as string 
})

// Decorator de Autenticação
app.decorate('authenticate', async (request: any, reply: any) => {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.send(err)
  }
})

// --- 5. REGISTRO DE ROTAS ---
// Importante: Registre após o Swagger para aparecerem na documentação
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

// --- 6. HANDLER SPA (FALLBACK) ---
// Retorna index.html para qualquer rota não encontrada na API (necessário para React Router)
app.setNotFoundHandler((req, reply) => {
  if (req.raw.url && (req.raw.url.startsWith('/api') || req.raw.url.startsWith('/uploads') || req.raw.url.startsWith('/docs'))) {
    return reply.status(404).send({ 
      message: 'Recurso não encontrado', 
      url: req.raw.url 
    })
  }
  return reply.sendFile('index.html', frontendDist)
})

// --- 7. INICIALIZAÇÃO ---
const port = Number(process.env.PORT) || 3333
const host = '0.0.0.0' // Obrigatório para o Render aceitar conexões externas

app.listen({ port, host }).then(() => {
  console.log(`🚀 Servidor rodando na porta ${port}`)
  console.log(`📚 Documentação disponível em http://localhost:${port}/docs`)
})