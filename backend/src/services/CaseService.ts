// backend/src/services/CaseService.ts
import { prisma } from '../lib/prisma'
import { cache } from '../lib/cache'
import { geocodeAddress } from '../utils/geocoding'
// [CORREÇÃO] Adicionado 'Cargo' aos imports
import { LogAction, CaseStatus, Cargo, Prisma } from '@prisma/client'
import { CreateCaseInput, UpdateCaseInput } from '../schemas/caseSchema'

export class CaseService {
  
  // --- HELPERS PRIVADOS ---

  private static stripTime(date: Date | string): Date {
    const d = new Date(date)
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0))
  }

  private static calculateUrgencyWeight(urgencia: string): number {
    const term = urgencia.trim()
    const weights: Record<string, number> = {
      'Convive com agressor': 4, 'Idoso 80+': 4, 'Primeira infância': 4, 'Risco de morte': 4, 'Violência sexual': 4,
      'Risco de reincidência': 3, 'Sofre ameaça': 3, 'Risco de desabrigo': 3, 'Criança/Adolescente': 3, 'Violência física': 3,
      'PCD': 2, 'Idoso': 2, 'Internação': 2, 'Acolhimento': 2, 'Gestante/Lactante': 2, 'Situação de rua': 2
    }
    return weights[term] || 1
  }

  private static async createLog(casoId: string, autorId: string, acao: LogAction, descricao: string, valorAnterior?: string | null, valorNovo?: string | null) {
    await prisma.caseLog.create({ 
      data: { casoId, autorId, acao, descricao, valorAnterior: valorAnterior ? String(valorAnterior) : null, valorNovo: valorNovo ? String(valorNovo) : null } 
    }).catch(console.error)
  }

  // --- MÉTODOS PÚBLICOS ---

  static async create(data: CreateCaseInput, userId: string) {
    // 1. Verificação de Duplicidade
    const exists = await prisma.case.findUnique({ where: { cpf: data.cpf } })
    if (exists) throw new Error('CPF_ALREADY_EXISTS')

    // 2. Geocodificação
    let endLat = data.endereco.latitude || null
    let endLng = data.endereco.longitude || null

    if (!endLat && data.endereco.logradouro && data.endereco.ra) {
      try {
        const coords = await geocodeAddress(data.endereco.logradouro, data.endereco.ra, data.endereco.cidade)
        if (coords) { endLat = coords.lat; endLng = coords.lng }
      } catch (e) { /* Falha silenciosa */ }
    }

    // 3. Persistência
    const newCase = await prisma.case.create({
      data: {
        ...data,
        nascimento: this.stripTime(data.nascimento),
        dataEntrada: this.stripTime(data.dataEntrada),
        pesoUrgencia: this.calculateUrgencyWeight(data.urgencia),
        
        // [CORREÇÃO] Após 'npx prisma generate', estes campos serão reconhecidos
        ocupacao: data.ocupacao,
        renda: data.renda ? new Prisma.Decimal(data.renda) : null,

        // Mapeamento manual do endereço
        endereco_logradouro: data.endereco.logradouro,
        endereco_ra: data.endereco.ra,
        endereco_cep: data.endereco.cep,
        endereco_complemento: data.endereco.complemento,
        endereco_bairro: data.endereco.bairro,
        endereco_cidade: data.endereco.cidade,
        endereco_uf: data.endereco.uf,
        latitude: endLat,
        longitude: endLng,
        
        // Campos de relacionamento/controle
        criadoPorId: userId,
        status: CaseStatus.AGUARDANDO_ACOLHIDA,
        contatos: data.contatos as any, 
      }
    })

    cache.invalidate('manager_stats')
    await this.createLog(newCase.id, userId, LogAction.CRIACAO, `Caso criado via ${data.origem}`)
    
    return newCase
  }

  static async update(id: string, data: UpdateCaseInput, userId: string) {
    const oldCase = await prisma.case.findUnique({ where: { id } })
    if (!oldCase) throw new Error('NOT_FOUND')

    const dataToUpdate: any = { ...data }
    
    // Tratamentos Especiais
    if (data.nascimento) dataToUpdate.nascimento = this.stripTime(data.nascimento)
    if (data.dataEntrada) dataToUpdate.dataEntrada = this.stripTime(data.dataEntrada)
    if (data.urgencia) dataToUpdate.pesoUrgencia = this.calculateUrgencyWeight(data.urgencia)
    
    // Renda
    if (data.renda !== undefined) {
       dataToUpdate.renda = data.renda ? new Prisma.Decimal(data.renda) : null
    }

    // Lógica de Endereço e Re-Geocodificação
    if (data.endereco) {
      Object.assign(dataToUpdate, {
        endereco_logradouro: data.endereco.logradouro,
        endereco_ra: data.endereco.ra,
        endereco_cep: data.endereco.cep,
        endereco_complemento: data.endereco.complemento,
        endereco_bairro: data.endereco.bairro,
        endereco_cidade: data.endereco.cidade,
        endereco_uf: data.endereco.uf,
        latitude: data.endereco.latitude,
        longitude: data.endereco.longitude,
      })
      delete dataToUpdate.endereco

      const addressChanged = data.endereco.logradouro !== oldCase.endereco_logradouro || data.endereco.ra !== oldCase.endereco_ra
      if (addressChanged && !data.endereco.latitude) {
        try {
            const coords = await geocodeAddress(data.endereco.logradouro!, data.endereco.ra!, data.endereco.cidade)
            if (coords) { dataToUpdate.latitude = coords.lat; dataToUpdate.longitude = coords.lng }
        } catch (e) {}
      }
    }

    const updated = await prisma.case.update({ where: { id }, data: dataToUpdate })
    
    cache.invalidate('manager_stats')
    await this.createLog(id, userId, LogAction.OUTRO, `Editou dados cadastrais.`)
    
    return updated
  }

  static async getCaseWithEconomics(id: string) {
    const caso = await prisma.case.findUnique({
      where: { id },
      include: {
        criadoPor: { select: { nome: true } },
        agenteAcolhida: { select: { id: true, nome: true } },
        especialistaPAEFI: { select: { id: true, nome: true } },
        familia: true,
        encaminhamentos: { include: { autor: { select: { nome: true } } }, orderBy: { dataEnvio: 'desc' } },
        entregas: { include: { responsavel: { select: { nome: true } } }, orderBy: { dataSolicitacao: 'desc' } },
        evolucoes: { include: { autor: { select: { nome: true, cargo: true } } }, orderBy: { createdAt: 'desc' } },
        logs: { orderBy: { createdAt: 'desc' }, take: 50, include: { autor: { select: { nome: true } } } },
      }
    })

    if (!caso) return null

    // --- CÁLCULO ECONÔMICO ---
    // [CORREÇÃO] Após 'npx prisma generate', caso.renda será reconhecido
    const rendaTitular = caso.renda ? Number(caso.renda) : 0
    
    const rendaFamiliares = caso.familia.reduce((acc, membro) => {
      const rendaMembro = membro.renda ? Number(membro.renda) : 0
      return acc + rendaMembro
    }, 0)

    const rendaTotal = rendaTitular + rendaFamiliares
    const numeroPessoas = 1 + caso.familia.length
    const rendaPerCapita = numeroPessoas > 0 ? (rendaTotal / numeroPessoas) : 0

    return {
      ...caso,
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
        parecerFinal: null 
      }
    }

    const updated = await prisma.case.update({ where: { id }, data: updateData })
    
    cache.invalidate('manager_stats')
    await this.createLog(id, userId, LogAction.MUDANCA_STATUS, `Alterou status para ${status}`, caso.status, status)
    
    return updated
  }

  static async assignSpecialist(id: string, specialistId: string, managerId: string) {
    const oldCase = await prisma.case.findUnique({ where: { id }, include: { especialistaPAEFI: true } })
    const spec = await prisma.user.findUnique({ where: { id: specialistId } })
    
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
    await this.createLog(id, managerId, LogAction.ATRIBUICAO, `Atribuiu a ${spec?.nome || 'Desconhecido'}`, oldCase?.especialistaPAEFI?.nome, spec?.nome)
    
    return updated
  }

  static async closeCase(id: string, data: { parecerFinal: string, motivoDesligamento: string, destinoDesligamento?: string }, userId: string) {
    const updated = await prisma.case.update({ 
      where: { id }, 
      data: { 
        status: CaseStatus.DESLIGADO, 
        ...data, 
        dataDesligamento: new Date() 
      } 
    })
    
    cache.invalidate('manager_stats')
    await this.createLog(id, userId, LogAction.DESLIGAMENTO, `Desligou: ${data.motivoDesligamento}`)
    
    return updated
  }

  // Query Builder Complexo para Listagem
  static buildWhereClause(query: any, user: { cargo: string, sub: string }) {
    const { search, status, urgencia, violacao, categoria, sexo, view, agenteId, specialistId } = query
    let where: any = {}

    // 1. Filtros de Escopo (Visão)
    if (agenteId) where = { agenteAcolhidaId: agenteId, status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] } }
    else if (specialistId) where = { especialistaPAEFIId: specialistId, status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO, CaseStatus.EM_MONITORAMENTO] } }
    else if (view === 'all') {
      if (status === 'DESLIGADO') where = { status: CaseStatus.DESLIGADO }
      else where = { status: { not: CaseStatus.DESLIGADO } }
    } else {
      // [CORREÇÃO] Cargo agora é reconhecido devido ao import
      if (user.cargo === Cargo.Gerente) where = { status: CaseStatus.AGUARDANDO_DISTRIBUICAO }
      else if (user.cargo === Cargo.Agente_Social) where = { agenteAcolhidaId: user.sub, status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] } }
      else if (user.cargo === Cargo.Especialista) where = { especialistaPAEFIId: user.sub, status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO, CaseStatus.EM_MONITORAMENTO] } }
    }

    // 2. Busca Textual
    if (search) {
      where.AND = [ ...(where.AND || []), {
          OR: [
            { nomeCompleto: { contains: search, mode: 'insensitive' } },
            { cpf: { contains: search } },
            { endereco_logradouro: { contains: search, mode: 'insensitive' } },
            { endereco_ra: { contains: search, mode: 'insensitive' } }
          ]
      }]
    }

    // 3. Filtros Específicos
    if (status && status !== 'all') {
      const validStatuses = status.split(',').filter((s: string) => Object.values(CaseStatus).includes(s as CaseStatus))
      if (validStatuses.length > 0) where.status = { in: validStatuses }
    }
    if (urgencia && urgencia !== 'all') where.urgencia = urgencia
    if (violacao && violacao !== 'all') where.violacao = { has: violacao }
    if (categoria && categoria !== 'all') where.categoria = categoria
    if (sexo && sexo !== 'all') where.sexo = sexo

    return where
  }
}