// backend/src/services/AppointmentService.ts
import { prisma } from '../lib/prisma'
import { LogAction, Cargo, Agendamento } from '@prisma/client'

// Tipos normalizados para o Frontend
interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date | null
  type: 'INDIVIDUAL' | 'GRUPO'
  resourceId?: string
  description?: string
  status: string
}

interface CreateAppointmentDTO {
  titulo: string
  data: Date
  observacoes?: string | null
  casoId: string
  tipo?: string
}

export class AppointmentService {
  
  /**
   * Widget: Próximos compromissos do usuário logado (Limitado a 5)
   */
  static async getUpcoming(userId: string) {
    const upcoming = await prisma.agendamento.findMany({
      where: { responsavelId: userId, data: { gte: new Date() } },
      include: { 
        caso: { select: { id: true, nomeCompleto: true } } 
      },
      orderBy: { data: 'asc' },
      take: 5
    })

    return upcoming.map(u => ({
      id: u.id,
      titulo: u.titulo,
      data: u.data,
      tipo: u.tipo || 'Atendimento',
      caso: u.caso
    }))
  }

  /**
   * Calendário Principal: Une Agendamentos Individuais e Atividades em Grupo
   */
  static async getCalendarEvents(
    userId: string, 
    cargo: string, 
    start: Date, 
    end: Date, 
    filterCaseId?: string
  ): Promise<CalendarEvent[]> {
    
    // 1. Definição do Filtro de Escopo (Quem vê o quê)
    const whereAppointments: any = { data: { gte: start, lte: end } }

    if (filterCaseId) {
      whereAppointments.casoId = filterCaseId
    } else if (cargo !== Cargo.Gerente) {
      // Regra: Vê seus próprios agendamentos OU agendamentos dos casos onde é responsável
      whereAppointments.OR = [
        { responsavelId: userId },
        { caso: { OR: [{ agenteAcolhidaId: userId }, { especialistaPAEFIId: userId }] } }
      ]
    }

    // 2. Definição do Filtro de Grupos
    const whereGroups: any = { dataRealizacao: { gte: start, lte: end } }
    if (filterCaseId) {
      whereGroups.participantes = { some: { casoId: filterCaseId } }
    }

    // 3. Execução Paralela (Vital para performance no Neon)
    const [appointments, groups] = await Promise.all([
      prisma.agendamento.findMany({
        where: whereAppointments,
        include: { caso: { select: { nomeCompleto: true } } }
      }),
      prisma.groupActivity.findMany({
        where: whereGroups,
        include: { facilitador: { select: { nome: true } } }
      })
    ])

    // 4. Normalização de Dados (Adapter Pattern)
    const events: CalendarEvent[] = []

    // Mapeia Agendamentos Individuais
    events.push(...appointments.map(a => ({
      id: a.id,
      title: a.caso ? `${a.titulo} - ${a.caso.nomeCompleto}` : a.titulo,
      start: a.data,
      end: null, // Agendamentos pontuais não costumam ter hora fim no sistema atual
      type: 'INDIVIDUAL' as const,
      resourceId: a.casoId || undefined,
      description: a.observacoes || '',
      status: 'SCHEDULED'
    })))

    // Mapeia Grupos
    events.push(...groups.map(g => ({
      id: g.id,
      title: `[GRUPO] ${g.tema} (${g.tipo.replace('_', ' ')})`,
      start: g.dataRealizacao,
      end: null,
      type: 'GRUPO' as const,
      resourceId: g.id,
      description: g.descricao || '',
      status: 'SCHEDULED'
    })))

    // Ordenação cronológica
    return events.sort((a, b) => a.start.getTime() - b.start.getTime())
  }

  /**
   * Criação com Log de Auditoria
   */
  static async create(userId: string, data: CreateAppointmentDTO) {
    const agendamento = await prisma.agendamento.create({
      data: { ...data, responsavelId: userId }
    })

    // Log assíncrono (não bloqueia a resposta, mas garante registro)
    await prisma.caseLog.create({
      data: {
        casoId: data.casoId,
        autorId: userId,
        acao: LogAction.AGENDAMENTO_CRIADO,
        descricao: `Agendamento criado: ${data.titulo} para ${data.data.toLocaleDateString()}`
      }
    }).catch(err => console.error('Falha ao criar log de agendamento:', err))

    return agendamento
  }

  /**
   * Atualização Segura (Verifica permissão)
   */
  static async update(id: string, userId: string, cargo: string, data: Partial<CreateAppointmentDTO>) {
    const existing = await prisma.agendamento.findUnique({ where: { id } })
    
    if (!existing) return null // Ou lançar erro específico
    if (existing.responsavelId !== userId && cargo !== Cargo.Gerente) {
      throw new Error('FORBIDDEN') // Será capturado pelo controller ou global handler
    }

    return prisma.agendamento.update({
      where: { id },
      data
    })
  }

  /**
   * Remoção Segura
   */
  static async delete(id: string, userId: string, cargo: string) {
    const existing = await prisma.agendamento.findUnique({ where: { id } })
    
    if (!existing) return null
    if (existing.responsavelId !== userId && cargo !== Cargo.Gerente) {
      throw new Error('FORBIDDEN')
    }

    return prisma.agendamento.delete({ where: { id } })
  }
}