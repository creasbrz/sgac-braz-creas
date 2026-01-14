import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, FileText, Download, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// --- DEFINIÇÕES DE TIPOS (Alinhadas ao Backend) ---

interface StandardCounter {
  masculino: { a0_12: number, a13_17: number, a18_59: number, a60_mais: number }
  feminino: { a0_12: number, a13_17: number, a18_59: number, a60_mais: number }
  total: number
}

interface ChildCounter {
  masculino: { a0_6: number, a7_12: number, a13_17: number }
  feminino: { a0_6: number, a7_12: number, a13_17: number }
  total: number
}

interface ChildLaborCounter {
  masculino: { a0_12: number, a13_15: number }
  feminino: { a0_12: number, a13_15: number }
  total: number
}

interface RmaResponse {
  bloco1: {
    a1_total_acompanhamento: number;
    a2_novos_casos: number;
    b1_bolsa_familia: number;
    b2_bpc: number;
    b3_trabalho_infantil: number;
    b4_acolhimento: number;
    b5_drogas: number;
    b6_vitimas: StandardCounter;
    b7_mse: number;
    c1_violencia_intrafamiliar: ChildCounter;
    c2_abuso_sexual: ChildCounter;
    c3_exploracao_sexual: ChildCounter;
    c4_negligencia: ChildCounter;
    c5_trabalho_infantil: ChildLaborCounter;
    d1_fisica_psico: number;
    d2_negligencia: number;
    e1_intrafamiliar: StandardCounter;
    e2_negligencia: StandardCounter;
    f1_violencia: number;
    g1_trafico: StandardCounter;
    h1_discriminacao: number;
    i1_rua: StandardCounter;
  };
  bloco2: {
    m1_individualizados: number;
    m2_grupo: number;
    m3_encaminhamentos_cras: number;
    m4_visitas: number;
  };
}

// --- COMPONENTES DE ESTILO PARA TABELA OFICIAL ---

const Th = ({ children, rowSpan = 1, colSpan = 1, className = "" }: any) => (
  <th rowSpan={rowSpan} colSpan={colSpan} className={`border border-slate-400 bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-800 text-center align-middle uppercase ${className}`}>
    {children}
  </th>
)

const Td = ({ children, rowSpan = 1, colSpan = 1, className = "", align = "center" }: any) => (
  <td rowSpan={rowSpan} colSpan={colSpan} className={`border border-slate-300 px-2 py-1 text-[11px] text-slate-900 ${align === 'left' ? 'text-left' : 'text-center'} ${className}`}>
    {children}
  </td>
)

const SectionHeader = ({ title }: { title: string }) => (
  <div className="mt-8 mb-4 bg-slate-800 text-white px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-sm print:bg-black">
    {title}
  </div>
)

export function RmaTab() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))

  const { data, isLoading, refetch, isFetched } = useQuery<RmaResponse>({
    queryKey: ['rmaReport', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-')
      const res = await api.get('/rma/generate', { params: { month, year } })
      return res.data
    },
    enabled: false
  })

  // --- RENDERERS DE TABELAS ---

  const renderSimpleRow = (code: string, label: string, value: number) => (
    <tr className="hover:bg-slate-50 transition-colors">
      <Td align="left" className="font-bold w-16 bg-slate-50/50">{code}</Td>
      <Td align="left">{label}</Td>
      <Td className="font-bold bg-slate-50 w-28 text-sm">{value}</Td>
    </tr>
  )

  const renderStandardDemographic = (code: string, label: string, stats: StandardCounter) => (
    <>
      <tr className="bg-slate-50/30">
        <Td rowSpan={2} align="left" className="font-medium w-[40%]">
          <span className="font-bold mr-2">{code}</span>{label}
        </Td>
        <Td rowSpan={2} className="font-bold text-sm">{stats.total}</Td>
        <Td className="font-semibold text-blue-800">Masc.</Td>
        <Td>{stats.masculino.a0_12}</Td>
        <Td>{stats.masculino.a13_17}</Td>
        <Td>{stats.masculino.a18_59}</Td>
        <Td>{stats.masculino.a60_mais}</Td>
      </tr>
      <tr>
        <Td className="font-semibold text-pink-800">Fem.</Td>
        <Td>{stats.feminino.a0_12}</Td>
        <Td>{stats.feminino.a13_17}</Td>
        <Td>{stats.feminino.a18_59}</Td>
        <Td>{stats.feminino.a60_mais}</Td>
      </tr>
    </>
  )

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      
      {/* PAINEL DE CONTROLE */}
      <Card className="border-l-4 border-l-primary shadow-sm print:hidden">
        <CardContent className="pt-6 flex flex-col sm:flex-row gap-4 items-end">
          <div className="space-y-1 flex-1">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Período de Referência</label>
            <div className="flex gap-2">
              <Input 
                type="month" 
                className="bg-white w-52 h-10 font-medium"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
              />
              <Button onClick={() => refetch()} disabled={isLoading} className="h-10 px-6">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileText className="mr-2 h-4 w-4"/>}
                Gerar RMA
              </Button>
            </div>
          </div>
          {isFetched && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.print()} className="h-10">
                <Printer className="mr-2 h-4 w-4"/> Imprimir
              </Button>
              <Button variant="secondary" onClick={() => toast.info("Exportação para Excel em desenvolvimento.")} className="h-10">
                <Download className="mr-2 h-4 w-4"/> Exportar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FORMULÁRIO RMA ESTILIZADO */}
      {data && (
        <div className="bg-white p-10 border shadow-2xl print:shadow-none print:border-none print:p-0 min-h-screen text-slate-900 rounded-md">
          
          {/* CABEÇALHO OFICIAL */}
          <div className="flex justify-between items-start mb-8 border-b-2 border-slate-900 pb-6">
            <div className="space-y-1">
              <h1 className="text-xl font-black uppercase tracking-tighter">Registro Mensal de Atendimentos (RMA)</h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Centro de Referência Especializado de Assistência Social - CREAS</p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-lg font-mono px-4 py-1 border-slate-900 border-2 rounded-none">
                {format(new Date(selectedMonth + '-02'), "MM / yyyy", { locale: ptBR })}
              </Badge>
            </div>
          </div>

          {/* BLOCO I - PAEFI */}
          <SectionHeader title="Bloco I - PAEFI (Serviço de Proteção e Atendimento Especializado)" />
          
          {/* TABELA A e B */}
          <div className="mb-8">
            <table className="w-full border-collapse border-2 border-slate-950">
              <thead>
                <tr>
                  <Th className="text-left pl-4 py-2 bg-slate-200">A. Volume e B. Perfil (Famílias/Indivíduos)</Th>
                  <Th className="w-32 bg-slate-200">Total</Th>
                </tr>
              </thead>
              <tbody>
                {renderSimpleRow('A.1', 'Total de casos em acompanhamento pelo PAEFI', data.bloco1.a1_total_acompanhamento)}
                {renderSimpleRow('A.2', 'Novos casos inseridos no acompanhamento durante o mês', data.bloco1.a2_novos_casos)}
                <tr className="bg-slate-100/50"><Td colSpan={2} align="left" className="font-bold py-2 uppercase border-y-2 border-slate-950">Perfil dos novos casos inseridos no mês</Td></tr>
                {renderSimpleRow('B.1', 'Famílias beneficiárias do Programa Bolsa Família', data.bloco1.b1_bolsa_familia)}
                {renderSimpleRow('B.2', 'Famílias com membros beneficiários do BPC', data.bloco1.b2_bpc)}
                {renderSimpleRow('B.3', 'Famílias com crianças ou adolescentes em situação de trabalho infantil', data.bloco1.b3_trabalho_infantil)}
                {renderSimpleRow('B.4', 'Famílias com crianças ou adolescentes em Serviços de Acolhimento', data.bloco1.b4_acolhimento)}
                {renderSimpleRow('B.5', 'Famílias com situação de violência associada ao uso de substâncias', data.bloco1.b5_drogas)}
                {renderSimpleRow('B.7', 'Famílias com adolescente em cumprimento de Medidas Socioeducativas', data.bloco1.b7_mse)}
              </tbody>
            </table>
          </div>

          {/* TABELA B.6 - DEMOGRÁFICA */}
          <div className="mb-8 break-inside-avoid">
            <table className="w-full border-collapse border-2 border-slate-950">
              <thead>
                <tr>
                  <Th rowSpan={2} className="text-left pl-4">B.6. Pessoas Vitimadas (Novos Casos)</Th>
                  <Th rowSpan={2} className="w-20">Total</Th>
                  <Th rowSpan={2} className="w-20">Sexo</Th>
                  <Th colSpan={4}>Faixa Etária</Th>
                </tr>
                <tr>
                  <Th className="w-16">0-12</Th>
                  <Th className="w-16">13-17</Th>
                  <Th className="w-16">18-59</Th>
                  <Th className="w-16">60+</Th>
                </tr>
              </thead>
              <tbody>
                {renderStandardDemographic('B.6', 'Quantidade de pessoas vitimadas que ingressaram no PAEFI', data.bloco1.b6_vitimas)}
              </tbody>
            </table>
          </div>

          {/* TABELA C - CRIANÇAS E ADOLESCENTES */}
          <div className="mb-8 break-inside-avoid">
            <table className="w-full border-collapse border-2 border-slate-950">
              <thead>
                <tr>
                  <Th colSpan={7} className="text-left pl-4 py-2 bg-slate-200">C. Crianças/Adolescentes em situação de Violência (Novos Casos)</Th>
                </tr>
                <tr>
                  <Th rowSpan={2}>Tipo de Violação</Th>
                  <Th rowSpan={2} className="w-16">Total</Th>
                  <Th rowSpan={2} className="w-16">Sexo</Th>
                  <Th colSpan={3}>Faixa Etária</Th>
                </tr>
                <tr>
                  <Th className="w-16">0-6</Th>
                  <Th className="w-16">7-12</Th>
                  <Th className="w-16">13-17</Th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-slate-50/50">
                  <Td rowSpan={2} align="left" className="font-medium w-[40%]"><span className="font-bold mr-2">C.1</span>Vítimas de Violência Intrafamiliar (Física ou Psicológica)</Td>
                  <Td rowSpan={2} className="font-bold">{data.bloco1.c1_violencia_intrafamiliar.total}</Td>
                  <Td className="text-blue-800 font-semibold">Masc.</Td>
                  <Td>{data.bloco1.c1_violencia_intrafamiliar.masculino.a0_6}</Td>
                  <Td>{data.bloco1.c1_violencia_intrafamiliar.masculino.a7_12}</Td>
                  <Td>{data.bloco1.c1_violencia_intrafamiliar.masculino.a13_17}</Td>
                </tr>
                <tr>
                  <Td className="text-pink-800 font-semibold">Fem.</Td>
                  <Td>{data.bloco1.c1_violencia_intrafamiliar.feminino.a0_6}</Td>
                  <Td>{data.bloco1.c1_violencia_intrafamiliar.feminino.a7_12}</Td>
                  <Td>{data.bloco1.c1_violencia_intrafamiliar.feminino.a13_17}</Td>
                </tr>
                {/* Outras linhas do Bloco C seguiriam o mesmo padrão */}
              </tbody>
            </table>
          </div>

          {/* BLOCO II - ATENDIMENTOS */}
          <SectionHeader title="Bloco II - Atendimentos Realizados no CREAS" />
          <table className="w-full border-collapse border-2 border-slate-950">
            <thead>
               <tr>
                  <Th className="text-left pl-4 py-2 bg-slate-200">M. Atendimentos realizados no mês de referência</Th>
                  <Th className="w-32 bg-slate-200">Total</Th>
               </tr>
            </thead>
            <tbody>
              {renderSimpleRow('M.1', 'Total de atendimentos individualizados realizados no mês', data.bloco2.m1_individualizados)}
              {renderSimpleRow('M.2', 'Total de atendimentos em grupo realizados no mês (Participantes)', data.bloco2.m2_grupo)}
              {renderSimpleRow('M.3', 'Famílias encaminhadas para o CRAS (PAIF) durante o mês', data.bloco2.m3_encaminhamentos_cras)}
              {renderSimpleRow('M.4', 'Visitas domiciliares realizadas no mês de referência', data.bloco2.m4_visitas)}
            </tbody>
          </table>

          {/* RODAPÉ DE AUDITORIA */}
          <div className="mt-12 grid grid-cols-3 gap-8 print:mt-20">
             <div className="border-t border-slate-950 pt-2 text-center">
                <p className="text-[10px] font-bold uppercase">Responsável Técnico</p>
             </div>
             <div className="border-t border-slate-950 pt-2 text-center">
                <p className="text-[10px] font-bold uppercase">Coordenação da Unidade</p>
             </div>
             <div className="border-t border-slate-950 pt-2 text-center">
                <p className="text-[10px] font-bold uppercase">Data de Emissão</p>
                <p className="text-xs">{format(new Date(), "dd/MM/yyyy HH:mm")}</p>
             </div>
          </div>

        </div>
      )}
    </div>
  )
}