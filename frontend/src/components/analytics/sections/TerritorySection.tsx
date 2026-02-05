// frontend/src/components/analytics/sections/TerritorySection.tsx
import { useState, useMemo } from 'react'
import { MapPin, Filter, X, Globe2 } from 'lucide-react'

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

  // Deduplicação de categorias (Memoized)
  const categories = useMemo(() => {
    const allCats = mapData.map(p => p.categoria).filter(Boolean) as string[]
    return Array.from(new Set(allCats)).sort()
  }, [mapData])

  // Lógica de Filtragem
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
    // Altura fixa de 600px (37.5rem)
    <Card className="flex flex-col h-150 border shadow-sm overflow-hidden bg-background group/map-section">
      <CardHeader className="pb-3 border-b border-border/40 bg-muted/10 px-6 py-4 space-y-4 md:space-y-0">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          
          {/* TÍTULO E DESCRIÇÃO */}
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Globe2 className="h-5 w-5 text-primary" />
              Territorialização
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              Distribuição geoespacial ativa
              <Badge 
                variant="outline" 
                className={`h-5 px-1.5 text-[10px] font-normal transition-colors ${hasActiveFilters ? 'bg-primary/10 text-primary border-primary/20' : 'text-muted-foreground'}`}
              >
                {filteredData.length} pontos
              </Badge>
            </CardDescription>
          </div>
          
          {/* BARRA DE CONTROLE UNIFICADA */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Input Group: Agrupamento visual dos filtros */}
            <div className="flex items-center p-1 bg-background border rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-ring/20 transition-shadow">
              
              <div className="pl-2 pr-1 text-muted-foreground/50">
                <Filter className="h-3.5 w-3.5" />
              </div>

              {/* Filtro: Categoria */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-8 w-40 border-0 focus:ring-0 shadow-none bg-transparent hover:bg-muted/50 rounded-sm px-2 text-xs font-medium focus:bg-accent">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="all" className="font-medium text-muted-foreground">Todas as Categorias</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Separador Vertical */}
              <div className="h-4 w-px bg-border mx-1" />

              {/* Filtro: Risco (Com indicadores visuais) */}
              <Select value={selectedIntensity} onValueChange={setSelectedIntensity}>
                <SelectTrigger className="h-8 w-32 border-0 focus:ring-0 shadow-none bg-transparent hover:bg-muted/50 rounded-sm px-2 text-xs font-medium focus:bg-accent">
                  <SelectValue placeholder="Risco" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="all" className="text-muted-foreground">Todos</SelectItem>
                  <SelectItem value="4">
                    <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500"/> Extremo</span>
                  </SelectItem>
                  <SelectItem value="3">
                      <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-orange-500"/> Alto</span>
                  </SelectItem>
                  <SelectItem value="2">
                      <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-yellow-500"/> Médio</span>
                  </SelectItem>
                  <SelectItem value="1">
                      <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500"/> Baixo</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botão Limpar (Condicional com Animação) */}
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="h-9 px-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors animate-in fade-in zoom-in-95 duration-200"
              >
                <X className="h-4 w-4 mr-1" />
                <span className="text-xs font-medium">Limpar</span>
              </Button>
            )}
            
          </div>
        </div>
      </CardHeader>
      
      {/* ÁREA DO MAPA */}
      <CardContent className="p-0 flex-1 relative isolate">
        <TerritoryMap data={filteredData} />
        
        {/* Empty State Overlay (Backdrop Blur) */}
        {filteredData.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] z-50 animate-in fade-in duration-300">
            <div className="flex flex-col items-center text-center p-6 max-w-sm bg-card/90 border shadow-lg rounded-xl">
              <div className="bg-muted p-3 rounded-full mb-3">
                 <MapPin className="h-6 w-6 text-muted-foreground opacity-50" />
              </div>
              <p className="text-sm font-semibold text-foreground">Nenhum caso encontrado</p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                Não há registros para os filtros selecionados nesta região.
              </p>
              <Button variant="outline" size="sm" onClick={clearFilters} className="h-8 text-xs">
                Limpar filtros
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}