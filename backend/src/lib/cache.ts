// backend/src/lib/cache.ts
import { LRUCache } from 'lru-cache'

/**
 * Serviço de Cache em Memória (Wrapper sobre lru-cache).
 * * ARQUITETURA (Neon/Render):
 * O ambiente do Render é volátil. O cache em memória será perdido em cada deploy 
 * ou reinicialização. Esta implementação usa 'lru-cache' para garantir que o uso 
 * de memória seja limitado (evitando falhas por falta de memória - OOM) e para 
 * gerenciar a expiração (TTL) automaticamente.
 * * NOTA: Para persistência real entre reinicializações, migrar para Redis.
 */
export class CacheService {
  private static instance: CacheService
  
  // LRU Cache substitui o Map nativo para gerenciar memória e TTL automaticamente
  private cache: LRUCache<string, any>

  private constructor() {
    this.cache = new LRUCache({
      max: 500, // Limite de segurança para proteger a RAM do container (Plano Free/Starter)
      ttl: 1000 * 60 * 5, // TTL Padrão: 5 minutos
      allowStale: false,
    })
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService()
    }
    return CacheService.instance
  }

  /**
   * Recupera um valor do cache.
   * @param key Chave única
   */
  public get<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined
  }

  /**
   * Salva um valor no cache.
   * @param key Chave única
   * @param data Dados a serem salvos
   * @param ttlMs Tempo de vida opcional em ms (se omitido, usa o padrão do construtor)
   */
  public set<T>(key: string, data: T, ttlMs?: number): void {
    this.cache.set(key, data, { ttl: ttlMs })
  }

  /**
   * Invalida chaves que começam com um prefixo.
   * Útil para limpar "stats_*" ou "reports_*" quando dados mudam.
   */
  public invalidate(keyPrefix: string): void {
    // Itera sobre as chaves para remover as que correspondem ao prefixo.
    // Seguro em produção pois o 'max' é limitado, evitando bloqueio do Event Loop.
    for (const key of this.cache.keys()) {
      if (key.startsWith(keyPrefix)) {
        this.cache.delete(key)
      }
    }
  }
  
  public clearAll(): void {
    this.cache.clear()
  }
}

export const cache = CacheService.getInstance()