// frontend/src/components/analytics/TerritoryMap.tsx
import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink, AlertTriangle } from 'lucide-react'

// Interface alinhada com o que o Backend pode fornecer
export interface MapPoint {
  id: string
  lat: number
  lng: number
  intensity: number // 1 a 4 (Peso da Urgência)
  label: string     // Nome do Usuário
  violacao?: string // Tipo de Violação
  endereco?: string // Endereço legível
  categoria?: string // Adicionado para suportar os filtros da Section
}

interface TerritoryMapProps {
  data: MapPoint[]
}

// Sub-componente para ajustar o zoom automaticamente aos pontos
function MapController({ points }: { points: MapPoint[] }) {
  const map = useMap()

  useEffect(() => {
    if (points.length > 0) {
      // Cria limites baseados nos pontos
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]))
      // Ajusta o mapa para caber todos os pontos com uma margem (padding)
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
    }
  }, [points, map])

  return null
}

export function TerritoryMap({ data }: TerritoryMapProps) {
  // Centro padrão (Brazlândia - DF) caso não haja dados ou geolocalização inicial
  const defaultCenter: [number, number] = [-15.668, -48.201]

  const getColor = (intensity: number) => {
    if (intensity >= 4) return '#ef4444' // Vermelho (Crítico)
    if (intensity === 3) return '#f97316' // Laranja (Alto)
    if (intensity === 2) return '#eab308' // Amarelo (Médio)
    return '#10b981' // Verde (Baixo/Monitoramento)
  }

  const getRadius = (intensity: number) => {
    // Pontos mais críticos ficam maiores visualmente
    return intensity === 4 ? 12 : intensity === 3 ? 10 : 8
  }

  // Fallback visual para mapa vazio
  if (!data || data.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-muted/20 rounded-xl border-2 border-dashed border-muted text-muted-foreground gap-2">
        <div className="bg-muted p-3 rounded-full">
          <AlertTriangle className="h-6 w-6 opacity-50" />
        </div>
        <span className="text-sm font-medium">Nenhum dado georreferenciado neste período.</span>
      </div>
    )
  }

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border shadow-sm z-0 relative bg-muted group">
      <MapContainer 
        center={defaultCenter} 
        zoom={13} 
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        {/* Tiles do CartoDB (Visual Clean para Dashboards) */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {/* Controlador de Zoom Automático */}
        <MapController points={data} />
        
        {data.map((point) => (
          <CircleMarker
            key={point.id}
            center={[point.lat, point.lng]}
            radius={getRadius(point.intensity)} 
            pathOptions={{ 
              color: 'white', // Borda branca para destacar
              weight: 1.5,
              fillColor: getColor(point.intensity),
              fillOpacity: 0.8,
            }}
          >
            {/* Tooltip rápido */}
            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
              <span className="font-semibold text-xs">{point.label}</span>
            </Tooltip>
            
            {/* Detalhes completos */}
            <Popup>
              <div className="flex flex-col gap-2 min-w-[180px]">
                <div>
                  <strong className="text-sm font-bold text-foreground line-clamp-1">
                    {point.label}
                  </strong>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {point.violacao || "Não especificada"}
                  </span>
                </div>

                {point.endereco && (
                  <div className="text-xs text-muted-foreground bg-muted/50 p-1.5 rounded border">
                    {point.endereco}
                  </div>
                )}

                <div className="flex items-center justify-between mt-1">
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-background shadow-none" style={{ borderColor: getColor(point.intensity), color: getColor(point.intensity) }}>
                    Nível {point.intensity}
                  </Badge>
                  
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 w-6 p-0 hover:bg-muted"
                    title="Abrir no Google Maps"
                    onClick={() => window.open(`https://www.google.com/maps?q=${point.lat},${point.lng}`, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary" />
                  </Button>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      
      {/* Legenda Flutuante */}
      <div className="absolute bottom-5 right-5 bg-background/90 backdrop-blur-md p-3 rounded-lg shadow-lg border border-border/50 z-[1000] text-xs transition-opacity opacity-80 hover:opacity-100">
        <h4 className="font-bold text-foreground mb-2 border-b pb-1">Intensidade de Risco</h4>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm ring-2 ring-red-100"></span> 
            <span className="text-muted-foreground">Extremo (4)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm ring-2 ring-orange-100"></span> 
            <span className="text-muted-foreground">Alto (3)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-sm ring-2 ring-yellow-100"></span> 
            <span className="text-muted-foreground">Médio (2)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm ring-2 ring-emerald-100"></span> 
            <span className="text-muted-foreground">Baixo (1)</span>
          </div>
        </div>
      </div>
    </div>
  )
}