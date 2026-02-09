// backend/src/services/ImportService.ts
import { prisma } from '../lib/prisma'
import { CaseStatus, CaseOrigin, Prisma } from '@prisma/client'
import ExcelJS from 'exceljs'
import { parse, isValid } from 'date-fns'
import { Buffer } from 'node:buffer'
import { Readable } from 'stream'
import { calculateUrgencyWeight } from '../domain/UrgencyRules';

interface ImportResult {
  processed: number
  created: number
  errors: number
  logs: string[]
}

export class ImportService {

  // --- HELPERS ---
  private static cleanDigits(val: any) {
    return String(val || '').replace(/\D/g, '')
  }

  private static normalizeKey(key: string) {
    return key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '')
  }

  private static normalizeName(name: string) {
    return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").trim()
  }

  private static parseExcelDate(value: any): Date | null {
    if (!value) return null
    if (value instanceof Date) return value
    if (typeof value === 'string') {
      const v = value.trim()
      // Tenta formato DD/MM/YYYY
      let parsed = parse(v, 'dd/MM/yyyy', new Date())
      if (isValid(parsed)) return parsed
      // Tenta formato ISO ou nativo
      parsed = new Date(v)
      if (isValid(parsed)) return parsed
    }
    if (typeof value === 'object' && value !== null) {
       if ('result' in value && value.result instanceof Date) return value.result;
    }
    return null
  }

  // [AJUSTE] Retorna Prisma.Decimal para compatibilidade com o Schema
  private static parseCurrency(value: any): Prisma.Decimal | null {
    if (value === null || value === undefined || value === '') return null
    
    if (typeof value === 'number') {
        return new Prisma.Decimal(value)
    }
    
    // Limpa R$, espaços e converte vírgula para ponto
    const cleanStr = String(value)
        .replace(/[^\d,-]/g, '') // Mantém apenas dígitos, vírgula e hífen
        .replace(',', '.')
    
    try {
        const num = parseFloat(cleanStr)
        return isNaN(num) ? null : new Prisma.Decimal(cleanStr)
    } catch {
        return null
    }
  }

  private static parseArrayField(value: any): string[] {
    if (!value) return []
    return String(value).split(/[;,]/).map(v => v.trim()).filter(v => v.length > 0)
  }

  static async processImport(fileBuffer: Buffer, isCsv: boolean, userId: string): Promise<ImportResult> {
    const workbook = new ExcelJS.Workbook()
    
    if (isCsv) {
      await workbook.csv.read(Readable.from(fileBuffer as any))
    } else {
      await workbook.xlsx.load(fileBuffer as any)
    }

    const worksheet = workbook.worksheets[0]
    if (!worksheet) throw new Error('PLANILHA_VAZIA')

    // Carrega usuários para vincular por nome
    const allUsers = await prisma.user.findMany({ select: { id: true, nome: true } })
    const userMap = new Map<string, string>()
    allUsers.forEach(u => {
      if (u.nome) userMap.set(this.normalizeName(u.nome), u.id)
    })

    // Mapeia cabeçalhos
    const headerMap: Record<string, number> = {}
    const headerRow = worksheet.getRow(1)
    headerRow.eachCell((cell, colNumber) => {
      if (cell.value) headerMap[this.normalizeKey(String(cell.value))] = colNumber
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
    let processedCount = 0
    const logs: string[] = []
    const cpfSet = new Set<string>()

    // Loop a partir da linha 2
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i)
      if (!row.hasValues) continue
      processedCount++
      const rowNum = i
      
      try {
          const nome = getValue(row, 'nome', 'nomecompleto')
          const cpfRaw = getValue(row, 'cpf')

          if (!nome) continue 

          const cpf = cpfRaw ? this.cleanDigits(cpfRaw) : null
          
          if (!cpf || cpf.length !== 11) {
             logs.push(`Linha ${rowNum}: CPF inválido ou ausente. Ignorada.`)
             errorCount++
             continue 
          }

          if (cpfSet.has(cpf)) {
             logs.push(`Linha ${rowNum}: CPF duplicado no arquivo. Ignorada.`)
             errorCount++
             continue
          }
          const existing = await prisma.case.findUnique({ where: { cpf: String(cpf) } })
          if (existing) {
            logs.push(`Linha ${rowNum}: CPF já cadastrado no sistema. Ignorada.`)
            errorCount++
            continue
          }
          cpfSet.add(cpf)

          // --- DATAS ---
          const nascimento = this.parseExcelDate(getValue(row, 'nascimento', 'datanascimento', 'nasc')) || new Date('1900-01-01')
          const dataEntrada = this.parseExcelDate(getValue(row, 'dataentrada', 'dataatendimento', 'entrada')) || new Date()
          const dataInicioPAEFI = this.parseExcelDate(getValue(row, 'inicio_paefi', 'datainiciopaefi', 'data_paefi', 'inicio_acompanhamento'))

          // --- CAMPOS SIMPLES ---
          const ocupacao = String(getValue(row, 'ocupacao', 'profissão') || '')
          const renda = this.parseCurrency(getValue(row, 'renda', 'salario'))
          const responsavelLegal = String(getValue(row, 'responsavel', 'responsavellegal', 'resp') || '')
          const parentescoResponsavel = String(getValue(row, 'parentesco', 'vinculo', 'parent') || '')

          // --- ENDEREÇO DETALHADO ---
          const endereco_cep = this.cleanDigits(getValue(row, 'cep'))
          const endereco_ra = String(getValue(row, 'ra', 'regiao', 'regiao_adm') || 'Não Informada')
          const endereco_logradouro = String(getValue(row, 'logradouro', 'endereco', 'rua') || '')
          const endereco_complemento = String(getValue(row, 'complemento', 'comp') || '')
          const endereco_bairro = String(getValue(row, 'bairro', 'setor', 'vila') || '')

          // --- CONTATOS ---
          const contatos = []
          const tel1 = getValue(row, 'telefone', 'celular')
          if (tel1) contatos.push({ tipo: "Principal", numero: String(tel1) })

          // --- VÍNCULOS DE EQUIPE ---
          let agenteId = null
          let especialistaId = null
          const rawAgente = getValue(row, 'agenteacolhida', 'agente', 'tecnico')
          if (rawAgente) {
             agenteId = userMap.get(this.normalizeName(String(rawAgente))) || null
             if (!agenteId) logs.push(`Aviso [Linha ${rowNum}]: Agente "${rawAgente}" não encontrado.`)
          }
          const rawEspecialista = getValue(row, 'especialistaref', 'especialista', 'spec')
          if (rawEspecialista) {
             especialistaId = userMap.get(this.normalizeName(String(rawEspecialista))) || null
          }

          // --- URGÊNCIA E STATUS ---
          const urgenciaTexto = String(getValue(row, 'urgencia', 'risco') || 'Sem risco imediato')
          // [REFATORAÇÃO] Uso da função centralizada
          const pesoUrgencia = calculateUrgencyWeight(urgenciaTexto);
          
          let statusRaw = String(getValue(row, 'status') || 'AGUARDANDO_DISTRIBUICAO').toUpperCase().replace(/ /g, '_')
          if (!Object.values(CaseStatus).includes(statusRaw as any)) statusRaw = 'AGUARDANDO_DISTRIBUICAO'

          const linkSei = String(getValue(row, 'linksei', 'link_sei', 'urlsei') || '')
          const numeroSei = getValue(row, 'sei', 'numerosei') ? String(getValue(row, 'sei', 'numerosei')) : null

          // --- LISTAS ---
          const violacoes = this.parseArrayField(getValue(row, 'violacao', 'violacoes'))
          const beneficios = this.parseArrayField(getValue(row, 'beneficios', 'beneficio'))

          await prisma.case.create({
              data: {
                  nomeCompleto: String(nome),
                  nomeSocial: getValue(row, 'nomesocial') ? String(getValue(row, 'nomesocial')) : null,
                  cpf: cpf, 
                  nascimento: nascimento,
                  
                  responsavelLegal: responsavelLegal || null,
                  parentescoResponsavel: parentescoResponsavel || null,

                  sexo: String(getValue(row, 'sexo') || 'Não Informado'),
                  
                  // Novos Campos Financeiros
                  ocupacao: ocupacao || null,
                  renda: renda, // Prisma.Decimal
                  
                  // Mapeamento de Endereço (Campos Flat)
                  endereco_cep: endereco_cep || null,
                  endereco_ra,
                  endereco_logradouro,
                  endereco_complemento: endereco_complemento || null,
                  endereco_bairro: endereco_bairro || null,
                  endereco_cidade: 'Brasília',
                  endereco_uf: 'DF',
                  
                  contatos: contatos as any,

                  urgencia: urgenciaTexto,
                  pesoUrgencia,
                  violacao: violacoes.length > 0 ? violacoes : ['Não classificado'],
                  categoria: String(getValue(row, 'categoria') || 'Família'),
                  
                  orgaoDemandante: String(getValue(row, 'orgaodemandante', 'orgao') || 'Demanda Espontânea'),
                  origem: CaseOrigin.DOCUMENTAL,
                  
                  numeroSei,
                  linkSei: linkSei || null,
                  dataInicioPAEFI: dataInicioPAEFI || null,
                  
                  beneficios,
                  dataEntrada,
                  status: statusRaw as CaseStatus,
                  
                  agenteAcolhidaId: agenteId,
                  especialistaPAEFIId: especialistaId,
                  criadoPorId: userId
              }
          })
          
          createdCount++
      } catch (err: any) {
          logs.push(`Linha ${rowNum}: Erro crítico - ${err.message}`)
          errorCount++
      }
    }

    return { processed: processedCount, created: createdCount, errors: errorCount, logs: logs }
  }
}