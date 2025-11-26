// backend/src/server.ts
import fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import fastifyStatic from '@fastify/static'
import multipart from '@fastify/multipart'
import path from 'path'
import fs from 'fs'

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
import { attachmentRoutes } from './routes/attachments' // [NOVO]

const app = fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
    },
  },
})

// 1. Garante que a pasta de uploads existe na raiz
const uploadDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// 2. Registrar Multipart (Uploads)
app.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024, // Limite de 5MB por arquivo
  }
})

app.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
})

app.register(jwt, {
  secret: process.env.JWT_SECRET as string,
})

app.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify()
  } catch (err) {
    await reply.send(err)
  }
})

// 3. Servir Arquivos de Upload (Rota: /uploads/arquivo.pdf)
// Importante: decorateReply: false evita conflito com o static do frontend
app.register(fastifyStatic, {
  root: uploadDir,
  prefix: '/uploads/',
  decorateReply: false 
})

// 4. Servir o Frontend (Produção)
app.register(fastifyStatic, {
  root: path.join(__dirname, '../../frontend/dist'),
  prefix: '/',
  constraints: {}
})

// 5. Registro das Rotas da API
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
app.register(attachmentRoutes) // [NOVO]

// Rota Catch-all para o React Router (Single Page Application)
app.setNotFoundHandler((req, reply) => {
  // Se for API ou Upload, retorna 404 JSON
  if (req.raw.url && (req.raw.url.startsWith('/api') || req.raw.url.startsWith('/uploads'))) {
    return reply.status(404).send({ message: 'Recurso não encontrado' })
  }
  // Se for navegação, entrega o index.html do React
  return reply.sendFile('index.html')
})

app
  .listen({
    port: 3333,
    host: '0.0.0.0',
  })
  .then(() => {
    console.log('🚀 Servidor Fullstack rodando em http://localhost:3333')
    console.log(`📂 Pasta de uploads: ${uploadDir}`)
  })