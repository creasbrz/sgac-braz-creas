// backend/src/routes/import.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { parse } from 'fast-csv'
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'
import { LogAction, Cargo, CaseStatus, CaseOrigin } from '@prisma/client'

export async function importRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()
  
  // Middleware: Apenas Gerentes
  server.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
      const { cargo } = request.user as { cargo: string }
      if (cargo !== Cargo.Gerente) {
        return reply.status(403).send({ message: 'Acesso restrito à Gerência.' })
      }
    } catch (err) {
      return reply.status(401).send({ message: 'Não autorizado.' })
    }
  })

  // [POST] Importação de CSV
  server.post('/import/cases', {
    schema: {
      tags: ['Importação'],
      summary: 'Importar casos em massa via CSV',
      consumes: ['multipart/form-data'],
      response: {
        200: z.object({
          message: z.string(),
          total: z.number(),
          success: z.number(),
          failed: z.number(),
          errors: z.array(z.string())
        })
      }
    }
  }, async (request, reply) => {
    const { sub: userId } = request.user as { sub: string }
    const data = await request.file()

    if (!data || data.mimetype !== 'text/csv') {
      return reply.status(400).send({ message: 'Por favor, envie um arquivo CSV válido.' })
    }

    // Diretório temporário
    const uploadDir = path.resolve(__dirname, '../../uploads')
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
    
    const tempFilePath = path.join(uploadDir, `import_${Date.now()}.csv`)
    await pipeline(data.file, fs.createWriteStream(tempFilePath))

    const results: any[] = []
    const errors: string[] = []
    let successCount = 0

    return new Promise((resolve, reject) => {
      fs.createReadStream(tempFilePath)
        .pipe(parse({ headers: true, ignoreEmpty: true, delimiter: ',' })) 
        .on('error', (error) => {
          console.error(error)
          fs.unlinkSync(tempFilePath)
          reject(reply.status(500).send({ message: 'Erro ao ler o arquivo CSV.' }))
        })
        .on('data', (row) => results.push(row))
        .on('end', async () => {
          // Limpeza do arquivo físico
          if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath)

          // Processamento em Transação
          await prisma.$transaction(async (tx) => {
            for (const [index, row] of results.entries()) {
              const rowNum = index + 2 // Ajuste para linha humana (Header + 1)
              
              // 1. Validação Mínima
              if (!row.Nome || !row.CPF) {
                errors.push(`Linha ${rowNum}: Nome ou CPF ausente.`)
                continue
              }

              // 2. Limpeza de CPF
              const cpfLimpo = row.CPF.replace(/\D/g, '')
              if (cpfLimpo.length !== 11) {
                errors.push(`Linha ${rowNum}: CPF inválido (${row.CPF}).`)
                continue
              }

              // 3. Verifica Duplicidade
              const exists = await tx.case.findUnique({ where: { cpf: cpfLimpo } })
              if (exists) {
                errors.push(`Linha ${rowNum}: CPF já cadastrado (${row.Nome}).`)
                continue
              }

              // 4. Tratamento de Arrays (Benefícios)
              let beneficiosArray: string[] = []
              if (row.Beneficios) {
                beneficiosArray = row.Beneficios.split(';').map((b: string) => b.trim()).filter(Boolean)
              }

              // 5. Inserção
              try {
                // Tenta converter data, fallback para hoje se falhar
                const dataNasc = new Date(row.Nascimento)
                const nascimento = isNaN(dataNasc.getTime()) ? new Date() : dataNasc

                await tx.case.create({
                  data: {
                    // Obrigatórios
                    nomeCompleto: row.Nome,
                    cpf: cpfLimpo,
                    nascimento,
                    sexo: row.Sexo || 'Não Informado',
                    telefone: row.Telefone || '',
                    endereco: row.Endereco || '',
                    urgencia: row.Urgencia || 'Sem risco imediato',
                    violacao: row.Violacao || 'Outros',
                    categoria: row.Categoria || 'Família em vulnerabilidade',
                    orgaoDemandante: row.Orgao || 'Demanda Espontânea',
                    origem: CaseOrigin.DOCUMENTAL, // Marca como importado
                    
                    // Opcionais
                    numeroSei: row.NumeroSEI || null,
                    linkSei: row.LinkSEI || null,
                    observacoes: row.Observacoes || `Importado via CSV em ${new Date().toLocaleDateString()}`,
                    beneficios: beneficiosArray,

                    // Sistema
                    pesoUrgencia: 1, 
                    status: CaseStatus.AGUARDANDO_ACOLHIDA, 
                    criadoPorId: userId,
                  }
                })
                successCount++
              } catch (err) {
                console.error(err)
                errors.push(`Linha ${rowNum}: Erro de banco de dados. Verifique o formato dos campos.`)
              }
            }
          })

          resolve(reply.send({
            message: 'Processamento concluído.',
            total: results.length,
            success: successCount,
            failed: errors.length,
            errors: errors.slice(0, 50) // Retorna os primeiros 50 erros
          }))
        })
    })
  })
}