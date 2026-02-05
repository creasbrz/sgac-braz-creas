// frontend/src/components/analytics/sections/SocialSection.tsx
import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, CartesianGrid, LabelList, PieChart, Pie, Label, Cell
} from 'recharts'
import { BarChart3, Fingerprint, Users } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  ChartConfig, 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent, 
  ChartLegend, 
  ChartLegendContent 
} from "@/components/ui/chart"

import type { ObservatoryData } from '@/types/case'

// --- UTILS ---

// --- CHART CONFIG ---
const ageChartConfig = {
  value: {
    label: "Usuários",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

// Mapeamento correto para a legenda funcionar automaticamente
const genderChartConfig = {
  value: { label: "Usuários" },
  // As chaves correspondem ao 'configKey' gerado no useMemo
  masculino: {
    label: "Masculino",
    color: "hsl(var(--chart-1))", // Azul
  },
  feminino: {
    label: "Feminino",
    color: "hsl(var(--chart-3))", // Rosa/Roxo
  },
  outros: {
    label: "Outros",
    color: "hsl(var(--muted-foreground))", // Cinza
  }
} satisfies ChartConfig

export function SocialSection({ data }: { data: ObservatoryData }) {

  // Processamento de Dados com Cores e Chaves de Configuração
  const sexData = useMemo(() => {
    return data.sexData.map(item => {
      const nameLower = item.name.toLowerCase()
      let fill = "hsl(var(--muted-foreground))"
      let configKey = "outros" // Chave padrão
      
      if (nameLower.includes('masculino') || nameLower.startsWith('m')) {
        fill = "hsl(var(--chart-1))"
        configKey = "masculino"
      } else if (nameLower.includes('feminino') || nameLower.startsWith('f')) {
        fill = "hsl(var(--chart-3))"
        configKey = "feminino"
      }
      
      // Retornamos 'configKey' para a legenda saber qual label/cor usar
      return { 
        ...item, 
        fill,
        configKey 
      }
    })
  }, [data.sexData])

  const totalUsers = data.sexData.reduce((acc, curr) => acc + curr.value, 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* 1. FAIXA ETÁRIA */}
      <Card className="shadow-sm border-border/60 flex flex-col">
        <CardHeader className="pb-3 border-b border-border/40 bg-muted/5">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
               <BarChart3 className="h-4 w-4 text-primary"/> 
            </div>
            Faixa Etária
          </CardTitle>
          <CardDescription>Distribuição demográfica por idade.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-6 min-h-87.5">
          {data.ageData.length > 0 ? (
            <div className="w-full h-80">
              <ChartContainer config={ageChartConfig} className="w-full h-full">
                <BarChart 
                  accessibilityLayer
                  data={data.ageData} 
                  layout="horizontal"
                  margin={{ left: 0, right: 0, top: 20, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.4}/>
                  <XAxis 
                    dataKey="name" 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={10}
                    fontSize={11}
                    className="text-muted-foreground font-medium"
                    tickFormatter={(val) => val.replace(' anos', '')}
                  />
                  <ChartTooltip 
                    cursor={{fill: 'hsl(var(--muted)/0.2)'}} 
                    content={<ChartTooltipContent indicator="dashed" />} 
                  />
                  <Bar 
                    dataKey="value" 
                    fill="var(--color-value)" 
                    radius={[4, 4, 0, 0]} 
                    barSize={40}
                  >
                    <LabelList 
                      dataKey="value" 
                      position="top" 
                      className="fill-foreground font-bold text-xs" 
                      offset={8}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm opacity-60">
              Sem dados de idade disponíveis.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. GÊNERO */}
      <Card className="shadow-sm border-border/60 flex flex-col">
        <CardHeader className="pb-3 border-b border-border/40 bg-muted/5">
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="p-2 rounded-lg bg-status-info-bg border border-status-info-border">
                   <Fingerprint className="h-4 w-4 text-status-info-fg"/>
                </div>
                Gênero
              </CardTitle>
              <CardDescription>Perfil dos assistidos.</CardDescription>
            </div>
            
            {/* KPI Badge */}
            <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-md border shadow-sm">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                    <span className="text-sm font-bold block leading-none tabular-nums text-foreground">
                        {totalUsers}
                    </span>
                    <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                        Total
                    </span>
                </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-6 min-h-87.5">
          {sexData.length > 0 ? (
            <div className="w-full h-80">
              <ChartContainer config={genderChartConfig} className="mx-auto aspect-square h-full max-h-75">
                <PieChart>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Pie 
                    data={sexData} 
                    dataKey="value" 
                    nameKey="configKey" // [IMPORTANTE] Usa a chave mapeada para ligar ao config
                    innerRadius={70} 
                    outerRadius={105} 
                    strokeWidth={4}
                    paddingAngle={3}
                    stroke="hsl(var(--card))"
                  >
                    {sexData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                    
                    {/* LABEL CENTRALIZADO */}
                    <Label 
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text 
                              x={viewBox.cx} 
                              y={viewBox.cy} 
                              textAnchor="middle" 
                              dominantBaseline="middle"
                            >
                              <tspan 
                                x={viewBox.cx} 
                                y={viewBox.cy} 
                                dy="-0.5em"
                                className="fill-foreground text-3xl font-bold tracking-tighter"
                              >
                                {totalUsers}
                              </tspan>
                              <tspan 
                                x={viewBox.cx} 
                                y={viewBox.cy} 
                                dy="1.7em"
                                className="fill-muted-foreground text-xs font-semibold uppercase tracking-widest"
                              >
                                USUÁRIOS
                              </tspan>
                            </text>
                          )
                        }
                      }}
                    />
                  </Pie>
                  
                  {/* LEGENDA */}
                  <ChartLegend 
                    content={<ChartLegendContent nameKey="configKey" />} 
                    className="-translate-y-2 flex-wrap gap-3 justify-center mt-6" 
                  />
                </PieChart>
              </ChartContainer>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm opacity-60">
              Sem dados de gênero disponíveis.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}