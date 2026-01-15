import { useState, useMemo } from 'react'
import { MapPin, Filter, X } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TerritoryMap, type MapPoint } from '@/components/analytics/TerritoryMap'

interface TerritorySectionProps {
  mapData: MapPoint[]
}

export function TerritorySection({ mapData }: TerritorySectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedIntensity, setSelectedIntensity] = useState<string>('all')

  // Deduplicate categories
  const categories = useMemo(() => {
    const allCats = mapData.map(p => p.categoria).filter(Boolean) as string[]
    return Array.from(new Set(allCats)).sort()
  }, [mapData])

  // Filter data
  const filteredData = useMemo(() => {
    return mapData.filter(point => {
      const matchCat = selectedCategory === 'all' || point.categoria === selectedCategory
      const matchInt = selectedIntensity === 'all' || String(point.intensity) === selectedIntensity
      return matchCat && matchInt
    })
  }, [mapData, selectedCategory, selectedIntensity])

  const hasActiveFilters = selectedCategory !== 'all' || selectedIntensity !== 'all'

  const clearFilters = () => {
    setSelectedCategory('all')
    setSelectedIntensity('all')
  }

  return (
    <Card className="flex flex-col h-[600px] border shadow-sm overflow-hidden">
      <CardHeader className="pb-4 border-b bg-muted/20 px-6 py-4">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <MapPin className="h-5 w-5 text-primary" />
              Territorialização
            </CardTitle>
            <CardDescription>
              Distribuição geoespacial dos casos ativos ({filteredData.length} exibidos)
            </CardDescription>
          </div>
          
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 p-1 bg-background/50 border rounded-lg shadow-sm">
              <div className="px-2 text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
              </div>
              
              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-8 w-[160px] border-0 focus:ring-0 shadow-none bg-transparent">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="w-px h-4 bg-border" />

              {/* Risk Filter */}
              <Select value={selectedIntensity} onValueChange={setSelectedIntensity}>
                <SelectTrigger className="h-8 w-[130px] border-0 focus:ring-0 shadow-none bg-transparent">
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

            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5 mr-1" /> Limpar
              </Button>
            )}
            
            <Badge variant="secondary" className="h-8 px-3 font-normal text-muted-foreground">
              Total: {mapData.length}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 relative">
        <TerritoryMap data={filteredData} />
        
        {/* Empty State Overlay */}
        {filteredData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
            <div className="text-center p-6 bg-background rounded-xl border shadow-lg">
              <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm font-medium">Nenhum caso encontrado nesta área/filtro.</p>
              <Button variant="link" size="sm" onClick={clearFilters} className="mt-2 h-auto p-0">
                Limpar filtros
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}