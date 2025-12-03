// backend/src/server.ts
import fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import fastifyStatic from '@fastify/static'
import multipart from '@fastify/multipart'
import path from 'path'
import fs from 'fs'

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
// [NOVO v3.2] Rota de Encaminhamentos
import { referralRoutes } from './routes/referrals' 

const app = fastify({
  logger: { transport: { target: 'pino-pretty' } },
})

// Configuração de diretório de upload (Aviso: Em produção use S3/Google Cloud)
const uploadDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } }) // Limite 5MB
app.register(cors, { origin: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] })
app.register(jwt, { secret: process.env.JWT_SECRET as string })

// Decorator para autenticação simplificada nas rotas
app.decorate('authenticate', async (request, reply) => {
  try { await request.jwtVerify() } catch (err) { await reply.send(err) }
})

// Servir arquivos estáticos (uploads e frontend build)
app.register(fastifyStatic, { root: uploadDir, prefix: '/uploads/', decorateReply: false })
app.register(fastifyStatic, { root: path.join(__dirname, '../../frontend/dist'), prefix: '/', constraints: {} })

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
app.register(referralRoutes) // [NOVO v3.2]

// Fallback para SPA (React Router)
app.setNotFoundHandler((req, reply) => {
  if (req.raw.url && (req.raw.url.startsWith('/api') || req.raw.url.startsWith('/uploads'))) {
    return reply.status(404).send({ message: 'Recurso não encontrado' })
  }
  return reply.sendFile('index.html')
})

app.listen({ port: 3333, host: '0.0.0.0' }).then(() => console.log('🚀 Servidor rodando na porta 3333!'))