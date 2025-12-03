// frontend/src/utils/whatsapp.ts
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export type MessageTemplate = 'geral' | 'agendamento' | 'documentos'

export function getWhatsAppLink(phone: string, template: MessageTemplate, data?: any) {
  // 1. Limpar o telefone (deixar apenas números)
  const cleanPhone = phone.replace(/\D/g, '')
  
  // Validação básica
  if (cleanPhone.length < 10) return null

  // Adicionar DDI do Brasil (55) se não tiver
  const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`

  // 2. Definir a mensagem baseada no template
  let message = ''

  switch (template) {
    case 'geral':
      message = `Olá ${data?.nome || ''}, aqui é da equipe do CREAS Brazlândia. Gostaria de falar sobre o seu acompanhamento.`
      break
      
    case 'agendamento':
      const dataStr = data?.date ? format(new Date(data.date), "dd/MM 'às' HH:mm", { locale: ptBR }) : 'breve'
      message = `Olá ${data?.nome || ''}, gostaríamos de confirmar o seu atendimento no CREAS agendado para ${dataStr}. Por favor, confirme o recebimento desta mensagem.`
      break

    case 'documentos':
      message = `Olá ${data?.nome || ''}, precisamos que você compareça ao CREAS para atualizar sua documentação pendente. Poderia nos informar quando é possível vir?`
      break
  }

  // 3. Gerar Link Encode (para caracteres especiais funcionarem na URL)
  return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`
}