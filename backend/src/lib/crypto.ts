// backend/src/lib/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// A chave deve ter 32 bytes (64 caracteres hexadecimais)
const ALGORITHM = 'aes-256-gcm'
const SECRET_KEY = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex')

if (SECRET_KEY.length !== 32) {
  throw new Error('FATAL: ENCRYPTION_KEY inválida. Deve ser uma string hex de 32 bytes.')
}

export class CryptoService {
  /**
   * Criptografa um texto sensível.
   * Retorna formato: iv:authTag:encryptedData
   */
  static encrypt(text: string | null | undefined): string | null {
    if (!text) return null

    const iv = randomBytes(16) // Vetor de Inicialização
    const cipher = createCipheriv(ALGORITHM, SECRET_KEY, iv)

    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag().toString('hex')

    return `${iv.toString('hex')}:${authTag}:${encrypted}`
  }

  /**
   * Descriptografa um texto.
   * Retorna null se falhar ou se o dado não estiver criptografado.
   */
  static decrypt(encryptedText: string | null | undefined): string | null {
    if (!encryptedText) return null
    
    // Verifica se o formato é válido (iv:tag:content)
    const parts = encryptedText.split(':')
    if (parts.length !== 3) return encryptedText // Assume que não está criptografado (migração gradual)

    try {
      const [ivHex, authTagHex, contentHex] = parts
      
      const decipher = createDecipheriv(
        ALGORITHM, 
        SECRET_KEY, 
        Buffer.from(ivHex, 'hex')
      )
      
      decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))

      let decrypted = decipher.update(contentHex, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted
    } catch (error) {
      console.error('[Crypto] Falha na descriptografia:', error)
      return null // Ou lança erro, dependendo da criticidade
    }
  }
}