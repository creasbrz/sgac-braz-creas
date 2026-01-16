// backend/src/services/ImportService.ts
import { prisma } from '../lib/prisma'
import { CaseStatus, CaseOrigin } from '@prisma/client'
import ExcelJS from 'exceljs'
import { parse, isValid } from 'date-fns'
import { Buffer } from 'node:buffer'

interface ImportResult {
  processed: number
  created: number
  errors: number
  logs: string[]
}

export class ImportService {

  // --- HELPERS PRIVADOS DE PARSING ---

  private static cleanDigits(val: any) {
    return String(val || '').replace(/\D/g, '')
  }

  private static normalizeKey(key: string) {
    return key.toLowerCase().replace(/[^a-z0-9]/g, '')
  }

  private static parseExcelDate(value: any): Date | null {
    if (!value) return null
    if (value instanceof Date) return value
    
    // Texto DD/MM/AAAA
    if (typeof value === 'string') {
      const parsed = parse(value.trim(), 'dd/MM/yyyy', new Date())
      if (isValid(parsed)) return parsed
      
      const parsedIso = new Date(value)
      if (isValid(parsedIso)) return parsedIso
    }
    
    // Fórmula/Hyperlink
    if (typeof value === 'object' && value !== null) {
        if ('result' in value && value.result instanceof Date) return value.result;
    }
    return null
  }

  private static parseArrayField(value: any): string[] {
    if (!value) return []
    return String(value)
      .split(/[;,]/)
      .map(v => v.trim())
      .filter(v => v.length > 0)
  }

  /**
   * Processa o arquivo (Buffer ou Stream) e importa os casos
   */
  static async processImport(fileBuffer: Buffer, isCsv: boolean, userId: string): Promise<ImportResult> {
    const workbook = new ExcelJS.Workbook()
    
    if (isCsv) {
      const stream = new (require('stream').Readable)()
      stream.push(fileBuffer)
      stream.push(null)
      await workbook.csv.read(stream)
    } else {
      // [CORREÇÃO 1] Cast para 'any' resolve a incompatibilidade estrita de tipos do ExcelJS
      await workbook.xlsx.load(fileBuffer as any)
    }

    const worksheet = workbook.worksheets[0]
    if (!worksheet) {
      throw new Error('PLANILHA_VAZIA')
    }

    // Mapeamento de Cabeçalhos
    const headerMap: Record<string, number> = {}
    const headerRow = worksheet.getRow(1)
    
    headerRow.eachCell((cell, colNumber) => {
      if (cell.value) {
          headerMap[this.normalizeKey(String(cell.value))] = colNumber
      }
    })

    const getValue = (row: ExcelJS.Row, ...keys: string[]) => {
        for (const key of keys) {
            const colIndex = headerMap[this.normalizeKey(key)]
            if (colIndex) {
                const val = row.getCell(colIndex).value
                if (val && typeof val === 'object') {
                    if ('text' in val) return (val as any).text;
                    if ('result' in val) return (val as any).result;
                }
                return val
            }
        }
        return undefined
    }

    let createdCount = 0
    let errorCount = 0
    const logs: string[] = []
    const cpfSet = new Set<string>()

    // Loop de Processamento (Começa da linha 2)
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i)
      if (!row.hasValues) continue
      const rowNum = i
      
      try {
          // 1. Campos Obrigatórios
          const nome = getValue(row, 'nome', 'nomecompleto', 'usuario')
          const cpfRaw = getValue(row, 'cpf')

          if (!nome) continue 

          // 2. Validação CPF
          const cpf = cpfRaw ? this.cleanDigits(cpfRaw) : null
          
          if (!cpf) {
             logs.push(`Linha ${rowNum}: CPF não informado. Ignorada.`)
             errorCount++
             continue
          }

          if (cpf.length !== 11) {
              logs.push(`Linha ${rowNum}: CPF inválido (${cpfRaw}). Ignorada.`)
              errorCount++
              continue
          }

          // 3. Duplicidade (Arquivo ou Banco)
          if (cpfSet.has(cpf)) {
            logs.push(`Linha ${rowNum}: CPF ${cpf} duplicado no arquivo. Ignorada.`)
            errorCount++
            continue
          }
          
          // Verifica no Banco
          const existing = await prisma.case.findUnique({ where: { cpf: String(cpf) } })
          if (existing) {
              logs.push(`Linha ${rowNum}: CPF ${cpf} já cadastrado no sistema. Ignorada.`)
              errorCount++
              continue
          }
          cpfSet.add(cpf)

          // 4. Extração de Dados
          const nascimento = this.parseExcelDate(getValue(row, 'nascimento', 'datanascimento')) || new Date('1900-01-01')
          const dataEntrada = this.parseExcelDate(getValue(row, 'dataentrada', 'dataatendimento')) || new Date()
          const violacoes = this.parseArrayField(getValue(row, 'violacao', 'violacoes', 'tipoviolacao'))
          const beneficios = this.parseArrayField(getValue(row, 'beneficios', 'beneficio', 'transferenciarenda'))
          
          const endereco_logradouro = String(getValue(row, 'endereco', 'logradouro', 'rua') || '')
          const endereco_ra = String(getValue(row, 'ra', 'regiao') || 'Não Informada')
          const endereco_cep = this.cleanDigits(getValue(row, 'cep'))

          const contatos = []
          const tel1 = getValue(row, 'telefone', 'celular', 'contato')
          if (tel1) contatos.push({ tipo: "Principal", numero: String(tel1) })
          const tel2 = getValue(row, 'telefone2', 'recado')
          if (tel2) contatos.push({ tipo: "Recado", numero: String(tel2) })

          // Urgência
          const urgenciaTexto = String(getValue(row, 'urgencia', 'risco') || 'Sem risco imediato')
          let pesoUrgencia = Number(getValue(row, 'pesourgencia', 'peso'))
          if (!pesoUrgencia || isNaN(pesoUrgencia)) {
              const uLower = urgenciaTexto.toLowerCase()
              if (uLower.includes('morte') || uLower.includes('agressor') || uLower.includes('sexual')) pesoUrgencia = 4
              else if (uLower.includes('ameaça') || uLower.includes('reincidência') || uLower.includes('física')) pesoUrgencia = 3
              else if (uLower.includes('acolhimento') || uLower.includes('rua') || uLower.includes('idoso')) pesoUrgencia = 2
              else pesoUrgencia = 1
          }

          // Persistência
          await prisma.case.create({
              data: {
                  nomeCompleto: String(nome),
                  nomeSocial: getValue(row, 'nomesocial') ? String(getValue(row, 'nomesocial')) : null,
                  cpf: cpf, 
                  nascimento,
                  sexo: String(getValue(row, 'sexo') || 'Não Informado'),
                  
                  // [CORREÇÃO 2] Campo 'nis' removido pois não existe no Schema do Prisma
                  // nis: this.cleanDigits(getValue(row, 'nis')) || null, 
                  
                  contatos: contatos as any,
                  endereco_logradouro,
                  endereco_ra,
                  endereco_cidade: 'Brasília',
                  endereco_uf: 'DF',
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
                  criadoPorId: userId
              }
          })
          
          createdCount++

      } catch (err: any) {
          logs.push(`Linha ${rowNum}: Erro ao salvar - ${err.message}`)
          errorCount++
      }
    }

    return {
      processed: worksheet.rowCount - 1,
      created: createdCount,
      errors: errorCount,
      logs: logs.slice(0, 100)
    }
  }
}