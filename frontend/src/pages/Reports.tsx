import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts'
import {
  Download, Map as MapIcon, Activity, PieChart as PieIcon, Users, 
  Share2, Gift, Clock, TrendingUp, AlertTriangle, ArrowRightLeft, UserCircle, Filter
} from 'lucide-react'

// [ATUALIZAÇÃO] Removido jsPDF manual, importado o gerador oficial
import { generateObservatoryPDF, type ObservatoryData } from '@/utils/pdfGenerator'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TerritoryMap } from '@/components/analytics/TerritoryMap'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1']

export function Reports() {
  const [mapViolation, setMapViolation] = useState<string>('all')
  const [mapCategory, setMapCategory] = useState<string>('all')

  // [ATUALIZAÇÃO] Tipagem explícita para o useQuery
  const { data, isLoading, isError } = useQuery<ObservatoryData & { mapData: any[] }>({
    queryKey: ['vigilancia'],
    queryFn: async () => {
      const res = await api.get('/stats/vigilancia')
      return res.data
    },
    staleTime: 1000 * 60 * 5,
    retry: 1
  })

  const filteredMapData = useMemo(() => {
    if (!data?.mapData) return []
    return data.mapData.filter((item: any) => {
      const matchViolation = mapViolation === 'all' || item.violacao === mapViolation
      const matchCategory = mapCategory === 'all' || item.categoria === mapCategory
      return matchViolation && matchCategory
    })
  }, [data, mapViolation, mapCategory])

  const uniqueViolations = useMemo(() => {
    if (!data?.mapData) return []
    const set = new Set(data.mapData.map((d: any) => d.violacao))
    return Array.from(set) as string[]
  }, [data])

  const uniqueCategories = useMemo(() => {
    if (!data?.mapData) return []
    const set = new Set(data.mapData.map((d: any) => d.categoria))
    return Array.from(set) as string[]
  }, [data])

  // [ATUALIZAÇÃO] Função de PDF conectada ao gerador robusto
  const handleDownloadPDF = () => {
    if (!data) return
    generateObservatoryPDF(data)
  }

  if (isLoading) return <div className="p-8 space-y-6"><Skeleton className="h-12 w-full"/><div className="grid grid-cols-2 gap-4"><Skeleton className="h-64"/><Skeleton className="h-64"/></div></div>
  if (isError || !data) return <div className="p-8 text-center text-red-500">Erro ao carregar dados.</div>

  const getUrgencyColor = (weight: number) => {
    if (weight >= 4) return '#ef4444'; 
    if (weight === 3) return '#f97316'; 
    if (weight === 2) return '#eab308'; 
    return '#22c55e'; 
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-slate-900 dark:text-slate-100">
            <Activity className="h-8 w-8 text-primary" /> Observatório Social
          </h1>
          <p className="text-muted-foreground mt-1">Análise integral de vulnerabilidades, rede e território.</p>
        </div>
        
        {/* [ATUALIZAÇÃO] Botão conectado */}
        <Button size="lg" onClick={handleDownloadPDF} className="shadow-sm bg-slate-900 text-white hover:bg-slate-800">
          <Download className="mr-2 h-5 w-5" /> Relatório Completo PDF
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-muted/50 p-1">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="network">Rede</TabsTrigger>
          <TabsTrigger value="performance">Atendimentos</TabsTrigger>
          <TabsTrigger value="social">Perfil Social</TabsTrigger>
          <TabsTrigger value="territory">Território</TabsTrigger>
        </TabsList>

        {/* ... (O restante do conteúdo JSX permanece exatamente igual ao seu arquivo original) ... */}
        {/* ... Mantenha o conteúdo das TabsContent igual ... */}
        
        {/* Para economizar espaço na resposta, vou resumir:
            Copie todo o conteúdo dentro das TabsContent do seu arquivo original Reports.tsx
            pois a única mudança lógica foi no handleDownloadPDF e imports. 
        */}
        
        {/* Exemplo do início do TabOverview para referência */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {/* ... Cards ... */}
             <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                   <span className="text-sm text-muted-foreground font-medium">Novos (6 meses)</span>
                   <span className="text-3xl font-bold text-primary">{data.evolutionData.reduce((acc, c)=>acc+c.novos,0)}</span>
                </CardContent>
             </Card>
             {/* ... Outros Cards ... */}
             <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                   <span className="text-sm text-red-600 font-medium">Risco Alto/Extremo</span>
                   <span className="text-3xl font-bold text-red-700">
                     {data.urgencyData.filter((u) => u.weight >= 3).reduce((acc, c) => acc + c.value, 0)}
                   </span>
                </CardContent>
             </Card>
             <Card className="bg-emerald-50 border-emerald-200">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                   <span className="text-sm text-emerald-600 font-medium">Desligados (6 meses)</span>
                   <span className="text-3xl font-bold text-emerald-700">{data.efficiencyData.totalClosed}</span>
                </CardContent>
             </Card>
             <Card>
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                   <span className="text-sm text-muted-foreground font-medium">Demanda Principal</span>
                   <span className="text-lg font-bold truncate w-full">{data.violationData[0]?.name || '-'}</span>
                </CardContent>
             </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-5 w-5 text-primary"/> Fluxo de Atendimento</CardTitle>
                <CardDescription>Entradas vs Saídas nos últimos 6 meses.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.evolutionData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false}/>
                    <XAxis dataKey="name" fontSize={12}/>
                    <YAxis allowDecimals={false} fontSize={12}/>
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius:'8px'}}/>
                    <Legend />
                    <Bar dataKey="novos" name="Entradas" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="desligados" name="Desligamentos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-5 w-5 text-red-500"/> Matriz de Risco</CardTitle>
                <CardDescription>Classificação de gravidade dos casos ativos.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.urgencyData} layout="vertical" margin={{left:40}}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false}/>
                    <XAxis type="number" hide/>
                    <YAxis dataKey="name" type="category" width={140} fontSize={11}/>
                    <Tooltip cursor={{fill: 'transparent'}}/>
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20} name="Casos">
                      {data.urgencyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getUrgencyColor(entry.weight)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><PieIcon className="h-5 w-5 text-primary"/> Tipificação das Violações</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.violationData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                      {data.violationData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend layout="vertical" align="right" verticalAlign="middle"/>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="network" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5 text-orange-500"/> Porta de Entrada (Origem)</CardTitle>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.originData} layout="vertical" margin={{left: 20}}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2}/>
                    <XAxis type="number" hide/>
                    <YAxis dataKey="name" type="category" width={130} fontSize={11}/>
                    <Tooltip cursor={{fill: 'transparent'}}/>
                    <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} barSize={18} name="Casos Enviados" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Share2 className="h-5 w-5 text-indigo-500"/> Porta de Saída (Encaminhamentos)</CardTitle>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.networkData} layout="vertical" margin={{left: 20}}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2}/>
                    <XAxis type="number" hide/>
                    <YAxis dataKey="name" type="category" width={130} fontSize={11}/>
                    <Tooltip cursor={{fill: 'transparent'}}/>
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={18} name="Ofícios Enviados" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <Card className="bg-pink-50 border-pink-200 col-span-1">
                <CardHeader className="pb-2">
                   <CardTitle className="text-lg flex items-center gap-2 text-pink-700"><Users className="h-5 w-5"/> Grupos e Oficinas</CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="flex justify-between items-end mb-2">
                      <span className="text-sm text-muted-foreground">Participantes (6 meses)</span>
                      <span className="text-2xl font-bold text-pink-600">{data.collectiveData.totalParticipants}</span>
                   </div>
                   <div className="flex justify-between items-end">
                      <span className="text-sm text-muted-foreground">Média por Grupo</span>
                      <span className="text-xl font-bold text-pink-600">{data.collectiveData.avgAttendance}</span>
                   </div>
                </CardContent>
             </Card>

             <Card className="col-span-2">
                <CardHeader className="pb-2">
                   <CardTitle className="text-lg flex items-center gap-2"><Gift className="h-5 w-5 text-emerald-600"/> Concessão de Benefícios</CardTitle>
                </CardHeader>
                <CardContent className="h-[150px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.benefitsData}>
                         <XAxis dataKey="name" fontSize={10} interval={0} />
                         <Tooltip cursor={{fill: 'transparent'}}/>
                         <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} name="Qtd" />
                      </BarChart>
                   </ResponsiveContainer>
                </CardContent>
             </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-t-4 border-t-blue-500">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Clock className="h-5 w-5"/> Tempo Acompanhamento</CardTitle></CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-blue-600 mb-1">{data.efficiencyData.avgPermanence}</div>
                <span className="text-xs text-muted-foreground">dias em média</span>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-amber-500">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Activity className="h-5 w-5"/> Tempo de Espera</CardTitle></CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-amber-600 mb-1">{data.efficiencyData.avgWaitTime}</div>
                <span className="text-xs text-muted-foreground">dias até PAEFI</span>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-slate-500">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5"/> Desligamentos</CardTitle></CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-slate-600 mb-1">{data.efficiencyData.totalClosed}</div>
                <span className="text-xs text-muted-foreground">casos encerrados</span>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserCircle className="h-5 w-5 text-primary"/> Faixa Etária</CardTitle></CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.ageData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false}/>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={110} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px' }} />
                    <Bar dataKey="value" name="Total" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader><CardTitle className="text-base">Distribuição por Sexo</CardTitle></CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.sexData} outerRadius={90} dataKey="value" label>
                      <Cell fill="#3b82f6" /> <Cell fill="#ec4899" /> <Cell fill="#94a3b8" />
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="territory">
          <Card className="shadow-md border-2 border-muted/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2"><MapIcon className="h-5 w-5 text-primary"/> Mapa de Calor Territorial</CardTitle>
                <CardDescription>Distribuição geoespacial das vulnerabilidades.</CardDescription>
              </div>
              
              <div className="flex gap-2">
                <Select value={mapViolation} onValueChange={setMapViolation}>
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <Filter className="w-3 h-3 mr-2" />
                    <SelectValue placeholder="Filtrar Violação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Violações</SelectItem>
                    {uniqueViolations.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={mapCategory} onValueChange={setMapCategory}>
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <UserCircle className="w-3 h-3 mr-2" />
                    <SelectValue placeholder="Filtrar Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Categorias</SelectItem>
                    {uniqueCategories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            
            <CardContent className="p-0 sm:p-1">
              <div className="rounded-b-xl overflow-hidden h-[750px] w-full border-t">
                {filteredMapData.length > 0 ? (
                  <TerritoryMap data={filteredMapData} />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Nenhum caso encontrado com estes filtros.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}