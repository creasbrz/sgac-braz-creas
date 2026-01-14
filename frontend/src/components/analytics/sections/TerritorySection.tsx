import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { MapPin, Filter } from 'lucide-react'
import { TerritoryMap, type MapPoint } from '@/components/analytics/TerritoryMap'

interface TerritorySectionProps {
  mapData: MapPoint[]
}

export function TerritorySection({ mapData }: TerritorySectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedIntensity, setSelectedIntensity] = useState<string>('all')

  // 1. Extrair categorias ÚNICAS para o filtro (Evita erro de chaves duplicadas)
  const categories = useMemo(() => {
    const allCats = mapData.map(p => p.categoria).filter(Boolean) as string[]
    return Array.from(new Set(allCats)).sort() // Remove duplicatas
  }, [mapData])

  // 2. Filtrar dados do mapa
  const filteredData = useMemo(() => {
    return mapData.filter(point => {
      const matchCat = selectedCategory === 'all' || point.categoria === selectedCategory
      const matchInt = selectedIntensity === 'all' || String(point.intensity) === selectedIntensity
      return matchCat && matchInt
    })
  }, [mapData, selectedCategory, selectedIntensity])

  return (
    <Card className="flex flex-col h-[600px] border shadow-sm">
      <CardHeader className="pb-4 border-b bg-muted/20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-primary" />
              Territorialização
            </CardTitle>
            <CardDescription>
              Distribuição geoespacial dos casos ativos ({filteredData.length} exibidos)
            </CardDescription>
          </div>
          
          {/* Filtros */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-background border rounded-md px-2 py-1 shadow-sm">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              
              {/* Filtro de Categoria (Dedupicado) */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-7 w-[130px] border-none shadow-none bg-transparent focus:ring-0 text-xs">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="w-px h-4 bg-border mx-1" />

              {/* Filtro de Risco */}
              <Select value={selectedIntensity} onValueChange={setSelectedIntensity}>
                <SelectTrigger className="h-7 w-[110px] border-none shadow-none bg-transparent focus:ring-0 text-xs">
                  <SelectValue placeholder="Risco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Riscos</SelectItem>
                  <SelectItem value="4">🔴 Extremo</SelectItem>
                  <SelectItem value="3">🟠 Alto</SelectItem>
                  <SelectItem value="2">🟡 Médio</SelectItem>
                  <SelectItem value="1">🟢 Baixo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Badge variant="outline" className="h-9 px-3 bg-background">
              Total: {mapData.length}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 relative">
        <TerritoryMap data={filteredData} />
      </CardContent>
    </Card>
  )
}