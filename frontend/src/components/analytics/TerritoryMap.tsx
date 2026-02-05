// frontend/src/components/analytics/TerritoryMap.tsx
import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink, AlertTriangle, Navigation, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MapPoint {
  id: string
  lat: number
  lng: number
  intensity: number 
  label: string
  violacao?: string
  endereco?: string
  categoria?: string
}

interface TerritoryMapProps {
  data: MapPoint[]
}

// --- CONSTANTES DE ESTILO ---
const RISK_COLORS = {
  4: { hex: '#ef4444', tailwind: 'bg-red-500', border: 'border-red-500', label: 'Extremo' },
  3: { hex: '#f97316', tailwind: 'bg-orange-500', border: 'border-orange-500', label: 'Alto' },
  2: { hex: '#eab308', tailwind: 'bg-yellow-500', border: 'border-yellow-500', label: 'Médio' },
  1: { hex: '#10b981', tailwind: 'bg-emerald-500', border: 'border-emerald-500', label: 'Baixo' },
} as const

// --- SUB-COMPONENTS ---

function MapController({ points }: { points: MapPoint[] }) {
  const map = useMap()

  useEffect(() => {
    if (!points || points.length === 0) return

    const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]))
    
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15)
    } else {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
    }
  }, [points, map])

  return null
}

export function TerritoryMap({ data }: TerritoryMapProps) {
  const defaultCenter: [number, number] = [-15.668, -48.201] // Brasília

  // Helper para abertura segura de link
  const openMapLink = (lat: number, lng: number) => {
    const url = `http://googleusercontent.com/maps.google.com/search/${lat},${lng}`
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer')
    if (newWindow) newWindow.opener = null
  }

  // Empty State
  if (!data || data.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-muted/20 rounded-xl border border-dashed border-border text-muted-foreground gap-3 animate-in fade-in">
        <div className="bg-muted p-4 rounded-full ring-1 ring-border/50">
          <AlertTriangle className="h-6 w-6 opacity-50" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Sem dados georreferenciados</p>
          <p className="text-xs opacity-70 mt-1 max-w-50 mx-auto">
            Nenhum caso com coordenadas para os filtros atuais.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border shadow-sm relative group isolate z-0 bg-slate-50 dark:bg-slate-950">
      <MapContainer 
        center={defaultCenter} 
        zoom={13} 
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          className="transition-all duration-500 ease-in-out dark:filter dark:invert-[1] dark:grayscale-[1] dark:brightness-90 dark:contrast-125"
        />
        
        <MapController points={data} />
        
        {data.map((point) => {
           const risk = RISK_COLORS[point.intensity as keyof typeof RISK_COLORS] || RISK_COLORS[1]
           
           return (
            <CircleMarker
              key={point.id}
              center={[point.lat, point.lng]}
              radius={point.intensity === 4 ? 10 : point.intensity === 3 ? 8 : 6} 
              pathOptions={{ 
                color: 'white', 
                weight: 1.5,
                fillColor: risk.hex,
                fillOpacity: 0.85,
              }}
            >
              <Tooltip 
                direction="top" 
                offset={[0, -10]} 
                opacity={1} 
                className="font-sans text-xs font-semibold rounded-md shadow-sm border-0 px-2 py-1 text-slate-900 bg-white"
              >
                {point.label}
              </Tooltip>
              
              <Popup className="custom-popup-clean" closeButton={false}>
                <div className="flex flex-col gap-2 min-w-50 font-sans p-1 text-slate-900">
                  
                  {/* Header do Popup */}
                  <div className="border-b border-slate-200 pb-2 mb-1">
                    <h5 className="text-sm font-bold leading-tight flex items-start gap-2 text-slate-900">
                      <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      {point.label}
                    </h5>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                            {point.categoria || "Geral"}
                        </span>
                        {point.violacao && (
                            <span className="text-[10px] font-medium bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100">
                                {point.violacao}
                            </span>
                        )}
                    </div>
                  </div>

                  {/* Endereço */}
                  {point.endereco && (
                    <div className="flex items-start gap-1.5 bg-slate-50 p-2 rounded text-xs text-slate-600 border border-slate-100">
                      <Navigation className="h-3 w-3 shrink-0 mt-0.5 opacity-70" />
                      <span className="leading-snug line-clamp-2">{point.endereco}</span>
                    </div>
                  )}

                  {/* Footer com Ações */}
                  <div className="flex items-center justify-between mt-1 pt-1">
                    <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 bg-white shadow-sm font-bold border-slate-200", risk.border)} style={{ color: risk.hex }}>
                      Risco {risk.label}
                    </Badge>
                    
                    <Button 
                      size="sm" 
                      variant="default"
                      className="h-7 text-[10px] px-3 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-sm transition-all active:scale-95"
                      title="Abrir rota no Google Maps"
                      onClick={() => openMapLink(point.lat, point.lng)}
                    >
                      Rotas <ExternalLink className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
      
      {/* Legenda Flutuante */}
      <div className="absolute bottom-6 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-xl shadow-lg border border-border/40 z-400 text-xs transition-all hover:opacity-100">
        <h4 className="font-bold text-foreground mb-2 text-[10px] uppercase tracking-wider opacity-80 border-b pb-1 border-border/50">
          Nível de Risco
        </h4>
        <div className="space-y-1.5">
          {Object.entries(RISK_COLORS).reverse().map(([key, config]) => (
            <div key={key} className="flex items-center gap-2">
              <span 
                className={cn("w-2.5 h-2.5 rounded-full shadow-sm ring-1 ring-inset ring-black/10", config.tailwind)} 
              /> 
              <span className="text-muted-foreground font-medium">{config.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}