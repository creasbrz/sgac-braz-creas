// backend/src/utils/geocoding.ts

interface GeoResult {
  lat: number
  lng: number
  display_name?: string
}

// Cache em memória simples para evitar bans do Nominatim
// Formato: Map<"endereco_normalizado", {data, timestamp}>
const geoCache = new Map<string, { data: GeoResult, timestamp: number }>()
const CACHE_TTL = 1000 * 60 * 60 * 24 * 30 // 30 dias de cache (endereços raramente mudam)

// Pequeno delay para evitar Rate Limiting (1 req/seg é o limite seguro do Nominatim)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function geocodeAddress(
  logradouro: string, 
  ra: string, 
  cidade: string = 'Brasília'
): Promise<GeoResult | null> {
  // 1. Normalização e Verificação de Cache
  if (!logradouro || !ra) return null;

  const cacheKey = `${logradouro.trim().toLowerCase()}|${ra.trim().toLowerCase()}|${cidade.trim().toLowerCase()}`;
  const cached = geoCache.get(cacheKey);

  if (cached) {
    const isExpired = (Date.now() - cached.timestamp) > CACHE_TTL;
    if (!isExpired) {
      // console.log(`📍 GeoCache Hit: ${logradouro}`); // Descomente para debug
      return cached.data;
    }
    geoCache.delete(cacheKey);
  }

  try {
    // 2. Construção da Query
    // Adiciona "Distrito Federal" explicitamente para evitar ambiguidade
    const query = `${logradouro}, ${ra}, ${cidade}, Distrito Federal, Brazil`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;

    // Delay preventivo antes da chamada externa
    await delay(1100); 

    // 3. Requisição
    const response = await fetch(url, {
      headers: {
        // User-Agent descritivo é OBRIGATÓRIO para não ser bloqueado
        'User-Agent': 'SistemaCreasBrazlandia/2.1 (admin@creas.df.gov.br)' 
      }
    });

    if (!response.ok) {
      console.warn(`GeoError [${response.status}]: ${response.statusText}`);
      return null;
    }

    const data = await response.json() as any[];

    if (data && data.length > 0) {
      const result: GeoResult = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        display_name: data[0].display_name
      };

      // 4. Salva no Cache
      geoCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    }

    return null;
  } catch (error) {
    console.error('Erro crítico no serviço de geocodificação:', error);
    return null; // Falha silenciosa segura
  }
}