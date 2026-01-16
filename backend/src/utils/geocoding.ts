// backend/src/utils/geocoding.ts
import { cache } from '../lib/cache'

interface GeoResult {
  lat: number
  lng: number
  display_name?: string
}

// Interface para tipar a resposta do Nominatim
interface NominatimResponse {
  lat: string
  lon: string
  display_name: string
  [key: string]: any
}

const GEO_CACHE_TTL = 1000 * 60 * 60 * 24 * 30 // 30 dias (endereços são estáticos)

// Delay para respeitar o Rate Limit do Nominatim (Max 1 req/seg)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function geocodeAddress(
  logradouro: string, 
  ra: string, 
  cidade: string = 'Brasília'
): Promise<GeoResult | null> {
  // 1. Validação Básica
  if (!logradouro || !ra) return null

  // 2. Normalização e Cache (Usando CacheService centralizado para segurança de memória)
  // Prefixo 'geo:' evita colisão com outros caches do sistema
  const cacheKey = `geo:${logradouro.trim().toLowerCase()}|${ra.trim().toLowerCase()}|${cidade.trim().toLowerCase()}`
  
  const cached = cache.get<GeoResult>(cacheKey)
  if (cached) {
    // console.log(`📍 GeoCache Hit: ${cacheKey}`) // Debug
    return cached
  }

  try {
    // 3. Construção da Query
    // Adiciona contexto explícito para melhorar precisão
    const query = `${logradouro}, ${ra}, ${cidade}, Distrito Federal, Brazil`
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`

    // Rate Limiting (Essencial para não ser banido pelo OSM)
    await delay(1100) 

    // 4. Requisição Externa
    const response = await fetch(url, {
      headers: {
        // User-Agent específico é OBRIGATÓRIO pela política de uso do Nominatim
        'User-Agent': 'SistemaCreasBrazlandia/2.1 (admin@creas.df.gov.br)' 
      }
    })

    if (!response.ok) {
      console.warn(`[GeoCoding] Erro na API externa [${response.status}]: ${response.statusText}`)
      return null
    }

    const data = await response.json() as NominatimResponse[]

    if (data && data.length > 0) {
      const result: GeoResult = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        display_name: data[0].display_name
      }

      // 5. Salva no Cache Centralizado (com TTL longo)
      cache.set(cacheKey, result, GEO_CACHE_TTL)

      return result
    }

    return null
  } catch (error) {
    // Log de erro sem travar a aplicação (Feature não-crítica)
    console.error('[GeoCoding] Erro crítico ao buscar coordenadas:', error)
    return null 
  }
}