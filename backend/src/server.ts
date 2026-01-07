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
import { referralRoutes } from './routes/referrals'
import { familyRoutes } from './routes/family'
import { deliverablesRoutes } from './routes/deliverables'
import { groupRoutes } from './routes/groups'
import { workspaceRoutes } from './routes/workspace'
// [NOVO] Importação da rota de Fila de Espera
import { waitingListRoutes } from './routes/waitingList'

const app = fastify({
  logger: { transport: { target: 'pino-pretty' } },
})

const uploadDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } })
app.register(cors, { origin: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] })
app.register(jwt, { secret: process.env.JWT_SECRET as string })

app.decorate('authenticate', async (request, reply) => {
  try { await request.jwtVerify() } catch (err) { await reply.send(err) }
})

app.register(fastifyStatic, { root: uploadDir, prefix: '/uploads/', decorateReply: false })
app.register(fastifyStatic, { root: path.join(__dirname, '../../frontend/dist'), prefix: '/', constraints: {} })

// Registro de Rotas
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
app.register(workspaceRoutes)   // Mesa de Trabalho
app.register(waitingListRoutes) // [NOVO] Fila de Espera e Distribuição

app.setNotFoundHandler((req, reply) => {
  if (req.raw.url && (req.raw.url.startsWith('/api') || req.raw.url.startsWith('/uploads'))) {
    return reply.status(404).send({ message: 'Recurso não encontrado' })
  }
  return reply.sendFile('index.html')
})

const port = Number(process.env.PORT) || 3333
app.listen({ port, host: '0.0.0.0' }).then(() => {
  console.log(`🚀 Servidor rodando na porta ${port} (v6.0.0)!`)
})