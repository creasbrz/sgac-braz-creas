// frontend/src/components/analytics/sections/SocialSection.tsx
import { useMemo } from 'react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LabelList 
} from 'recharts'
import { Users, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { ObservatoryData } from '@/utils/pdfGenerator'

// --- TOOLTIP CUSTOMIZADO ---
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border shadow-md rounded-lg p-2 text-popover-foreground text-xs">
        <p className="font-semibold mb-1">{payload[0].name}</p>
        <p>Total: <span className="font-bold">{payload[0].value}</span></p>
      </div>
    )
  }
  return null
}

export function SocialSection({ data }: { data: ObservatoryData }) {

  // Lógica para garantir cores semânticas independente da ordem dos dados
  const sexDataWithColors = useMemo(() => {
    return data.sexData.map(item => {
      let color = '#94a3b8' // Cinza (Outros/Indefinido)
      const name = item.name.toLowerCase()
      
      if (name.includes('masculino') || name.startsWith('m')) color = '#3b82f6' // Blue-500
      if (name.includes('feminino') || name.startsWith('f')) color = '#ec4899' // Pink-500
      
      return { ...item, fill: color }
    })
  }, [data.sexData])

  const totalUsers = data.sexData.reduce((acc, curr) => acc + curr.value, 0)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* GRÁFICO 1: FAIXA ETÁRIA */}
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-500"/> Faixa Etária
          </CardTitle>
          <CardDescription>Distribuição dos usuários por idade.</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px]">
          {data.ageData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={data.ageData} 
                layout="vertical" 
                margin={{ left: 10, right: 30, top: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false}/>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100} 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--foreground))', fontWeight: 500 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                <Bar 
                  dataKey="value" 
                  name="Total" 
                  fill="#8b5cf6" 
                  radius={[0, 4, 4, 0]} 
                  barSize={24}
                >
                  <LabelList 
                    dataKey="value" 
                    position="right" 
                    fontSize={11} 
                    fontWeight="bold" 
                    fill="hsl(var(--foreground))" 
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              Sem dados de idade disponíveis.
            </div>
          )}
        </CardContent>
      </Card>

      {/* GRÁFICO 2: DISTRIBUIÇÃO POR SEXO */}
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500"/> Gênero
              </CardTitle>
              <CardDescription>Perfil demográfico.</CardDescription>
            </div>
            <div className="text-right">
               <span className="text-2xl font-bold block">{totalUsers}</span>
               <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[350px]">
          {sexDataWithColors.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={sexDataWithColors} 
                  innerRadius={70} // Estilo Donut
                  outerRadius={100} 
                  paddingAngle={2}
                  dataKey="value" 
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                >
                  {sexDataWithColors.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="middle" 
                  align="right" 
                  layout="vertical"
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              Sem dados de gênero disponíveis.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}