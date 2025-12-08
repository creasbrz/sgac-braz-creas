// backend/src/lib/cache.ts

type CacheEntry<T> = {
  data: T
  timestamp: number
}

/**
 * Serviço de Cache em Memória (Singleton).
 * Projetado para ser substituído por Redis no futuro sem quebrar o código.
 */
export class CacheService {
  private static instance: CacheService
  private store: Map<string, CacheEntry<any>> = new Map()

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService()
    }
    return CacheService.instance
  }

  /**
   * Recupera um valor do cache se não tiver expirado.
   * @param key Chave única
   * @param ttlMs Tempo de vida em milissegundos (Padrão: 5 min)
   */
  public get<T>(key: string, ttlMs: number = 5 * 60 * 1000): T | null {
    const entry = this.store.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > ttlMs) {
      this.store.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Salva um valor no cache.
   */
  public set<T>(key: string, data: T): void {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  /**
   * Invalida chaves que começam com um prefixo.
   * Útil para limpar "stats_*" quando um novo caso é criado.
   */
  public invalidate(keyPrefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(keyPrefix)) {
        this.store.delete(key)
      }
    }
  }
  
  public clearAll(): void {
    this.store.clear()
  }
}

export const cache = CacheService.getInstance()