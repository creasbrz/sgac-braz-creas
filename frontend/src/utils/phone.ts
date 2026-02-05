// frontend/src/utils/phone.ts

/**
 * Valida se um número de telefone brasileiro segue as regras da ANATEL.
 * Suporta Telefonia Fixa (10 dígitos) e Móvel (11 dígitos).
 * * @param phone O número de telefone (com ou sem máscara/formatação)
 * @returns true se for um número válido, false caso contrário.
 */
export function isValidBrazilianPhone(phone?: string | null): boolean {
  if (!phone) return false

  // 1. Remove caracteres não numéricos
  const digits = phone.replace(/\D/g, "")

  // 2. Validação de comprimento (10 = Fixo, 11 = Celular)
  if (digits.length !== 10 && digits.length !== 11) return false

  // 3. Verifica se todos os dígitos são iguais (ex: 88888888888)
  // Isso é um erro comum de preenchimento de formulário.
  if (/^(\d)\1+$/.test(digits)) return false

  // 4. Validação do DDD (Dois primeiros dígitos)
  const ddd = parseInt(digits.substring(0, 2))
  // O Brasil não possui DDDs menores que 11 ou maiores que 99
  if (ddd < 11 || ddd > 99) return false

  // 5. Validação Específica por Tipo
  if (digits.length === 11) {
    // Celular: Obrigatoriamente começa com 9 após o DDD
    // Ex: 61 9XXXX-XXXX
    return digits[2] === '9'
  } else {
    // Fixo: Geralmente começa com 2, 3, 4 ou 5 após o DDD
    // Ex: 61 3XXX-XXXX
    const firstDigit = parseInt(digits[2])
    return firstDigit >= 2 && firstDigit <= 5
  }
}