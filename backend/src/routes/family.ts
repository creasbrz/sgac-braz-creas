// backend/src/routes/family.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { LogAction } from '@prisma/client'
import { differenceInYears } from 'date-fns'

const calculateAge = (birthDate: Date): number | undefined => {
  if (!birthDate || isNaN(birthDate.getTime())) return undefined;
  return differenceInYears(new Date(), birthDate)
}

const emptyToNull = (val: unknown) => {
  if (typeof val === 'string' && val.trim() === '') return null;
  return val;
}

export async function familyRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  // 1. ADICIONAR MEMBRO
  app.post('/cases/:caseId/family', async (req, reply) => {
    const paramsSchema = z.object({ caseId: z.string().uuid() })
    
    const bodySchema = z.object({
      nome: z.string().min(2, "Nome muito curto"),
      parentesco: z.string().min(2, "Informe o parentesco"),
      idade: z.preprocess(emptyToNull, z.coerce.number().int().nonnegative().optional().nullable()),
      cpf: z.preprocess(emptyToNull, z.string().optional().nullable()),
      nascimento: z.preprocess(emptyToNull, z.coerce.date().optional().nullable()),
      telefone: z.preprocess(emptyToNull, z.string().optional().nullable()),
      ocupacao: z.preprocess(emptyToNull, z.string().optional().nullable()),
      renda: z.preprocess((val) => (val === '' ? 0 : val), z.coerce.number().nonnegative().optional().default(0)),
      observacoes: z.preprocess(emptyToNull, z.string().optional().nullable())
    })

    try {
      const { caseId } = paramsSchema.parse(req.params)
      const data = bodySchema.parse(req.body)
      const userId = (req.user as any).sub

      const caso = await prisma.case.findUnique({ where: { id: caseId } })
      if (!caso) return reply.status(404).send({ message: 'Caso não encontrado.' })

      const cpfLimpo = data.cpf ? data.cpf.replace(/\D/g, '') : null
      const telefoneLimpo = data.telefone ? data.telefone.replace(/\D/g, '') : null
      
      let idadeFinal = data.idade;
      if (data.nascimento) {
        const idadeCalculada = calculateAge(data.nascimento);
        if (idadeCalculada !== undefined) idadeFinal = idadeCalculada;
      }
      const idadeParaSalvar = (idadeFinal === null) ? undefined : idadeFinal;

      const member = await prisma.membroFamilia.create({
        data: {
          casoId: caseId, // CORREÇÃO CONFIRMADA
          nome: data.nome,
          parentesco: data.parentesco,
          idade: idadeParaSalvar,
          nascimento: data.nascimento,
          cpf: cpfLimpo,
          telefone: telefoneLimpo,
          ocupacao: data.ocupacao,
          renda: data.renda,
          observacoes: data.observacoes
        }
      })

      await prisma.caseLog.create({
        data: {
          casoId: caseId,
          autorId: userId,
          acao: LogAction.MEMBRO_FAMILIA_ADICIONADO,
          descricao: `Adicionou familiar: ${data.nome} (${data.parentesco})`
        }
      })

      const safeMember = {
        ...member,
        renda: member.renda ? Number(member.renda) : 0
      }

      return reply.status(201).send(safeMember)

    } catch (error) {
      console.error("Erro POST Family:", error)
      if (error instanceof z.ZodError) return reply.status(400).send({ message: 'Dados inválidos', errors: error.flatten().fieldErrors })
      return reply.status(500).send({ message: 'Erro ao adicionar familiar.' })
    }
  })

  // 2. LISTAR (CORRIGIDO)
  app.get('/cases/:caseId/family', async (req, reply) => {
    try {
      const { caseId } = z.object({ caseId: z.string().uuid() }).parse(req.params)
      
      const members = await prisma.membroFamilia.findMany({
        // CORREÇÃO AQUI: Mapeando explicitamente a variável
        where: { casoId: caseId }, 
        orderBy: [{ renda: 'desc' }, { idade: 'desc' }]
      })

      const safeMembers = members.map(m => ({
        ...m,
        renda: m.renda ? Number(m.renda) : 0
      }))

      return reply.send(safeMembers)

    } catch (error) {
      console.error("Erro GET Family:", error)
      return reply.status(500).send({ message: 'Erro ao listar família.' })
    }
  })

  // 3. EDITAR
  app.put('/family/:id', async (req, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() })
    const bodySchema = z.object({
        nome: z.string().min(2),
        parentesco: z.string(),
        nascimento: z.preprocess(emptyToNull, z.coerce.date().optional().nullable()),
        idade: z.preprocess(emptyToNull, z.coerce.number().optional().nullable()),
        ocupacao: z.preprocess(emptyToNull, z.string().optional().nullable()),
        renda: z.preprocess((val) => (val === '' ? 0 : val), z.coerce.number().nonnegative().optional()),
        cpf: z.preprocess(emptyToNull, z.string().optional().nullable()),
        telefone: z.preprocess(emptyToNull, z.string().optional().nullable()),
        observacoes: z.preprocess(emptyToNull, z.string().optional().nullable())
    })

    try {
        const { id } = paramsSchema.parse(req.params)
        const data = bodySchema.parse(req.body)
        
        let idadeFinal = data.idade;
        if (data.nascimento) {
            const calc = calculateAge(data.nascimento);
            if (calc !== undefined) idadeFinal = calc;
        }
        const idadeParaSalvar = (idadeFinal === null) ? null : idadeFinal;

        const updated = await prisma.membroFamilia.update({
            where: { id },
            data: {
                nome: data.nome,
                parentesco: data.parentesco,
                nascimento: data.nascimento,
                idade: idadeParaSalvar,
                ocupacao: data.ocupacao,
                renda: data.renda,
                observacoes: data.observacoes,
                cpf: data.cpf ? data.cpf.replace(/\D/g, '') : null,
                telefone: data.telefone ? data.telefone.replace(/\D/g, '') : null
            }
        })

        const safeUpdated = {
            ...updated,
            renda: updated.renda ? Number(updated.renda) : 0
        }

        return reply.send(safeUpdated)
    } catch (error) {
        console.error("Erro PUT Family:", error)
        return reply.status(500).send({ message: 'Erro ao atualizar membro.' })
    }
  })

  // 4. REMOVER
  app.delete('/family/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const userId = (req.user as any).sub
    
    try {
      const member = await prisma.membroFamilia.findUnique({ where: { id } })
      if (!member) return reply.status(404).send({ message: 'Membro não encontrado.' })

      await prisma.membroFamilia.delete({ where: { id } })

      await prisma.caseLog.create({
        data: {
          casoId: member.casoId,
          autorId: userId,
          acao: LogAction.OUTRO,
          descricao: `Removeu familiar: ${member.nome}`
        }
      })
      
      return reply.status(204).send()
    } catch (error) {
      console.error("Erro DELETE Family:", error)
      return reply.status(500).send({ message: 'Erro ao remover familiar.' })
    }
  })
}