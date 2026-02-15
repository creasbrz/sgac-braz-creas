// backend/src/services/CaseService.ts
import { prisma } from '../lib/prisma'
import { cache } from '../lib/cache'
import { CryptoService } from '../lib/crypto'
import { geocodeAddress } from '../utils/geocoding'
import { LogAction, CaseStatus, Prisma } from '@prisma/client'
import { CreateCaseInput, UpdateCaseInput } from '../schemas/caseSchema'
import { calculateUrgencyWeight } from '../domain/UrgencyRules'

interface AddressObject {
  logradouro: string | null
  ra: string | null
  cep: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  latitude: number | null
  longitude: number | null
}

export class CaseService {
  
  // --- HELPERS PRIVADOS ---

  private static safeDecrypt(value: string | null | undefined): string | null {
    if (!value) return null
    try {
        const decrypted = CryptoService.decrypt(value)
        return decrypted || value 
    } catch (e) {
        return value 
    }
  }

  private static decryptCaseData(caso: any) {
    if (!caso) return null

    const logradouro = this.safeDecrypt(caso.endereco_logradouro)
    const complemento = this.safeDecrypt(caso.endereco_complemento)
    
    let contatos = caso.contatos
    if (contatos && Array.isArray(contatos)) {
        contatos = contatos.map((c: any) => ({
            ...c,
            numero: this.safeDecrypt(c.numero)
        }))
    }

    return {
        ...caso,
        endereco_logradouro: logradouro,
        endereco_complemento: complemento,
        contatos
    }
  }

  private static formatCaseOutput(rawCase: any) {
    const caso = this.decryptCaseData(rawCase)
    if (!caso) return null

    const endereco: AddressObject = {
      logradouro: caso.endereco_logradouro,
      ra: caso.endereco_ra,
      cep: caso.endereco_cep,
      complemento: caso.endereco_complemento,
      bairro: caso.endereco_bairro,
      cidade: caso.endereco_cidade,
      uf: caso.endereco_uf,
      latitude: caso.latitude,
      longitude: caso.longitude
    }

    return { 
        ...caso, 
        endereco 
    }
  }

  private static stripTime(date: Date | string): Date {
    const d = new Date(date)
    if (isNaN(d.getTime())) return new Date()
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0))
  }

  private static parseDecimal(value: any): Prisma.Decimal | null {
    if (value === null || value === undefined || value === '') return null
    try {
      const cleanValue = String(value).replace(',', '.')
      return new Prisma.Decimal(cleanValue)
    } catch (e) {
      return null
    }
  }

  private static async createLog(casoId: string, autorId: string, acao: LogAction, descricao: string, valorAnterior?: string | null, valorNovo?: string | null) {
    await prisma.caseLog.create({ 
      data: { casoId, autorId, acao, descricao, valorAnterior: valorAnterior ? String(valorAnterior) : null, valorNovo: valorNovo ? String(valorNovo) : null } 
    }).catch(console.error)
  }

  // --- MÉTODOS PÚBLICOS ---

  static async findAll(params: any, user: { sub: string, cargo: string }) {
    const { page = 1, pageSize = 10, sortBy, sortOrder } = params
    
    const where = this.buildWhereClause(params, user)

    let orderBy: Prisma.CaseOrderByWithRelationInput | Prisma.CaseOrderByWithRelationInput[] = [
      { pesoUrgencia: 'desc' },
      { dataEntrada: 'asc' }
    ]
    
    if (sortBy && typeof sortBy === 'string' && sortBy !== 'undefined' && sortBy !== 'null') {
      const direction = sortOrder === 'asc' ? 'asc' : 'desc'
      
      if (sortBy === 'urgencia') {
         orderBy = [{ pesoUrgencia: direction }, { dataEntrada: 'asc' }]
      } else {
         const validSortFields = ['nomeCompleto', 'dataEntrada', 'status', 'updatedAt']
         if (validSortFields.includes(sortBy)) {
             orderBy = { [sortBy]: direction }
         }
      }
    }

    try {
        const [items, total] = await Promise.all([
          prisma.case.findMany({
            where,
            orderBy,
            take: Number(pageSize),
            skip: (Number(page) - 1) * Number(pageSize),
            include: {
              agenteAcolhida: { select: { nome: true } },
              especialistaPAEFI: { select: { nome: true } }
            },
          }),
          prisma.case.count({ where }),
        ])

        const formattedItems = items.map(item => this.formatCaseOutput(item))

        return { 
          data: formattedItems, 
          meta: { 
            total, 
            page: Number(page), 
            pageSize: Number(pageSize), 
            totalPages: Math.ceil(total / Number(pageSize)) 
          } 
        }
    } catch (error) {
        console.error("[CaseService.findAll] Erro crítico na query:", error)
        return { 
            data: [], 
            meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 } 
        }
    }
  }

  static async create(data: CreateCaseInput & { email?: string, casoPrincipalId?: string }, userId: string) {
    const exists = await prisma.case.findUnique({ where: { cpf: data.cpf } })
    if (exists) throw new Error('CPF_ALREADY_EXISTS')

    let endLat = data.endereco.latitude || null
    let endLng = data.endereco.longitude || null

    if (!endLat && data.endereco.logradouro && data.endereco.ra) {
      try {
        const coords = await geocodeAddress(data.endereco.logradouro, data.endereco.ra, data.endereco.cidade)
        if (coords) { endLat = coords.lat; endLng = coords.lng }
      } catch (e) { /* Falha silenciosa */ }
    }

    const { endereco, ...restData } = data

    const encryptedLogradouro = CryptoService.encrypt(endereco.logradouro)
    const encryptedComplemento = CryptoService.encrypt(endereco.complemento)
    
    const encryptedContacts = data.contatos.map(c => ({
        ...c,
        numero: CryptoService.encrypt(c.numero) || ''
    }))

    const pesoUrgencia = calculateUrgencyWeight(data.urgencia)

    const newCase = await prisma.case.create({
      data: {
        ...restData, 
        nascimento: this.stripTime(data.nascimento),
        dataEntrada: this.stripTime(data.dataEntrada),
        pesoUrgencia,
        ocupacao: data.ocupacao || null,
        renda: this.parseDecimal(data.renda),
        email: data.email || null,
        casoPrincipalId: data.casoPrincipalId || null,

        endereco_logradouro: encryptedLogradouro,
        endereco_complemento: encryptedComplemento,
        contatos: encryptedContacts as any,
        
        endereco_ra: endereco.ra,
        endereco_cep: endereco.cep,
        endereco_bairro: endereco.bairro,
        endereco_cidade: endereco.cidade,
        endereco_uf: endereco.uf,
        latitude: endLat,
        longitude: endLng,
        
        criadoPorId: userId,
        status: CaseStatus.AGUARDANDO_ACOLHIDA,
      }
    })

    cache.invalidate('manager_stats')
    await this.createLog(newCase.id, userId, LogAction.CRIACAO, `Caso criado via ${data.origem}. Urgência: ${data.urgencia} (Peso ${pesoUrgencia})`)
    
    return this.formatCaseOutput(newCase)
  }

  static async update(id: string, data: UpdateCaseInput & { seiRespondido?: boolean, linkSei?: string | null, numeroSei?: string | null, email?: string, casoPrincipalId?: string | null }, userId: string) {
    const oldCase = await prisma.case.findUnique({ where: { id } })
    if (!oldCase) throw new Error('NOT_FOUND')

    const dataToUpdate: any = { ...data }
    
    if (data.endereco) delete dataToUpdate.endereco
    if (data.contatos) delete dataToUpdate.contatos

    if (data.nascimento) dataToUpdate.nascimento = this.stripTime(data.nascimento)
    if (data.dataEntrada) dataToUpdate.dataEntrada = this.stripTime(data.dataEntrada)
    
    if (data.urgencia) {
        dataToUpdate.pesoUrgencia = calculateUrgencyWeight(data.urgencia)
    }
    
    if (data.renda !== undefined) dataToUpdate.renda = this.parseDecimal(data.renda)

    if (typeof data.seiRespondido === 'boolean') {
        dataToUpdate.seiRespondido = data.seiRespondido
        if (data.seiRespondido === true) {
            dataToUpdate.dataRespostaSei = new Date()
        } else {
            dataToUpdate.dataRespostaSei = null
        }
    }

    if (data.casoPrincipalId !== undefined) {
        dataToUpdate.casoPrincipalId = data.casoPrincipalId
    }

    if (data.endereco) {
      Object.assign(dataToUpdate, {
        endereco_logradouro: CryptoService.encrypt(data.endereco.logradouro),
        endereco_complemento: CryptoService.encrypt(data.endereco.complemento),
        endereco_ra: data.endereco.ra,
        endereco_cep: data.endereco.cep,
        endereco_bairro: data.endereco.bairro,
        endereco_cidade: data.endereco.cidade,
        endereco_uf: data.endereco.uf,
        latitude: data.endereco.latitude,
        longitude: data.endereco.longitude,
      })
    }

    if (data.contatos) {
        dataToUpdate.contatos = data.contatos.map((c: any) => ({
            ...c,
            numero: CryptoService.encrypt(c.numero) || ''
        }))
    }

    const updated = await prisma.case.update({ where: { id }, data: dataToUpdate })
    
    cache.invalidate('manager_stats')
    
    let logMsg = `Editou dados cadastrais.`
    if (data.casoPrincipalId && data.casoPrincipalId !== oldCase.casoPrincipalId) logMsg = `Vinculou ao prontuário ${data.casoPrincipalId}.`
    if (data.casoPrincipalId === null && oldCase.casoPrincipalId) logMsg = `Removeu vínculo de prontuário.`

    await this.createLog(id, userId, LogAction.OUTRO, logMsg)
    
    return this.formatCaseOutput(updated)
  }

  static async getCaseWithEconomics(id: string) {
    const caso = await prisma.case.findUnique({
      where: { id },
      include: {
        criadoPor: { select: { nome: true } },
        agenteAcolhida: { select: { id: true, nome: true } },
        especialistaPAEFI: { select: { id: true, nome: true } },
        familia: true,
        casosVinculados: { select: { id: true, nomeCompleto: true, status: true } },
        casoPrincipal: { select: { id: true, nomeCompleto: true } },
        encaminhamentos: { include: { autor: { select: { nome: true } } }, orderBy: { dataEnvio: 'desc' } },
        entregas: { include: { responsavel: { select: { nome: true } } }, orderBy: { dataSolicitacao: 'desc' } },
        evolucoes: { include: { autor: { select: { nome: true, cargo: true } } }, orderBy: { createdAt: 'desc' } },
        logs: { orderBy: { createdAt: 'desc' }, take: 50, include: { autor: { select: { nome: true } } } },
      }
    })

    if (!caso) return null

    const rendaTitular = caso.renda ? Number(caso.renda) : 0
    const rendaFamiliares = caso.familia.reduce((acc, membro) => {
      const rendaMembro = membro.renda ? Number(membro.renda) : 0
      return acc + rendaMembro
    }, 0)

    const rendaTotal = rendaTitular + rendaFamiliares
    const numeroPessoas = 1 + caso.familia.length
    const rendaPerCapita = numeroPessoas > 0 ? (rendaTotal / numeroPessoas) : 0

    const casoFormatado = this.formatCaseOutput(caso)

    return {
      ...casoFormatado,
      renda: rendaTitular,
      familia: caso.familia.map(m => ({ ...m, renda: m.renda ? Number(m.renda) : 0 })),
      dadosEconomicos: {
        rendaTotal: Number(rendaTotal.toFixed(2)),
        numeroPessoas,
        rendaPerCapita: Number(rendaPerCapita.toFixed(2))
      }
    }
  }

  static async updateStatus(id: string, status: CaseStatus, userId: string) {
    const caso = await prisma.case.findUnique({ where: { id } })
    if (!caso) throw new Error('NOT_FOUND')

    let updateData: any = { status }
    if (caso.status === CaseStatus.DESLIGADO && status !== CaseStatus.DESLIGADO) {
      updateData = { 
        status: CaseStatus.AGUARDANDO_ACOLHIDA, 
        motivoDesligamento: null, 
        destinoDesligamento: null, 
        dataDesligamento: null, 
        parecerFinal: null,
        manterReferencia: false 
      }
    }

    const updated = await prisma.case.update({ where: { id }, data: updateData })
    cache.invalidate('manager_stats')
    await this.createLog(id, userId, LogAction.MUDANCA_STATUS, `Alterou status para ${status}`, caso.status, status)
    return this.formatCaseOutput(updated)
  }

  static async assignSpecialist(id: string, specialistId: string, managerId: string) {
    const oldCase = await prisma.case.findUnique({ where: { id }, include: { especialistaPAEFI: true } })
    
    if (!oldCase) throw new Error('NOT_FOUND')
    
    const updated = await prisma.case.update({ 
      where: { id }, 
      data: { 
        especialistaPAEFIId: specialistId, 
        status: CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, 
        dataInicioPAEFI: new Date() 
      } 
    })
    
    cache.invalidate('manager_stats')
    await this.createLog(id, managerId, LogAction.ATRIBUICAO, `Atribuiu especialista`, oldCase?.especialistaPAEFI?.nome, 'Novo')
    
    return this.formatCaseOutput(updated)
  }

  static async closeCase(id: string, data: { parecerFinal: string, motivoDesligamento: string, destinoDesligamento?: string, manterReferencia?: boolean }, userId: string) {
    const updated = await prisma.case.update({ 
      where: { id }, 
      data: { 
        status: CaseStatus.DESLIGADO, 
        ...data, 
        dataDesligamento: new Date() 
      } 
    })
    
    cache.invalidate('manager_stats')
    
    const refMsg = data.manterReferencia ? ' (Mantendo referência)' : '';
    await this.createLog(id, userId, LogAction.DESLIGAMENTO, `Desligou: ${data.motivoDesligamento}${refMsg}`)
    
    return this.formatCaseOutput(updated)
  }

  static buildWhereClause(query: any, user: { cargo: string, sub: string }) {
    const { search, status, urgencia, violacao, categoria, sexo, view, agenteId, specialistId, manterReferencia } = query
    
    const conditions: any[] = []

    if (view === 'all') {
      if (status === 'DESLIGADO') {
         conditions.push({ status: CaseStatus.DESLIGADO })
      } else if (!status || status === 'all') {
         conditions.push({ status: { not: CaseStatus.DESLIGADO } })
      }
    } else {
      if (user.cargo === 'Gerente') {
         conditions.push({ status: CaseStatus.AGUARDANDO_DISTRIBUICAO })
      } 
      else if (user.cargo === 'Agente_Social') {
         conditions.push({
           OR: [
             { agenteAcolhidaId: user.sub },
             { status: CaseStatus.AGUARDANDO_ACOLHIDA, agenteAcolhidaId: null }
           ]
         })
      } 
      else if (user.cargo === 'Especialista') {
         conditions.push({ especialistaPAEFIId: user.sub })
         conditions.push({ status: { not: CaseStatus.DESLIGADO } })
      }
    }

    if (agenteId) conditions.push({ agenteAcolhidaId: agenteId })
    if (specialistId) conditions.push({ especialistaPAEFIId: specialistId })

    if (search && search.trim() !== '') {
      const numericSearch = search.replace(/\D/g, ''); 
      
      const searchConditions: any[] = [
        { nomeCompleto: { contains: search, mode: 'insensitive' } },
        { endereco_ra: { contains: search, mode: 'insensitive' } }
      ];

      // Garante que o CPF só pesquise o número puro se o Prisma suportar strings nele
      if (numericSearch.length > 0) {
         searchConditions.push({ cpf: { contains: numericSearch } });
      }

      conditions.push({ OR: searchConditions });
    }

    if (manterReferencia === 'true' || manterReferencia === true) {
      conditions.push({ manterReferencia: true })
    }

    if (status && status !== 'all') {
      const validStatuses = status.split(',').filter((s: string) => Object.values(CaseStatus).includes(s as CaseStatus))
      if (validStatuses.length > 0) conditions.push({ status: { in: validStatuses } })
    }

    if (urgencia && urgencia !== 'all') conditions.push({ urgencia })
    
    if (violacao && violacao !== 'all') {
      conditions.push({ violacao: { has: violacao } })
    }
    
    if (categoria && categoria !== 'all') conditions.push({ categoria })
    if (sexo && sexo !== 'all') conditions.push({ sexo })

    if (conditions.length === 0) return {}
    return { AND: conditions }
  }
}