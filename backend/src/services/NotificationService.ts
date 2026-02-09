// backend/src/services/NotificationService.ts
import { prisma } from '../lib/prisma'

interface EmailPayload {
  to: string
  subject: string
  body: string
}

export class NotificationService {
  /**
   * Envia notificação por e-mail para o assistido.
   * Atualmente loga no console (Dry Run), pronto para integração SMTP.
   */
  static async sendEmail({ to, subject, body }: EmailPayload) {
    if (!to || !to.includes('@')) {
      console.warn(`[Notification] Tentativa de envio para e-mail inválido: ${to}`)
      return
    }

    // TODO: Integrar com Nodemailer / AWS SES / SendGrid aqui
    console.log(`\n📨 [MOCK EMAIL] Para: ${to}`)
    console.log(`   Assunto: ${subject}`)
    console.log(`   Corpo: ${body}\n`)
    
    // Log de auditoria interno (opcional, mas recomendado)
    // Poderíamos criar uma tabela 'NotificationLog' futuramente
  }

  /**
   * Notifica sobre agendamento
   */
  static async notifyAppointment(caseId: string, date: Date, type: string) {
    const caso = await prisma.case.findUnique({
      where: { id: caseId },
      select: { email: true, nomeCompleto: true }
    })

    if (caso?.email) {
      const dateStr = date.toLocaleDateString('pt-BR')
      const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      
      await this.sendEmail({
        to: caso.email,
        subject: `Lembrete de Atendimento - CREAS Brazlândia`,
        body: `Olá, ${caso.nomeCompleto}.\n\nLembramos do seu agendamento (${type}) confirmado para o dia ${dateStr} às ${timeStr}.\n\nCaso não possa comparecer, por favor entre em contato.`
      })
    }
  }

  /**
   * Notifica inclusão em grupo
   */
  static async notifyGroupInclusion(caseId: string, groupName: string, date: Date) {
    const caso = await prisma.case.findUnique({
      where: { id: caseId },
      select: { email: true, nomeCompleto: true }
    })

    if (caso?.email) {
       const dateStr = date.toLocaleDateString('pt-BR')
       await this.sendEmail({
        to: caso.email,
        subject: `Convite para Atividade - ${groupName}`,
        body: `Olá, ${caso.nomeCompleto}.\n\nVocê foi inscrito na atividade "${groupName}" que acontecerá em ${dateStr}.\nSua presença é muito importante!`
      })
    }
  }
}