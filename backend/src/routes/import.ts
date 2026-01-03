// backend/src/routes/import.ts
import { type FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { parse } from 'fast-csv'
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'
import { Cargo } from '@prisma/client'

// Helper para converter data DD/MM/AAAA ou AAAA-MM-DD para Date
const parseDate = (dateStr: string): Date => {
  if (!dateStr) return new Date(); // Fallback hoje
  
  // Tenta formato brasileiro DD/MM/AAAA
  if (dateStr.includes('/')) {
    const [d, m, y] = dateStr.split('/');
    return new Date(`${y}-${m}-${d}`);
  }
  
  // Tenta formato ISO AAAA-MM-DD
  return new Date(dateStr);
}

export async function importRoutes(app: FastifyInstance) {
  
  // Middleware de segurança: Apenas Gerentes
  app.addHook('onRequest', async (request, reply) => {
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

  // [POST] /import/cases - Importação de CSV Completa
  app.post('/import/cases', async (request, reply) => {
    const { sub: userId } = request.user as { sub: string }
    const data = await request.file()

    if (!data || data.mimetype !== 'text/csv') {
      // Consome o stream para não travar
      if (data) await data.toBuffer();
      return reply.status(400).send({ message: 'Por favor, envie um ficheiro CSV válido.' })
    }

    // Salva temporariamente
    const uploadDir = path.resolve(process.cwd(), 'uploads')
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
    
    const tempFilePath = path.join(uploadDir, `import_${Date.now()}.csv`)
    await pipeline(data.file, fs.createWriteStream(tempFilePath))

    const results: any[] = []
    const errors: string[] = []
    let successCount = 0

    // Processamento do CSV
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(tempFilePath)
        .pipe(parse({ headers: true, ignoreEmpty: true, delimiter: ',' })) 
        
      stream.on('error', (error) => {
          console.error("Erro na leitura do CSV:", error)
          if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath)
          reject(reply.status(500).send({ message: 'Erro ao ler o ficheiro CSV.' }))
        })
        .on('data', (row) => results.push(row))
        .on('end', async () => {
          
          try {
            // Processa linha a linha dentro de uma transação gigante ou em blocos
            // Aqui faremos em bloco único por simplicidade, mas em produção com >10k linhas, ideal é chunk
            
            await prisma.$transaction(async (tx) => {
              for (const [index, row] of results.entries()) {
                const rowNum = index + 2 // +1 header, +1 index zero
                
                // 1. Validação Básica
                if (!row.Nome || !row.CPF) {
                  errors.push(`Linha ${rowNum}: Nome ou CPF em falta.`)
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

                // 4. Tratamento de Benefícios
                let beneficiosArray: string[] = []
                if (row.Beneficios) {
                  beneficiosArray = row.Beneficios.split(';').map((b: string) => b.trim()).filter((b: string) => b !== '')
                }

                // 5. Inserção
                try {
                  const dataNascimento = parseDate(row.Nascimento);
                  
                  if (isNaN(dataNascimento.getTime())) {
                     throw new Error("Data inválida");
                  }

                  await tx.case.create({
                    data: {
                      // Obrigatórios
                      nomeCompleto: row.Nome,
                      cpf: cpfLimpo,
                      nascimento: dataNascimento,
                      sexo: row.Sexo || 'Não Informado',
                      telefone: row.Telefone || '',
                      endereco: row.Endereco || '',
                      urgencia: row.Urgencia || 'Sem risco imediato',
                      violacao: row.Violacao || 'Outros',
                      categoria: row.Categoria || 'Família em vulnerabilidade',
                      orgaoDemandante: row.Orgao || 'Demanda Espontânea',
                      
                      // Opcionais
                      numeroSei: row.NumeroSEI || null,
                      linkSei: row.LinkSEI || null,
                      observacoes: row.Observacoes || `Importado via CSV em ${new Date().toLocaleDateString()}`,
                      beneficios: beneficiosArray,

                      // Sistema
                      pesoUrgencia: 1, 
                      status: 'AGUARDANDO_ACOLHIDA', 
                      criadoPorId: userId,
                    }
                  })
                  successCount++
                } catch (err) {
                  console.error(`Erro Linha ${rowNum}:`, err)
                  errors.push(`Linha ${rowNum}: Erro ao salvar. Verifique a data de nascimento.`)
                }
              }
            }, { 
              timeout: 20000 // Aumenta timeout para importações grandes
            })

            resolve(reply.send({
              message: 'Processamento concluído.',
              total: results.length,
              success: successCount,
              failed: errors.length,
              errors: errors.slice(0, 50) // Limita retorno de erros para não explodir payload
            }))

          } catch (txError) {
             console.error("Erro fatal na transação de importação:", txError)
             reject(reply.status(500).send({ message: "Erro fatal no banco de dados durante importação." }))
          } finally {
            // Limpeza Garantida
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath)
          }
        })
    })
  })
}