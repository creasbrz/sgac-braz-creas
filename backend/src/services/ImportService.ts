// backend/src/services/ImportService.ts
import { prisma } from '../lib/prisma'
import { CaseStatus, CaseOrigin } from '@prisma/client'
import ExcelJS from 'exceljs'
import { parse, isValid } from 'date-fns'
import { Buffer } from 'node:buffer' // Importante para tipagem correta com ExcelJS

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
    // Remove acentos e caracteres especiais para facilitar o "match" das colunas
    return key.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, '')
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
    
    // Tratamento para fórmulas ou links do Excel
    if (typeof value === 'object' && value !== null) {
        if ('result' in value && value.result instanceof Date) return value.result;
    }
    return null
  }

  private static parseCurrency(value: any): number | null {
    if (!value) return null
    if (typeof value === 'number') return value
    
    // Limpa R$, espaços e converte vírgula decimal para ponto
    const cleanStr = String(value)
      .replace('R$', '')
      .replace(/\s/g, '')
      .replace(/\./g, '') // Remove separador de milhar se houver
      .replace(',', '.')  // Troca vírgula decimal por ponto
    
    const num = parseFloat(cleanStr)
    return isNaN(num) ? null : num
  }

  private static parseArrayField(value: any): string[] {
    if (!value) return []
    return String(value)
      .split(/[;,]/) // Aceita separação por ponto-e-vírgula ou vírgula
      .map(v => v.trim())
      .filter(v => v.length > 0)
  }

  /**
   * Processa o arquivo (Buffer) e importa os casos
   */
  static async processImport(fileBuffer: Buffer, isCsv: boolean, userId: string): Promise<ImportResult> {
    const workbook = new ExcelJS.Workbook()
    
    if (isCsv) {
      const stream = new (require('stream').Readable)()
      stream.push(fileBuffer)
      stream.push(null)
      await workbook.csv.read(stream)
    } else {
      // [IMPORTANTE] Carrega o XLSX nativo. O cast 'as any' evita conflito de tipos do Buffer.
      await workbook.xlsx.load(fileBuffer as any)
    }

    const worksheet = workbook.worksheets[0]
    if (!worksheet) {
      throw new Error('PLANILHA_VAZIA')
    }

    // 1. Mapeamento Dinâmico de Cabeçalhos
    // Permite que o usuário use "Nome Completo", "Nome", "Usuário" e o sistema entenda.
    const headerMap: Record<string, number> = {}
    const headerRow = worksheet.getRow(1)
    
    headerRow.eachCell((cell, colNumber) => {
      if (cell.value) {
          headerMap[this.normalizeKey(String(cell.value))] = colNumber
      }
    })

    // Função auxiliar para buscar valor em várias colunas possíveis
    const getValue = (row: ExcelJS.Row, ...keys: string[]) => {
        for (const key of keys) {
            const colIndex = headerMap[this.normalizeKey(key)]
            if (colIndex) {
                const val = row.getCell(colIndex).value
                // Se for célula com fórmula ou rich text, extrai o valor real
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
          // --- CAMPOS ESSENCIAIS ---
          const nome = getValue(row, 'nome', 'nomecompleto', 'usuario')
          const cpfRaw = getValue(row, 'cpf')

          if (!nome) continue // Pula linhas vazias

          // Validação CPF
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

          // Validação Duplicidade no Arquivo
          if (cpfSet.has(cpf)) {
            logs.push(`Linha ${rowNum}: CPF ${cpf} duplicado no arquivo. Ignorada.`)
            errorCount++
            continue
          }
          
          // Validação Duplicidade no Banco
          const existing = await prisma.case.findUnique({ where: { cpf: String(cpf) } })
          if (existing) {
             logs.push(`Linha ${rowNum}: CPF ${cpf} já cadastrado no sistema. Ignorada.`)
             errorCount++
             continue
          }
          cpfSet.add(cpf)

          // --- EXTRAÇÃO DE DADOS ---
          const nascimento = this.parseExcelDate(getValue(row, 'nascimento', 'datanascimento', 'nasc')) || new Date('1900-01-01')
          const dataEntrada = this.parseExcelDate(getValue(row, 'dataentrada', 'dataatendimento', 'entrada')) || new Date()
          
          // Arrays e Listas
          const violacoes = this.parseArrayField(getValue(row, 'violacao', 'violacoes', 'tipoviolacao'))
          const beneficios = this.parseArrayField(getValue(row, 'beneficios', 'beneficio', 'transferenciarenda'))
          
          // Novos Campos
          const ocupacao = String(getValue(row, 'ocupacao', 'profissão', 'trabalho') || '')
          const rendaRaw = getValue(row, 'renda', 'salario', 'rendimento')
          const renda = this.parseCurrency(rendaRaw)

          // Endereço
          const endereco_logradouro = String(getValue(row, 'endereco', 'logradouro', 'rua') || '')
          const endereco_ra = String(getValue(row, 'ra', 'regiao') || 'Não Informada')
          const endereco_cep = this.cleanDigits(getValue(row, 'cep'))

          // Contatos
          const contatos = []
          const tel1 = getValue(row, 'telefone', 'celular', 'contato')
          if (tel1) contatos.push({ tipo: "Principal", numero: String(tel1) })
          
          // Urgência (Heurística)
          const urgenciaTexto = String(getValue(row, 'urgencia', 'risco') || 'Sem risco imediato')
          let pesoUrgencia = Number(getValue(row, 'pesourgencia', 'peso'))
          
          if (!pesoUrgencia || isNaN(pesoUrgencia)) {
              const uLower = urgenciaTexto.toLowerCase()
              if (uLower.includes('morte') || uLower.includes('agressor') || uLower.includes('sexual') || uLower.includes('gravíssima')) pesoUrgencia = 4
              else if (uLower.includes('ameaça') || uLower.includes('reincidência') || uLower.includes('física') || uLower.includes('muito grave')) pesoUrgencia = 3
              else if (uLower.includes('acolhimento') || uLower.includes('rua') || uLower.includes('idoso') || uLower.includes('grave')) pesoUrgencia = 2
              else pesoUrgencia = 1
          }

          // --- PERSISTÊNCIA ---
          await prisma.case.create({
              data: {
                  nomeCompleto: String(nome),
                  nomeSocial: getValue(row, 'nomesocial') ? String(getValue(row, 'nomesocial')) : null,
                  cpf: cpf, 
                  nascimento,
                  sexo: String(getValue(row, 'sexo') || 'Não Informado'),
                  
                  // Campos novos mapeados
                  ocupacao: ocupacao || null,
                  renda: renda, // Prisma deve estar configurado para aceitar Float ou Decimal, ou null

                  contatos: contatos as any,
                  endereco_logradouro,
                  endereco_ra,
                  endereco_cidade: 'Brasília',
                  endereco_uf: 'DF',
                  endereco_cep: endereco_cep || null,
                  
                  // Geo (se houver)
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
      logs: logs.slice(0, 100) // Limita logs para segurança
    }
  }
}