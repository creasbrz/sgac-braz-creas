import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { CaseStatus, Cargo, CaseOrigin } from '@prisma/client'
import ExcelJS from 'exceljs'
import { parse, isValid } from 'date-fns'

// --- HELPERS DE LIMPEZA E PARSE ---

const cleanDigits = (val: any) => String(val || '').replace(/\D/g, '')

const parseExcelDate = (value: any): Date | null => {
  if (!value) return null
  // ExcelJS já retorna objetos Date nativos para células de data
  if (value instanceof Date) return value
  
  // Se for texto
  if (typeof value === 'string') {
    const parsed = parse(value.trim(), 'dd/MM/yyyy', new Date())
    if (isValid(parsed)) return parsed
    
    // Tenta ISO
    const parsedIso = new Date(value)
    if (isValid(parsedIso)) return parsedIso
  }
  
  // Se for objeto de fórmula/link do ExcelJS, tenta pegar o resultado
  if (typeof value === 'object' && value !== null) {
      if ('result' in value && value.result instanceof Date) return value.result;
  }

  return null
}

const parseArrayField = (value: any): string[] => {
  if (!value) return []
  return String(value)
    .split(/[;,]/) // Aceita ; ou , como separador
    .map(v => v.trim())
    .filter(v => v.length > 0)
}

// Normaliza chaves (ex: "Nome Completo" -> "nomecompleto")
const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '')

export async function importRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
      const { cargo } = request.user as { cargo: string }
      if (cargo !== Cargo.Gerente) return reply.status(403).send({ message: 'Acesso restrito à Gerência.' })
    } catch {
      return reply.status(401).send({ message: 'Não autorizado.' })
    }
  })

  server.post('/import/cases', {
    schema: {
      tags: ['Importação'],
      summary: 'Importar planilha completa de casos (Excel/CSV)',
      response: {
        200: z.object({
          processed: z.number(),
          created: z.number(),
          errors: z.number(),
          logs: z.array(z.string())
        })
      }
    }
  }, async (request, reply) => {
    const data = await request.file()
    if (!data) return reply.status(400).send({ processed: 0, created: 0, errors: 0, logs: ['Arquivo não enviado.'] })

    try {
      const workbook = new ExcelJS.Workbook()
      
      // Detecção e Carregamento (Stream para CSV, Buffer para XLSX)
      if (data.mimetype.includes('csv') || data.filename.toLowerCase().endsWith('.csv')) {
        await workbook.csv.read(data.file)
      } else {
        const buffer = await data.toBuffer()
        await workbook.xlsx.load(buffer)
      }

      const worksheet = workbook.worksheets[0]
      if (!worksheet) {
        return reply.status(400).send({ processed: 0, created: 0, errors: 1, logs: ['Planilha vazia ou formato inválido.'] })
      }

      let createdCount = 0
      let errorCount = 0
      const logs: string[] = []
      
      // Mapeamento de Cabeçalhos (Linha 1)
      // O ExcelJS usa índices baseados em 1
      const headerMap: Record<string, number> = {}
      const headerRow = worksheet.getRow(1)
      
      headerRow.eachCell((cell, colNumber) => {
        if (cell.value) {
            headerMap[normalizeKey(String(cell.value))] = colNumber
        }
      })

      // Função auxiliar para pegar valor da célula pelo nome da coluna normalizado
      const getValue = (row: ExcelJS.Row, ...keys: string[]) => {
          for (const key of keys) {
              const colIndex = headerMap[normalizeKey(key)]
              if (colIndex) {
                  const val = row.getCell(colIndex).value
                  // Se for link/fórmula, tenta extrair o texto/result
                  if (val && typeof val === 'object') {
                      if ('text' in val) return (val as any).text;
                      if ('result' in val) return (val as any).result;
                  }
                  return val
              }
          }
          return undefined
      }

      // Processamento das Linhas (Começando da 2)
      // Usando loop for tradicional para permitir await sequencial
      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i)
        if (!row.hasValues) continue

        const rowNum = i
        
        try {
            // 1. Campos Obrigatórios
            const nome = getValue(row, 'nome', 'nomecompleto', 'usuario')
            const cpfRaw = getValue(row, 'cpf')

            if (!nome) {
                // Linha vazia ou sem nome, pula silenciosamente ou loga se tiver outros dados
                continue 
            }

            // 2. Validação e Limpeza CPF
            const cpf = cpfRaw ? cleanDigits(cpfRaw) : null
            if (cpf && cpf.length !== 11) {
                logs.push(`Linha ${rowNum}: CPF inválido (${cpfRaw}). Ignorada.`)
                errorCount++
                continue
            }

            // 3. Verifica Duplicidade
            if (cpf) {
                const existing = await prisma.case.findUnique({ where: { cpf: String(cpf) } })
                if (existing) {
                    logs.push(`Linha ${rowNum}: CPF ${cpf} já existe. Ignorada.`)
                    errorCount++
                    continue
                }
            }

            // 4. Extração e Tratamento dos Dados
            const nascimento = parseExcelDate(getValue(row, 'nascimento', 'datanascimento')) || new Date('1900-01-01')
            const dataEntrada = parseExcelDate(getValue(row, 'dataentrada', 'dataatendimento')) || new Date()
            
            const violacoes = parseArrayField(getValue(row, 'violacao', 'violacoes', 'tipoviolacao'))
            const beneficios = parseArrayField(getValue(row, 'beneficios', 'beneficio', 'transferenciarenda'))
            
            const endereco_logradouro = String(getValue(row, 'endereco', 'logradouro', 'rua') || '')
            const endereco_ra = String(getValue(row, 'ra', 'regiao') || 'Não Informada')
            const endereco_cep = cleanDigits(getValue(row, 'cep'))

            const contatos = []
            const tel1 = getValue(row, 'telefone', 'celular', 'contato')
            if (tel1) contatos.push({ tipo: "Principal", numero: String(tel1) })
            const tel2 = getValue(row, 'telefone2', 'recado')
            if (tel2) contatos.push({ tipo: "Recado", numero: String(tel2) })

            // Classificação de Urgência
            const urgenciaTexto = String(getValue(row, 'urgencia', 'risco') || 'Sem risco imediato')
            let pesoUrgencia = Number(getValue(row, 'pesourgencia', 'peso'))
            if (!pesoUrgencia || isNaN(pesoUrgencia)) {
                const uLower = urgenciaTexto.toLowerCase()
                if (uLower.includes('morte') || uLower.includes('agressor') || uLower.includes('sexual')) pesoUrgencia = 4
                else if (uLower.includes('ameaça') || uLower.includes('reincidência') || uLower.includes('física')) pesoUrgencia = 3
                else if (uLower.includes('acolhimento') || uLower.includes('rua') || uLower.includes('idoso')) pesoUrgencia = 2
                else pesoUrgencia = 1
            }

            // Criação no Banco
            await prisma.case.create({
                data: {
                    nomeCompleto: String(nome),
                    nomeSocial: getValue(row, 'nomesocial') ? String(getValue(row, 'nomesocial')) : null,
                    cpf: cpf ? String(cpf) : undefined, // undefined deixa o prisma gerar null se o campo for nullable ou falhar se for required (verifique seu schema)
                    nascimento,
                    sexo: String(getValue(row, 'sexo') || 'Não Informado'),
                    nis: cleanDigits(getValue(row, 'nis')) || null,
                    
                    contatos: contatos,
                    endereco_logradouro,
                    endereco_ra,
                    endereco_cidade: 'Brasília', // Padrão
                    endereco_uf: 'DF',          // Padrão
                    endereco_cep: endereco_cep || null,
                    
                    // Geo
                    latitude: getValue(row, 'lat', 'latitude') ? Number(getValue(row, 'lat', 'latitude')) : null,
                    longitude: getValue(row, 'lng', 'long', 'longitude') ? Number(getValue(row, 'lng', 'long', 'longitude')) : null,

                    urgencia: urgenciaTexto,
                    pesoUrgencia,
                    violacao: violacoes.length > 0 ? violacoes : ['Não classificado'],
                    categoria: String(getValue(row, 'categoria') || 'Família'),
                    
                    orgaoDemandante: String(getValue(row, 'orgaodemandante', 'origem') || 'Demanda Espontânea'),
                    origem: CaseOrigin.DOCUMENTAL,
                    numeroSei: getValue(row, 'sei', 'numerosei') ? String(getValue(row, 'sei', 'numerosei')) : null,
                    beneficios,
                    
                    dataEntrada,
                    status: CaseStatus.AGUARDANDO_DISTRIBUICAO,
                    criadoPorId: request.user.sub
                }
            })
            
            createdCount++

        } catch (err: any) {
            console.error(`Erro na linha ${rowNum}:`, err)
            logs.push(`Linha ${rowNum}: Erro ao salvar - ${err.message}`)
            errorCount++
        }
      }

      return reply.send({
        processed: worksheet.rowCount - 1, // Desconta header
        created: createdCount,
        errors: errorCount,
        logs: logs.slice(0, 100)
      })

    } catch (error) {
      console.error(error)
      return reply.status(500).send({ processed: 0, created: 0, errors: 0, logs: ['Erro crítico ao processar o arquivo.'] })
    }
  })
}