// frontend/src/components/analytics/sections/SocialSection.tsx
import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, PieChart, Pie, Label, Cell
} from 'recharts'
import { Users, BarChart3 } from 'lucide-react'

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

// --- CHART CONFIG ---
const ageChartConfig = {
  value: {
    label: "Usuários",
    color: "hsl(var(--chart-1))", // Primary/Blue
  },
} satisfies ChartConfig

const genderChartConfig = {
  value: {
    label: "Usuários",
  },
  male: {
    label: "Masculino",
    color: "hsl(var(--chart-1))", // Blue
  },
  female: {
    label: "Feminino",
    color: "hsl(var(--chart-3))", // Pink/Rose
  },
  other: {
    label: "Outros/NI",
    color: "hsl(var(--muted-foreground))", // Gray
  }
} satisfies ChartConfig

// --- MAIN COMPONENT ---
export function SocialSection({ data }: { data: ObservatoryData }) {

  // Process Gender Data with Theming
  const sexData = useMemo(() => {
    return data.sexData.map(item => {
      const name = item.name.toLowerCase()
      // Usando variáveis CSS HSL para consistência
      let fill = "hsl(var(--muted-foreground))" // Default fallback (Cinza)
      
      if (name.includes('masculino') || name.startsWith('m')) fill = "hsl(var(--chart-1))" // Azul
      else if (name.includes('feminino') || name.startsWith('f')) fill = "hsl(var(--chart-3))" // Rosa
      
      return { ...item, fill }
    })
  }, [data.sexData])

  const totalUsers = data.sexData.reduce((acc, curr) => acc + curr.value, 0)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* 1. FAIXA ETÁRIA (Bar Chart Horizontal) */}
      <Card className="shadow-sm border-border/60 flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary"/> Faixa Etária
          </CardTitle>
          <CardDescription>Distribuição dos usuários por idade.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-[350px]">
          {data.ageData.length > 0 ? (
            // [CORREÇÃO] min-h explícito para evitar warning de width
            <div className="w-full h-[350px]">
              <ChartContainer config={ageChartConfig} className="w-full h-full">
                <BarChart 
                  accessibilityLayer
                  data={data.ageData} 
                  layout="vertical" 
                  margin={{ left: 0, right: 30, top: 10, bottom: 0 }}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" strokeOpacity={0.4}/>
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
                  />
                  <ChartTooltip 
                    cursor={{fill: 'hsl(var(--muted)/0.2)'}} 
                    content={<ChartTooltipContent indicator="dashed" />} 
                  />
                  <Bar 
                    dataKey="value" 
                    fill="var(--color-value)" 
                    radius={[0, 4, 4, 0]} 
                    barSize={24}
                  >
                    <LabelList 
                      dataKey="value" 
                      position="right" 
                      className="fill-foreground font-bold text-xs" 
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

      {/* 2. GÊNERO (Donut Chart) */}
      <Card className="shadow-sm border-border/60 flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500"/> Gênero
              </CardTitle>
              <CardDescription>Perfil demográfico.</CardDescription>
            </div>
            <div className="text-right bg-muted/20 px-3 py-1 rounded-lg border border-border/30">
               <span className="text-2xl font-bold block leading-none tabular-nums">{totalUsers}</span>
               <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-[350px]">
          {sexData.length > 0 ? (
            // [CORREÇÃO] min-h explícito
            <div className="w-full h-[350px]">
              <ChartContainer config={genderChartConfig} className="mx-auto aspect-square max-h-[350px]">
                <PieChart>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Pie 
                    data={sexData} 
                    dataKey="value" 
                    nameKey="name" 
                    innerRadius={75} 
                    strokeWidth={4}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {sexData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                    <Label 
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">
                                {totalUsers}
                              </tspan>
                              <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground text-xs">
                                USUÁRIOS
                              </tspan>
                            </text>
                          )
                        }
                      }}
                    />
                  </Pie>
                  {/* [CORREÇÃO] Adicionado payload={[]} para satisfazer o TypeScript no Recharts v3 */}
                  <ChartLegend 
                    content={<ChartLegendContent nameKey="name" payload={[]} />} 
                    className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center" 
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