export function isValidBrazilianPhone(phone?: string | null): boolean {
  if (!phone) return false
  const digits = phone.replace(/\D/g, "")
  // Aceita fixo (10) e celular (11) com DDD
  return digits.length >= 10 && digits.length <= 11
}