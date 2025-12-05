// backend/src/routes/evolutions.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { LogAction, Cargo, CaseStatus } from '@prisma/client'

export async function evolutionRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify() } 
    catch (err) { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  // [GET] Listar Evoluções (Paginado + Lógica de Acesso SUAS)
  app.get('/cases/:caseId/evolutions', async (request, reply) => {
    const paramsSchema = z.object({ 
      caseId: z.string().uuid() 
    })
    
    const querySchema = z.object({
      page: z.coerce.number().min(1).default(1),
      pageSize: z.coerce.number().min(1).max(50).default(10)
    })

    const { caseId } = paramsSchema.parse(request.params)
    const { page, pageSize } = querySchema.parse(request.query)
    const { sub: userId, cargo } = request.user as { sub: string, cargo: string }

    // 1. Verificar permissão de acesso ao caso atual
    const caso = await prisma.case.findUnique({
      where: { id: caseId },
      select: { 
        agenteAcolhidaId: true, 
        especialistaPAEFIId: true,
        status: true
      }
    })

    if (!caso) return reply.status(404).send({ message: 'Caso não encontrado.' })

    // 2. Determinar se o usuário tem "Privilégio de Sigilo" neste caso
    // Regra SUAS: Gerente VÊ TUDO. Técnico VÊ se for o Autor OU se for o Responsável Atual pelo caso.
    const isGerente = cargo === Cargo.Gerente
    const isResponsavelAtual = 
      caso.agenteAcolhidaId === userId || 
      caso.especialistaPAEFIId === userId

    const canViewSigilo = isGerente || isResponsavelAtual

    // 3. Query Otimizada (Filtro direto no Banco)
    const whereCondition: any = {
      casoId: caseId,
    }

    // Se NÃO pode ver sigilo, filtramos no banco para não trazer registros sigilosos de terceiros
    if (!canViewSigilo) {
      whereCondition.OR = [
        { sigilo: false },           // Pode ver qualquer pública
        { autorId: userId }          // Pode ver as suas próprias (mesmo sigilosas)
      ]
    }

    const [evolucoes, total] = await Promise.all([
      prisma.evolucao.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
        include: {
          autor: { 
            select: { id: true, nome: true, cargo: true } 
          }
        }
      }),
      prisma.evolucao.count({ where: whereCondition })
    ])

    return reply.send({
      items: evolucoes,
      total,
      page,
      totalPages: Math.ceil(total / pageSize)
    })
  })

  // [POST] Criar Nova Evolução (Mantido similar, apenas reforçando validação)
  app.post('/cases/:caseId/evolutions', async (request, reply) => {
    const { caseId } = z.object({ caseId: z.string().uuid() }).parse(request.params)
    
    const bodySchema = z.object({
      conteudo: z.string().min(5, "A evolução deve ter conteúdo relevante."),
      sigilo: z.boolean().optional().default(false)
    })

    const { conteudo, sigilo } = bodySchema.parse(request.body)
    const { sub: userId } = request.user as { sub: string }

    const evolucao = await prisma.evolucao.create({
      data: {
        conteudo,
        sigilo,
        casoId: caseId,
        autorId: userId
      },
      include: { autor: { select: { id: true, nome: true, cargo: true } } } // Retorno otimizado
    })

    // Log de Auditoria
    await prisma.caseLog.create({
      data: {
        casoId: caseId,
        autorId: userId,
        acao: LogAction.EVOLUCAO_CRIADA,
        descricao: sigilo 
          ? 'Registrou uma evolução técnica (SIGILOSA).' 
          : 'Registrou uma evolução técnica pública.'
      }
    })

    return reply.status(201).send(evolucao)
  })
}