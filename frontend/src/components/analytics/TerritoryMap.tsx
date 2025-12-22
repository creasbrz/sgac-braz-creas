// frontend/src/components/analytics/TerritoryMap.tsx
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

interface MapPoint {
  id: string
  lat: number
  lng: number
  intensity: number
  label: string
}

interface TerritoryMapProps {
  data: MapPoint[]
}

export function TerritoryMap({ data }: TerritoryMapProps) {
  // Centro de Brazlândia
  const center: [number, number] = [-15.668, -48.201]

  const getColor = (intensity: number) => {
    if (intensity >= 4) return '#ef4444' // Red (Gravíssima)
    if (intensity === 3) return '#f97316' // Orange
    if (intensity === 2) return '#eab308' // Yellow
    return '#10b981' // Green
  }

  return (
    // CORREÇÃO AQUI: Mudamos de h-[400px] para h-full para ele preencher o pai (750px)
    <div className="h-full w-full rounded-xl overflow-hidden border shadow-sm z-0 relative">
      <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {data.map((point) => (
          <CircleMarker
            key={point.id}
            center={[point.lat, point.lng]}
            radius={point.intensity * 4 + 2} // Aumentei um pouco o raio para melhor visualização
            pathOptions={{ 
              color: getColor(point.intensity),
              fillColor: getColor(point.intensity),
              fillOpacity: 0.6,
              weight: 1
            }}
          >
            <Tooltip>{point.label}</Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
      
      {/* Legenda Flutuante */}
      <div className="absolute bottom-4 right-4 bg-white/95 dark:bg-slate-900/90 p-3 rounded-lg shadow-lg text-xs z-[1000] border border-border">
        <div className="font-bold mb-2 text-sm">Nível de Risco</div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></span> 
            <span>Extremo / Imediato</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500 shadow-sm"></span> 
            <span>Alto Risco</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm"></span> 
            <span>Médio / Atenção</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></span> 
            <span>Baixo / Monitoramento</span>
          </div>
        </div>
      </div>
    </div>
  )
}