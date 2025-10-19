// backend/src/server.ts
import fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { authRoutes } from './routes/auth'
import { caseRoutes } from './routes/cases'
import { userRoutes } from './routes/users'
import { evolutionRoutes } from './routes/evolutions'
import { pafRoutes } from './routes/paf'
import { statsRoutes } from './routes/stats'
import { appointmentRoutes } from './routes/appointments'
import { reportRoutes } from './routes/reports' // Importa as novas rotas

const app = fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
    },
  },
})

// Configuração do CORS
app.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
})

// Configuração do JWT
app.register(jwt, {
  secret: process.env.JWT_SECRET as string,
})

// Decorator para proteger rotas
app.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify()
  } catch (err) {
    await reply.send(err)
  }
})

// Registo das Rotas
app.register(authRoutes)
app.register(caseRoutes)
app.register(userRoutes)
app.register(evolutionRoutes)
app.register(pafRoutes)
app.register(statsRoutes)
app.register(appointmentRoutes)
app.register(reportRoutes) // Regista as novas rotas de relatórios

// Iniciar o servidor
app
  .listen({
    port: 3333,
    host: '0.0.0.0', // Essencial para ambientes de produção/container
  })
  .then(() => {
    console.log('🚀 Servidor HTTP a rodar em http://localhost:3333')
  })