// backend/src/server.ts
import fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import fastifyStatic from '@fastify/static' // [NOVO]
import path from 'path' // [NOVO]

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

const app = fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
    },
  },
})

// CORS (Em produção, você pode restringir a origem se tiver domínio)
app.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
})

app.register(jwt, {
  secret: process.env.JWT_SECRET as string,
})

// [NOVO] Configuração para servir o Frontend
// Ele busca a pasta 'dist' que está dentro de 'frontend' (voltando um nível ../)
app.register(fastifyStatic, {
  root: path.join(__dirname, '../../frontend/dist'),
  prefix: '/', // Serve na raiz
})

app.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify()
  } catch (err) {
    await reply.send(err)
  }
})

// Registo das Rotas da API
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

// [NOVO] Rota "Catch-all" para o React Router
// Se não for uma rota de API e não for arquivo estático, entrega o index.html
// Isso permite que o refresh da página funcione em rotas como /dashboard/cases
app.setNotFoundHandler((req, reply) => {
  if (req.raw.url && req.raw.url.startsWith('/api')) {
    return reply.status(404).send({ message: 'Rota não encontrada' })
  }
  return reply.sendFile('index.html')
})

app
  .listen({
    port: 3333,
    host: '0.0.0.0',
  })
  .then(() => {
    console.log('🚀 Servidor Fullstack rodando em http://localhost:3333')
  })