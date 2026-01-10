// backend/src/routes/paf.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { LogAction, Cargo } from '@prisma/client'

// --- FUNÇÕES AUXILIARES ---

// Garante UTC meio-dia para evitar shifts de fuso horário
const stripTime = (date: Date | string): Date => {
  const d = new Date(date)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0))
}

// --- SCHEMAS (Reutilizáveis) ---

const pafBodySchema = z.object({
  diagnostico: z.string().min(10, "O diagnóstico deve conter ao menos 10 caracteres."),
  objetivos: z.string().min(10, "Os objetivos devem conter ao menos 10 caracteres."),
  estrategias: z.string().min(10, "As estratégias devem conter ao menos 10 caracteres."),
  deadline: z.coerce.date({ required_error: "O prazo é obrigatório." }),
})

const pafResponseSchema = z.object({
  id: z.string().uuid(),
  diagnostico: z.string(),
  objetivos: z.string(),
  estrategias: z.string(),
  deadline: z.date(),
  versaoAtual: z.number(),
  updatedAt: z.date(),
  autor: z.object({
    id: z.string(),
    nome: z.string()
  }).optional()
})

const versionResponseSchema = z.object({
  id: z.string().uuid(),
  savedAt: z.date(),
  versaoNumero: z.number(),
  autor: z.object({ nome: z.string() }).optional()
  // Adicione outros campos se quiser exibir o conteúdo histórico na lista
})

// --- ROTAS ---

export async function pafRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  // 1. [GET] Buscar PAF Atual do Caso
  server.get('/cases/:caseId/paf', {
    schema: {
      tags: ['PAF'],
      summary: 'Obter o Plano de Acompanhamento Familiar atual',
      params: z.object({ caseId: z.string().uuid() }),
      response: {
        200: pafResponseSchema.nullable()
      }
    }
  }, async (request, reply) => {
    const { caseId } = request.params
    
    const paf = await prisma.paf.findUnique({
      where: { casoId: caseId },
      include: { autor: { select: { id: true, nome: true } } },
    })
    
    // Retorna null (200 OK) se não tiver PAF ainda, o front trata isso
    return reply.send(paf)
  })

  // 2. [GET] Histórico de Versões
  server.get('/cases/:caseId/paf/history', {
    schema: {
      tags: ['PAF'],
      summary: 'Listar versões anteriores do PAF',
      params: z.object({ caseId: z.string().uuid() }),
      response: {
        200: z.array(versionResponseSchema)
      }
    }
  }, async (request, reply) => {
    const { caseId } = request.params
    
    const paf = await prisma.paf.findUnique({ where: { casoId: caseId } })
    if (!paf) return reply.send([])

    const history = await prisma.pafVersion.findMany({
      where: { pafId: paf.id },
      orderBy: { savedAt: 'desc' },
      include: { autor: { select: { nome: true } } },
    })

    return reply.send(history)
  })

  // 3. [POST] Criar PAF (Primeira versão)
  server.post('/cases/:caseId/paf', {
    schema: {
      tags: ['PAF'],
      summary: 'Criar o primeiro PAF do caso',
      params: z.object({ caseId: z.string().uuid() }),
      body: pafBodySchema,
      response: {
        201: pafResponseSchema
      }
    }
  }, async (request, reply) => {
    const { caseId } = request.params
    const data = request.body
    const { sub: autorId, cargo } = request.user as { sub: string; cargo: string }

    // Validação de Permissão
    if (cargo !== Cargo.Especialista && cargo !== Cargo.Gerente) {
      return reply.status(403).send({ message: 'Apenas especialistas ou gerentes podem criar PAF.' })
    }

    // Verifica duplicidade
    const existing = await prisma.paf.findUnique({ where: { casoId } })
    if (existing) {
      return reply.status(409).send({ message: 'Já existe um PAF para este caso. Use a rota de atualização (PUT).' })
    }

    const created = await prisma.paf.create({
      data: {
        ...data,
        deadline: stripTime(data.deadline),
        casoId,
        autorId,
        versaoAtual: 1,
      },
      include: { autor: { select: { id: true, nome: true } } }
    })

    // Log Assíncrono
    prisma.caseLog.create({
      data: {
        casoId, 
        autorId,
        acao: LogAction.PAF_CRIADO,
        descricao: 'Elaborou o Plano de Acompanhamento Familiar (PAF).',
      },
    }).catch(console.error)

    return reply.status(201).send(created)
  })

  // 4. [PUT] Atualizar PAF (Gera Versão + Transaction)
  server.put('/cases/:caseId/paf', {
    schema: {
      tags: ['PAF'],
      summary: 'Atualizar PAF (Gera nova versão automaticamente)',
      params: z.object({ caseId: z.string().uuid() }),
      body: pafBodySchema.partial(), // Permite update parcial
      response: {
        200: pafResponseSchema
      }
    }
  }, async (request, reply) => {
    const { caseId } = request.params
    const bodyData = request.body
    const { sub: userId, cargo } = request.user as { sub: string, cargo: string }

    const existing = await prisma.paf.findUnique({ where: { casoId: caseId } })
    if (!existing) return reply.status(404).send({ message: 'PAF não encontrado.' })

    // Validação de Permissão (Gerente pode tudo, Autor pode editar o seu)
    // Nota: Em muitos CREAS, qualquer Especialista pode editar PAF de outro se assumir o caso. 
    // Ajustei para permitir se for Gerente OU Especialista (assumindo responsabilidade)
    if (cargo !== Cargo.Gerente && cargo !== Cargo.Especialista) {
      return reply.status(403).send({ message: 'Sem permissão para editar este PAF.' })
    }

    // TRANSACTION: Garante que só atualiza o PAF se salvar a versão com sucesso
    const result = await prisma.$transaction(async (tx) => {
      // 1. Salvar versão antiga
      await tx.pafVersion.create({
        data: {
          pafId: existing.id,
          diagnostico: existing.diagnostico,
          objetivos: existing.objetivos,
          estrategias: existing.estrategias,
          deadline: existing.deadline,
          autorId: existing.autorId, // Autor da versão antiga
          versaoNumero: existing.versaoAtual,
          savedAt: new Date()
        },
      })

      // 2. Atualizar registro atual
      const nextVersion = existing.versaoAtual + 1
      
      const updated = await tx.paf.update({
        where: { casoId: caseId },
        data: {
          ...bodyData,
          deadline: bodyData.deadline ? stripTime(bodyData.deadline) : undefined,
          autorId: userId, // Novo autor da versão atual
          versaoAtual: nextVersion,
        },
        include: { autor: { select: { id: true, nome: true } } }
      })

      return updated
    })

    // 3. Auditoria (Fora da transaction para não bloquear o banco com logs)
    prisma.caseLog.create({
      data: {
        casoId,
        autorId: userId,
        acao: LogAction.PAF_ATUALIZADO,
        descricao: `Atualizou PAF para versão ${result.versaoAtual}.`,
      },
    }).catch(console.error)

    return reply.send(result)
  })
}