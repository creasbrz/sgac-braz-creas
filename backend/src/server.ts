// backend/src/server.ts
import fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import fastifyStatic from '@fastify/static'
import multipart from '@fastify/multipart'
import path from 'path'
import fs from 'fs'
import { ZodError } from 'zod'

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
import { deliverableRoutes } from './routes/deliverables'
import { groupRoutes } from './routes/groups'

const app = fastify({
  logger: { 
    transport: { 
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    } 
  },
})

// Configuração de Pastas
const uploadDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

// Plugins Globais
app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } })

// --- CORREÇÃO DO CORS AQUI ---
// Adicionamos explicitamente 'PATCH' e 'OPTIONS'
app.register(cors, { 
  origin: true, // Permite todas as origens (em prod, mude para o domínio do front)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}) 

app.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret-key' })

// Decorator de Autenticação
app.decorate('authenticate', async (request: any, reply: any) => {
  try { await request.jwtVerify() } catch (err) { await reply.send(err) }
})

// Arquivos Estáticos
app.register(fastifyStatic, { 
  root: uploadDir, 
  prefix: '/uploads/', 
  decorateReply: false 
})

// Serve o Frontend (SPA)
const distPath = path.join(__dirname, '../../frontend/dist')
if (fs.existsSync(distPath)) {
  app.register(fastifyStatic, { 
    root: distPath, 
    prefix: '/', 
    constraints: {} 
  })
}

// Registro das Rotas
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
app.register(deliverableRoutes)
app.register(groupRoutes)

// Global Error Handler
app.setErrorHandler((error, _, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({ 
      message: 'Erro de validação.', 
      errors: error.flatten().fieldErrors 
    })
  }

  if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
      return reply.status(401).send({ message: 'Token não fornecido.' })
  }

  console.error(error)
  return reply.status(500).send({ message: 'Erro interno no servidor.' })
})

// Handler para SPA
app.setNotFoundHandler((req, reply) => {
  if (req.raw.url && (req.raw.url.startsWith('/api') || req.raw.url.startsWith('/uploads'))) {
    return reply.status(404).send({ message: 'Recurso não encontrado' })
  }
  if (fs.existsSync(path.join(distPath, 'index.html'))) {
     return reply.sendFile('index.html', distPath)
  }
  return reply.status(404).send({ message: 'Rota não encontrada' })
})

const port = process.env.PORT ? Number(process.env.PORT) : 3333

app.listen({ port, host: '0.0.0.0' }).then((address) => {
  console.log(`🚀 Servidor rodando em ${address}`)
})