import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Loader2, FileText, Printer } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

// --- TIPOS DE DADOS ---
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

interface RmaData {
  bloco1: {
    a1_total: number; a2_novos: number;
    b1_pbf: number; b2_bpc: number; b3_trab_infantil: number; b4_acolhimento: number; b5_drogas: number; b7_mse: number;
    b6_vitimas: StandardCounter;
    c1_infamiliar: ChildCounter; c2_abuso: ChildCounter; c3_exploracao: ChildCounter; c4_negligencia: ChildCounter;
    c5_trab_infantil: ChildLaborCounter;
    d1_violencia: number; d2_negligencia: number;
    e1_violencia: StandardCounter; e2_negligencia: StandardCounter;
    f1_mulheres: number;
    g1_trafico: StandardCounter;
    h1_discriminacao: number;
    i1_rua: StandardCounter;
  };
  bloco2: {
    m1_individual: number; m2_grupo: number; m3_cras: number; m4_visitas: number;
  };
}

// --- COMPONENTES VISUAIS ---

// Th Padrão (Fundo Cinza Claro) - Usado para sub-cabeçalhos se necessário, ou células menos importantes
const Th = ({ children, rS = 1, cS = 1, className = "" }: any) => (
  <th rowSpan={rS} colSpan={cS} className={`border border-black bg-gray-400 px-1 py-1 text-[9px] font-bold text-black text-center uppercase align-middle leading-tight ${className}`}>
    {children}
  </th>
)

// DarkTh (Alto Contraste) - Usado para Títulos de Seção e Cabeçalhos Principais (Total, Sexo, etc)
const DarkTh = ({ children, rS = 1, cS = 1, className = "", align = "center" }: any) => (
  <th rowSpan={rS} colSpan={cS} className={`border border-black bg-gray-800 text-white px-2 py-1 text-[10px] font-bold uppercase align-middle leading-tight ${align === 'left' ? 'text-left' : 'text-center'} ${className}`}>
    {children}
  </th>
)

const Td = ({ children, rS = 1, cS = 1, align = "center", className = "" }: any) => (
  <td rowSpan={rS} colSpan={cS} className={`border border-black px-1.5 py-0.5 text-[10px] text-black ${align === 'left' ? 'text-left font-sans' : 'text-center font-mono'} ${className}`}>
    {children}
  </td>
)

const BlockHeader = ({ title }: { title: string }) => (
  <div className="mt-4 mb-0 bg-black text-white px-2 py-1 text-[11px] font-bold uppercase tracking-tight border border-black border-b-0 break-inside-avoid print:mt-2">
    {title}
  </div>
)

const SectionTitle = ({ title }: { title: string }) => (
  <div className="bg-gray-800 text-white px-2 py-1 text-[10px] font-bold uppercase border border-black border-b-0 mt-4 break-inside-avoid print:mt-2">
    {title}
  </div>
)

export function RmaTab() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  
  const { data, isLoading, refetch } = useQuery<RmaData>({
    queryKey: ['rmaReport', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-')
      const res = await api.get('/rma/generate', { params: { month, year } })
      return res.data
    },
    enabled: false
  })

  // --- HELPERS DE RENDERIZAÇÃO ---

  const renderSimpleRow = (code: string, label: string, val: number) => (
    <tr>
      <Td align="left" className="pl-2">
        <span className="font-bold mr-2">{code}</span>
        {label}
      </Td>
      <Td className="font-bold w-16 bg-gray-50 text-center">{val}</Td>
    </tr>
  )

  const renderStandardDemo = (code: string, label: string, s: StandardCounter) => (
    <React.Fragment>
      <tr className="bg-gray-50/50">
        <Td rS={2} align="left" className="w-[45%]">
          <span className="font-bold mr-1">{code}</span>{label}
        </Td>
        <Td rS={2} className="font-bold bg-gray-100">{s.total}</Td>
        <Td className="text-[9px] font-bold uppercase bg-gray-100">Masc</Td>
        <Td>{s.masculino.a0_12}</Td><Td>{s.masculino.a13_17}</Td><Td>{s.masculino.a18_59}</Td><Td>{s.masculino.a60_mais}</Td>
      </tr>
      <tr>
        <Td className="text-[9px] font-bold uppercase bg-gray-100">Fem</Td>
        <Td>{s.feminino.a0_12}</Td><Td>{s.feminino.a13_17}</Td><Td>{s.feminino.a18_59}</Td><Td>{s.feminino.a60_mais}</Td>
      </tr>
    </React.Fragment>
  )

  const renderChildDemo = (code: string, label: string, s: ChildCounter) => (
    <React.Fragment>
      <tr>
        <Td rS={2} align="left" className="w-[45%]">
          <span className="font-bold mr-1">{code}</span>{label}
        </Td>
        <Td rS={2} className="font-bold bg-gray-100">{s.total}</Td>
        <Td className="text-[9px] font-bold uppercase bg-gray-100">Masc</Td>
        <Td>{s.masculino.a0_6}</Td><Td>{s.masculino.a7_12}</Td><Td>{s.masculino.a13_17}</Td>
      </tr>
      <tr>
        <Td className="text-[9px] font-bold uppercase bg-gray-100">Fem</Td>
        <Td>{s.feminino.a0_6}</Td><Td>{s.feminino.a7_12}</Td><Td>{s.feminino.a13_17}</Td>
      </tr>
    </React.Fragment>
  )

  const monthLabel = selectedMonth ? format(new Date(selectedMonth + '-02'), "MM / yyyy") : "__ / ____"

  return (
    <div className="flex flex-col items-center pb-20 bg-slate-100 min-h-screen font-sans">
      
      {/* --- CSS PARA IMPRESSÃO --- */}
      <style>{`
        @media print {
          @page { 
            margin: 5mm; 
            size: A4 portrait; 
          }
          
          /* Garante que cores de fundo (preto/cinza) sejam impressas */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body * { visibility: hidden; }
          
          #rma-print-content, #rma-print-content * { 
            visibility: visible; 
          }

          #rma-print-content {
            position: absolute;
            top: 0;
            left: 50%;
            width: 210mm;
            transform: translateX(-50%) scale(0.75); 
            transform-origin: top center;
            margin: 0;
            padding: 0;
            background: white;
            z-index: 9999;
          }

          .print-hidden { display: none !important; }
          
          .break-inside-avoid { 
            break-inside: avoid; 
            page-break-inside: avoid; 
          }
        }
      `}</style>

      {/* TOOLBAR */}
      <Card className="w-full max-w-[210mm] mt-4 mb-6 print-hidden border-l-4 border-l-blue-600">
        <CardContent className="pt-6 flex gap-4 items-end">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-bold uppercase text-muted-foreground">Mês de Referência</label>
            <div className="flex gap-2">
              <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-48" />
              <Button onClick={() => refetch()} disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <FileText className="h-4 w-4 mr-2"/>} Gerar Relatório
              </Button>
            </div>
          </div>
          {data && <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2"/> Imprimir</Button>}
        </CardContent>
      </Card>

      {/* DOCUMENTO A4 */}
      {data && (
        <div id="rma-print-content" className="w-[210mm] bg-white p-[10mm] shadow-2xl print:shadow-none print:w-full print:p-0 text-black leading-snug">
          
          {/* CABEÇALHO */}
          <div className="border border-black p-2 mb-2 relative break-inside-avoid">
            <h1 className="text-[12px] font-black text-center uppercase mb-3 leading-tight">Formulário de Registro Mensal de Atendimentos do CREAS</h1>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[10px]">
              <div className="flex border-b border-black pb-0.5">Nome da Unidade: <span className="ml-2 font-mono uppercase italic">CREAS Brazlândia</span></div>
              <div className="flex border-b border-black pb-0.5">Município: <span className="ml-2 font-mono uppercase italic">Brasília (Brazlândia)</span></div>
              <div className="flex border-b border-black pb-0.5 uppercase font-bold">Mês/Ano: <span className="ml-2 font-mono">{monthLabel}</span></div>
              <div className="flex border-b border-black pb-0.5">Nº da Unidade: <span className="ml-2 font-mono"></span></div>
            </div>
          </div>

          <BlockHeader title="Bloco I - Serviço de Proteção e Atendimento Especializado a Famílias e Indivíduos - PAEFI" />
          
          {/* TABELA A & B */}
          <table className="w-full border-collapse border border-black border-t-0 break-inside-avoid">
            <thead>
              <tr>
                <DarkTh className="pl-2 w-[85%]" align="left">A. Volume de Famílias / B. Perfil (Novos Casos)</DarkTh>
                <DarkTh className="w-16">Total</DarkTh>
              </tr>
            </thead>
            <tbody>
              {renderSimpleRow('A.1', 'Total de casos em acompanhamento (Ativos no mês)', data.bloco1.a1_total)}
              {renderSimpleRow('A.2', 'Novos casos inseridos no acompanhamento durante o mês', data.bloco1.a2_novos)}
              
              {/* LINHA DE PERFIL (B.1 a B.7) - ALTO CONTRASTE */}
              <tr>
                <Td cS={2} align="left" className="bg-gray-800 text-white font-bold text-[10px] py-1 uppercase pl-4 border-y border-black">
                  Perfil dos novos casos inseridos (B.1 a B.7)
                </Td>
              </tr>
              
              {renderSimpleRow('B.1', 'Famílias beneficiárias do Programa Bolsa Família', data.bloco1.b1_pbf)}
              {renderSimpleRow('B.2', 'Famílias com membros beneficiários do BPC', data.bloco1.b2_bpc)}
              {renderSimpleRow('B.3', 'Famílias com crianças/adolescentes em Trabalho Infantil', data.bloco1.b3_trab_infantil)}
              {renderSimpleRow('B.4', 'Famílias com crianças/adolescentes em Acolhimento', data.bloco1.b4_acolhimento)}
              {renderSimpleRow('B.5', 'Famílias com violência associada a substâncias psicoativas', data.bloco1.b5_drogas)}
              {renderSimpleRow('B.7', 'Famílias com adolescente em cumprimento de MSE', data.bloco1.b7_mse)}
            </tbody>
          </table>

          {/* TABELA B.6 */}
          <div className="mt-4 border border-black break-inside-avoid">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <DarkTh rS={2} className="w-[45%] pl-2" align="left">B.6. Quantidade de Pessoas Vitimadas (Novos Casos)</DarkTh>
                  {/* CABEÇALHOS AGORA PADRONIZADOS EM ALTO CONTRASTE */}
                  <DarkTh rS={2} className="w-10">Total</DarkTh>
                  <DarkTh rS={2} className="w-10">Sexo</DarkTh>
                  <DarkTh cS={4}>Faixa Etária</DarkTh>
                </tr>
                <tr>
                  <Th>0-12</Th><Th>13-17</Th><Th>18-59</Th><Th>60+</Th>
                </tr>
              </thead>
              <tbody>
                {renderStandardDemo('B.6', 'Pessoas vitimadas que ingressaram no PAEFI', data.bloco1.b6_vitimas)}
              </tbody>
            </table>
          </div>

          {/* TABELA C (C.1 a C.4) */}
          <div className="mt-4 border border-black break-inside-avoid">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <DarkTh rS={2} className="w-[45%] pl-2" align="left">C. Crianças e Adolescentes - Situações de Violência (Novos Casos)</DarkTh>
                  <DarkTh rS={2} className="w-10">Total</DarkTh>
                  <DarkTh rS={2} className="w-10">Sexo</DarkTh>
                  <DarkTh cS={3}>Faixa Etária (Específico)</DarkTh>
                </tr>
                <tr>
                  <Th>0 a 6</Th><Th>7 a 12</Th><Th>13 a 17</Th>
                </tr>
              </thead>
              <tbody>
                {renderChildDemo('C.1', 'Violência Intrafamiliar (Física/Psicológica)', data.bloco1.c1_infamiliar)}
                {renderChildDemo('C.2', 'Abuso Sexual', data.bloco1.c2_abuso)}
                {renderChildDemo('C.3', 'Exploração Sexual', data.bloco1.c3_exploracao)}
                {renderChildDemo('C.4', 'Negligência ou Abandono', data.bloco1.c4_negligencia)}
              </tbody>
            </table>
          </div>

          {/* TABELA C.5 - TRABALHO INFANTIL */}
          <div className="mt-4 border border-black break-inside-avoid">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <DarkTh rS={2} className="w-[45%] pl-2" align="left">C.5. Trabalho Infantil (Novos Casos)</DarkTh>
                  <DarkTh rS={2} className="w-10">Total</DarkTh>
                  <DarkTh rS={2} className="w-10">Sexo</DarkTh>
                  <DarkTh cS={2}>Faixa Etária</DarkTh>
                </tr>
                <tr>
                  <Th>0 a 12 anos</Th><Th>13 a 15 anos</Th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <Td rS={2} align="left" className="w-[45%]"><span className="font-bold mr-1">C.5</span>Crianças/Adolescentes em Trabalho Infantil</Td>
                  <Td rS={2} className="font-bold bg-gray-100">{data.bloco1.c5_trab_infantil.total}</Td>
                  <Td className="text-[9px] font-bold uppercase bg-gray-100">Masc</Td>
                  <Td>{data.bloco1.c5_trab_infantil.masculino.a0_12}</Td><Td>{data.bloco1.c5_trab_infantil.masculino.a13_15}</Td>
                </tr>
                <tr>
                  <Td className="text-[9px] font-bold uppercase bg-gray-100">Fem</Td>
                  <Td>{data.bloco1.c5_trab_infantil.feminino.a0_12}</Td><Td>{data.bloco1.c5_trab_infantil.feminino.a13_15}</Td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TABELA D - IDOSOS */}
          <div className="break-inside-avoid">
            <SectionTitle title="D. Idosos - Situações de Violência (Novos Casos)" />
            <table className="w-full border-collapse border border-black border-t-0">
              <tbody>
                {renderSimpleRow('D.1', 'Idosos: Vítimas de violência física, psicológica ou sexual', data.bloco1.d1_violencia)}
                {renderSimpleRow('D.2', 'Idosos: Vítimas de negligência ou abandono', data.bloco1.d2_negligencia)}
              </tbody>
            </table>
          </div>

          {/* TABELA E - PCD */}
          <div className="mt-4 border border-black break-inside-avoid">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <DarkTh rS={2} className="w-[45%] pl-2" align="left">E. Pessoas com Deficiência (Novos Casos)</DarkTh>
                  <DarkTh rS={2} className="w-10">Total</DarkTh>
                  <DarkTh rS={2} className="w-10">Sexo</DarkTh>
                  <DarkTh cS={4}>Faixa Etária</DarkTh>
                </tr>
                <tr><Th>0-12</Th><Th>13-17</Th><Th>18-59</Th><Th>60+</Th></tr>
              </thead>
              <tbody>
                {renderStandardDemo('E.1', 'Pessoas com Deficiência: Violência Intrafamiliar', data.bloco1.e1_violencia)}
                {renderStandardDemo('E.2', 'Pessoas com Deficiência: Negligência/Abandono', data.bloco1.e2_negligencia)}
              </tbody>
            </table>
          </div>

          {/* TABELA F - MULHERES */}
          <div className="break-inside-avoid">
            <SectionTitle title="F. Mulheres Adultas (Novos Casos)" />
            <table className="w-full border-collapse border border-black border-t-0">
              <tbody>
                {renderSimpleRow('F.1', 'Mulheres (18-59): Vítimas de violência intrafamiliar', data.bloco1.f1_mulheres)}
              </tbody>
            </table>
          </div>

          {/* TABELA G - TRÁFICO */}
          <div className="mt-4 border border-black break-inside-avoid">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <DarkTh rS={2} className="w-[45%] pl-2" align="left">G. Tráfico de Seres Humanos (Novos Casos)</DarkTh>
                  <DarkTh rS={2} className="w-10">Total</DarkTh>
                  <DarkTh rS={2} className="w-10">Sexo</DarkTh>
                  <DarkTh cS={4}>Faixa Etária</DarkTh>
                </tr>
                <tr><Th>0-12</Th><Th>13-17</Th><Th>18-59</Th><Th>60+</Th></tr>
              </thead>
              <tbody>
                {renderStandardDemo('G.1', 'Vítimas de Tráfico de Seres Humanos', data.bloco1.g1_trafico)}
              </tbody>
            </table>
          </div>

          {/* TABELA H - DISCRIMINAÇÃO */}
          <div className="break-inside-avoid">
            <SectionTitle title="H. Discriminação (Novos Casos)" />
            <table className="w-full border-collapse border border-black border-t-0">
              <tbody>
                {renderSimpleRow('H.1', 'Pessoas vítimas de discriminação por orientação sexual', data.bloco1.h1_discriminacao)}
              </tbody>
            </table>
          </div>

          {/* TABELA I - POP RUA */}
          <div className="mt-4 border border-black break-inside-avoid">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <DarkTh rS={2} className="w-[45%] pl-2" align="left">I. População em Situação de Rua (Novos Casos)</DarkTh>
                  <DarkTh rS={2} className="w-10">Total</DarkTh>
                  <DarkTh rS={2} className="w-10">Sexo</DarkTh>
                  <DarkTh cS={4}>Faixa Etária</DarkTh>
                </tr>
                <tr><Th>0-12</Th><Th>13-17</Th><Th>18-59</Th><Th>60+</Th></tr>
              </thead>
              <tbody>
                {renderStandardDemo('I.1', 'Pessoas em Situação de Rua', data.bloco1.i1_rua)}
              </tbody>
            </table>
          </div>

          <BlockHeader title="Bloco II - Atendimentos Realizados no CREAS" />
          
          <table className="w-full border-collapse border border-black border-t-0 mt-0 break-inside-avoid">
            <thead>
              <tr>
                <DarkTh className="w-10 text-center">Item</DarkTh>
                <DarkTh className="pl-2" align="center">Descrição do Atendimento</DarkTh>
                <DarkTh className="w-16 text-center">Total</DarkTh>
              </tr>
            </thead>
            <tbody>
              {renderSimpleRow('M.1', 'Total de atendimentos individualizados (Técnicos)', data.bloco2.m1_individual)}
              {renderSimpleRow('M.2', 'Total de atendimentos em grupo (Participantes)', data.bloco2.m2_grupo)}
              {renderSimpleRow('M.3', 'Famílias encaminhadas para o CRAS (Proteção Básica)', data.bloco2.m3_cras)}
              {renderSimpleRow('M.4', 'Visitas Domiciliares realizadas', data.bloco2.m4_visitas)}
            </tbody>
          </table>

          {/* RODAPÉ DE ASSINATURA */}
          <div className="mt-8 grid grid-cols-2 gap-8 text-[9px] break-inside-avoid">
            <div className="space-y-4">
              <p className="font-bold uppercase">Responsável pelas informações:</p>
              <div className="border-b border-black w-full pt-4"></div>
              <p className="text-center">Nome e Cargo</p>
            </div>
            <div className="space-y-4">
              <p className="font-bold uppercase">Validação:</p>
              <div className="border-b border-black w-full pt-4"></div>
              <p className="text-center">Assinatura e CPF</p>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}