// @ts-nocheck
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export interface MapPoint {
  id: string
  lat: number
  lng: number
  intensity: number // 1 (Baixo) a 4 (Extremo)
  label: string
  violacao?: string // Opcional, para detalhar no popup
}

interface TerritoryMapProps {
  data: MapPoint[]
}

export function TerritoryMap({ data }: TerritoryMapProps) {
  // Centro geográfico aproximado de Brazlândia-DF
  const center: [number, number] = [-15.668, -48.201]

  const getColor = (intensity: number) => {
    if (intensity >= 4) return '#ef4444' // Red (Extremo)
    if (intensity === 3) return '#f97316' // Orange (Alto)
    if (intensity === 2) return '#eab308' // Yellow (Médio)
    return '#10b981' // Green (Baixo)
  }

  // Verifica se há dados antes de renderizar para evitar mapa vazio confuso
  if (!data || data.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed text-slate-400">
        <span className="text-sm">Nenhum dado georreferenciado disponível para o período.</span>
      </div>
    )
  }

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border shadow-sm z-0 relative bg-slate-100">
      <MapContainer 
        center={center} 
        zoom={13} 
        scrollWheelZoom={false} // Evita scroll acidental na página
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {data.map((point) => (
          <CircleMarker
            key={point.id}
            center={[point.lat, point.lng]}
            radius={point.intensity * 3 + 4} // Fórmula ajustada para tamanho visual
            pathOptions={{ 
              color: getColor(point.intensity),
              fillColor: getColor(point.intensity),
              fillOpacity: 0.6,
              weight: 1
            }}
          >
            {/* Tooltip aparece no hover */}
            <Tooltip sticky>{point.label}</Tooltip>
            
            {/* Popup aparece no click (útil para detalhes) */}
            <Popup>
              <div className="p-1 min-w-[150px]">
                <strong className="block text-sm text-slate-800 mb-1">
                  {point.violacao || "Ocorrência"}
                </strong>
                <span className="text-xs text-slate-500 block">
                  Caso: {point.label}
                </span>
                <span 
                  className="text-[10px] font-bold mt-2 inline-block px-1.5 py-0.5 rounded text-white"
                  style={{ backgroundColor: getColor(point.intensity) }}
                >
                  NÍVEL {point.intensity}
                </span>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      
      {/* Legenda Flutuante Otimizada */}
      <div className="absolute bottom-6 right-6 bg-white/95 dark:bg-slate-900/95 p-3 rounded-lg shadow-xl text-xs z-[1000] border border-slate-200 dark:border-slate-800 backdrop-blur-sm">
        <div className="font-bold mb-2 text-sm text-slate-700 dark:text-slate-200">Mapa de Calor (Risco)</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm ring-1 ring-red-200"></span> 
            <span className="text-slate-600 dark:text-slate-400">Urgência Imediata</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500 shadow-sm ring-1 ring-orange-200"></span> 
            <span className="text-slate-600 dark:text-slate-400">Alto Risco</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm ring-1 ring-yellow-200"></span> 
            <span className="text-slate-600 dark:text-slate-400">Atenção</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm ring-1 ring-emerald-200"></span> 
            <span className="text-slate-600 dark:text-slate-400">Acompanhamento</span>
          </div>
        </div>
      </div>
    </div>
  )
}