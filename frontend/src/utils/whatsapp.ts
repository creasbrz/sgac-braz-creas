// frontend/src/utils/whatsapp.ts
import { format, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"

// --- TIPOS DE DADOS ---

export type WhatsAppTemplateType = 
  | 'geral' 
  | 'agendamento' 
  | 'documentos' 
  | 'busca_ativa' 
  | 'grupo'

interface BaseData {
  nome: string
}

interface AppointmentData extends BaseData {
  data: string | Date
  tecnico?: string
}

interface GroupData extends BaseData {
  atividade: string
  data: string | Date
  local?: string
}

interface DocData extends BaseData {
  lista?: string[] // Ex: ['RG', 'CPF', 'Comprovante']
}

// Union Type para garantir tipagem no consumo da função
export type TemplateData = BaseData | AppointmentData | GroupData | DocData

// --- GERADORES DE MENSAGEM ---

const formatMsgDate = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date
  return isValid(d) ? format(d, "dd/MM 'às' HH:mm", { locale: ptBR }) : 'data a confirmar'
}

const TEMPLATES: Record<WhatsAppTemplateType, (data: any) => string> = {
  geral: (d: BaseData) => 
    `Olá, *${d.nome}*.\n\nAqui é da equipe do *CREAS Brazlândia*. Gostaria de falar brevemente sobre o seu acompanhamento.\n\nPodemos conversar agora?`,

  agendamento: (d: AppointmentData) => 
    `Olá, *${d.nome}*.\n\nGostaríamos de confirmar seu atendimento no CREAS agendado para:\n📅 *${formatMsgDate(d.data)}*\n${d.tecnico ? `👤 Técnico: ${d.tecnico}` : ''}\n\nPor favor, confirme o recebimento desta mensagem ou nos avise caso não possa comparecer.`,

  documentos: (d: DocData) => {
    const docs = d.lista && d.lista.length > 0 ? `\nFaltam: ${d.lista.join(', ')}` : ''
    return `Olá, *${d.nome}*.\n\nPrecisamos que você compareça ao CREAS para atualizar sua documentação pendente.${docs}\n\nQual o melhor dia para você vir trazer esses documentos?`
  },

  busca_ativa: (d: BaseData) => 
    `Olá, *${d.nome}*.\n\nSomos do *CREAS Brazlândia*. Estamos tentando contato telefônico sem sucesso.\n\nÉ muito importante que você entre em contato conosco ou venha à unidade para regularizar sua situação. Estamos à disposição.`,

  grupo: (d: GroupData) => 
    `Olá, *${d.nome}*.\n\nConvidamos você para participar da nossa atividade coletiva:\n✨ *${d.atividade}*\n📅 *${formatMsgDate(d.data)}*\n📍 Local: ${d.local || 'Sede do CREAS'}\n\nSua presença é fundamental! Podemos contar com você?`
}

// --- FUNÇÃO PRINCIPAL ---

/**
 * Gera um link deep-link para o WhatsApp com mensagem pré-formatada.
 * Valida o telefone e formata a mensagem com base no template escolhido.
 */
export function getWhatsAppLink(
  phone: string | null | undefined, 
  template: WhatsAppTemplateType, 
  data: TemplateData
): string | null {
  // 1. Limpeza e Validação
  if (!phone) return null
  
  const cleanPhone = phone.replace(/\D/g, '')
  
  // Aceita 10 (Fixo com DDD) ou 11 (Celular com DDD) dígitos
  if (cleanPhone.length < 10 || cleanPhone.length > 11) return null

  // 2. Formatação DDI + DDD
  // Se não tiver 55 (Brasil), adiciona.
  const finalPhone = cleanPhone.startsWith('55') && cleanPhone.length > 11 
    ? cleanPhone 
    : `55${cleanPhone}`

  // 3. Geração da Mensagem
  const generator = TEMPLATES[template]
  if (!generator) return null

  const message = generator(data)

  // 4. Retorno do Link (API Oficial)
  return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`
}