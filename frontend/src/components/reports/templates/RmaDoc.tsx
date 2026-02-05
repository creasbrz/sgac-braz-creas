// frontend/src/components/reports/templates/RmaDoc.tsx
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportLayout, styles as globalStyles } from './ReportLayout';
import { RmaReportData, AgeBreakdown, ChildBreakdown, ChildLaborBreakdown } from '@/types/case';

// --- CONFIGURAÇÃO ---
const COLORS = {
  bgLight: '#f9fafb',
  bgHeader: '#f3f4f6',
  textSecondary: '#6b7280',
  border: '#e5e7eb'
};

// Estilos locais para densidade de dados
const localStyles = StyleSheet.create({
  denseText: { fontSize: 8 },
  smallHeader: { fontSize: 7, fontWeight: 'bold' },
  
  // Colunas
  colLabel: { width: '42%' },
  colTotal: { width: '8%', backgroundColor: COLORS.bgHeader, fontWeight: 'bold' },
  colSex: { width: '6%', fontSize: 6, textAlign: 'center' },
  
  // Distribuições
  colAge4: { width: '11%' },    // 4 colunas
  colAge3: { width: '14.6%' },  // 3 colunas
  colAge2: { width: '22%' },    // 2 colunas
});

// --- SUB-COMPONENTES DE TABELA ---

const RowSimple = ({ label, value, isHeader = false }: { label: string, value?: number, isHeader?: boolean }) => (
  <View style={[globalStyles.row, isHeader ? { backgroundColor: COLORS.bgHeader, borderBottomWidth: 2 } : {}]}>
    <Text style={[globalStyles.cell, localStyles.denseText, { width: '92%', fontWeight: isHeader ? 'bold' : 'normal' }]}>
      {label}
    </Text>
    {!isHeader && (
      <Text style={[globalStyles.cell, globalStyles.textCenter, globalStyles.bold, localStyles.denseText, { width: '8%' }]}>
        {value}
      </Text>
    )}
  </View>
);

const RowDemoStandard = ({ label, data }: { label: string, data: AgeBreakdown }) => (
  <View>
    {/* Linha Masculino + Total */}
    <View style={[globalStyles.row, { borderBottomWidth: 0, minHeight: 14 }]}>
      <Text style={[globalStyles.cell, localStyles.colLabel, localStyles.denseText, globalStyles.bold]}>{label}</Text>
      <Text style={[globalStyles.cell, globalStyles.textCenter, localStyles.colTotal, localStyles.denseText]}>{data.total}</Text>
      <Text style={[globalStyles.cell, localStyles.colSex]}>MASC</Text>
      <Text style={[globalStyles.cell, globalStyles.textCenter, localStyles.colAge4, localStyles.denseText]}>{data.masculino.a0_12}</Text>
      <Text style={[globalStyles.cell, globalStyles.textCenter, localStyles.colAge4, localStyles.denseText]}>{data.masculino.a13_17}</Text>
      <Text style={[globalStyles.cell, globalStyles.textCenter, localStyles.colAge4, localStyles.denseText]}>{data.masculino.a18_59}</Text>
      <Text style={[globalStyles.cell, globalStyles.textCenter, localStyles.colAge4, localStyles.denseText]}>{data.masculino.a60_mais}</Text>
    </View>
    {/* Linha Feminino */}
    <View style={[globalStyles.row, { minHeight: 14 }]}>
      <View style={[globalStyles.cell, localStyles.colLabel, { borderRightWidth: 0 }]} />
      <View style={[globalStyles.cell, localStyles.colTotal]} /> 
      <Text style={[globalStyles.cell, localStyles.colSex]}>FEM</Text>
      <Text style={[globalStyles.cell, globalStyles.textCenter, localStyles.colAge4, localStyles.denseText]}>{data.feminino.a0_12}</Text>
      <Text style={[globalStyles.cell, globalStyles.textCenter, localStyles.colAge4, localStyles.denseText]}>{data.feminino.a13_17}</Text>
      <Text style={[globalStyles.cell, globalStyles.textCenter, localStyles.colAge4, localStyles.denseText]}>{data.feminino.a18_59}</Text>
      <Text style={[globalStyles.cell, globalStyles.textCenter, localStyles.colAge4, localStyles.denseText]}>{data.feminino.a60_mais}</Text>
    </View>
  </View>
);

const RowDemoChild = ({ label, data }: { label: string, data: ChildBreakdown }) => (
  <View>
    <View style={[globalStyles.row, { borderBottomWidth: 0, minHeight: 14 }]}>
      <Text style={[globalStyles.cell, localStyles.colLabel, localStyles.denseText, globalStyles.bold]}>{label}</Text>
      <Text style={[globalStyles.cell, globalStyles.textCenter, localStyles.colTotal, localStyles.denseText]}>{data.total}</Text>
      <Text style={[globalStyles.cell, localStyles.colSex]}>MASC</Text>
      <Text style={[globalStyles.cell, globalStyles.textCenter, localStyles.colAge3, localStyles.denseText]}>{data.masculino.a0_6}</Text>
      <Text style={[globalStyles.cell, globalStyles.textCenter, localStyles.colAge3, localStyles.denseText]}>{data.masculino.a7_12}</Text>
      <Text style={[globalStyles.cell, globalStyles.textCenter, localStyles.colAge3, localStyles.denseText]}>{data.masculino.a13_17}</Text>
    </View>
    <View style={[globalStyles.row, { minHeight: 14 }]}>
      <View style={[globalStyles.cell, localStyles.colLabel, { borderRightWidth: 0 }]} />
      <View style={[globalStyles.cell, localStyles.colTotal]} />
      <Text style={[globalStyles.cell, localStyles.colSex]}>FEM</Text>
      <Text style={[globalStyles.cell, globalStyles.textCenter, localStyles.colAge3, localStyles.denseText]}>{data.feminino.a0_6}</Text>
      <Text style={[globalStyles.cell, globalStyles.textCenter, localStyles.colAge3, localStyles.denseText]}>{data.feminino.a7_12}</Text>
      <Text style={[globalStyles.cell, globalStyles.textCenter, localStyles.colAge3, localStyles.denseText]}>{data.feminino.a13_17}</Text>
    </View>
  </View>
);

const RowDemoLabor = ({ label, data }: { label: string, data: ChildLaborBreakdown }) => (
  <View>
    <View style={[globalStyles.row, { borderBottomWidth: 0, minHeight: 14 }]}>
      <Text style={[globalStyles.cell, localStyles.colLabel, localStyles.denseText, globalStyles.bold]}>{label}</Text>
      <Text style={[globalStyles.cell, globalStyles.textCenter, localStyles.colTotal, localStyles.denseText]}>{data.total}</Text>
      <Text style={[globalStyles.cell, localStyles.colSex]}>MASC</Text>
      <Text style={[globalStyles.cell, globalStyles.textCenter, localStyles.colAge2, localStyles.denseText]}>{data.masculino.a0_12}</Text>
      <Text style={[globalStyles.cell, globalStyles.textCenter, localStyles.colAge2, localStyles.denseText]}>{data.masculino.a13_15}</Text>
    </View>
    <View style={[globalStyles.row, { minHeight: 14 }]}>
      <View style={[globalStyles.cell, localStyles.colLabel, { borderRightWidth: 0 }]} />
      <View style={[globalStyles.cell, localStyles.colTotal]} />
      <Text style={[globalStyles.cell, localStyles.colSex]}>FEM</Text>
      <Text style={[globalStyles.cell, globalStyles.textCenter, localStyles.colAge2, localStyles.denseText]}>{data.feminino.a0_12}</Text>
      <Text style={[globalStyles.cell, globalStyles.textCenter, localStyles.colAge2, localStyles.denseText]}>{data.feminino.a13_15}</Text>
    </View>
  </View>
);

// --- COMPONENTE PRINCIPAL ---

export const RmaDoc = ({ data }: { data: RmaReportData }) => (
  <ReportLayout 
    title="Registro Mensal de Atendimentos (RMA)" 
    subtitle={`Mês de Referência: ${data.periodo}`}
  >

    {/* BLOCO I - RESUMO DE VOLUME */}
    <View style={globalStyles.section} wrap={false}>
      <Text style={globalStyles.sectionTitle}>Bloco I - PAEFI (Acompanhamento)</Text>

      <View style={globalStyles.table}>
        <RowSimple label="A. VOLUME / B. PERFIL (NOVOS CASOS)" isHeader />
        
        <RowSimple label="A.1. Total de casos em acompanhamento (Estoque)" value={data.bloco1.a1_total_acompanhamento} />
        <RowSimple label="A.2. Novos casos inseridos no mês" value={data.bloco1.a2_novos_casos} />
        
        <RowSimple label="B. DETALHAMENTO DO PERFIL DOS NOVOS CASOS" isHeader />
        
        <RowSimple label="B.1. Famílias beneficiárias do Bolsa Família" value={data.bloco1.b1_bolsa_familia} />
        <RowSimple label="B.2. Famílias com membros beneficiários do BPC" value={data.bloco1.b2_bpc} />
        <RowSimple label="B.3. Situação de Trabalho Infantil" value={data.bloco1.b3_trabalho_infantil} />
        <RowSimple label="B.4. Situação de Acolhimento" value={data.bloco1.b4_acolhimento} />
        <RowSimple label="B.5. Violência associada ao uso abusivo de substâncias" value={data.bloco1.b5_drogas} />
        <RowSimple label="B.7. Adolescente em cumprimento de MSE" value={data.bloco1.b7_mse} />
      </View>
    </View>

    {/* B.6 DEMOGRAFIA GERAL */}
    <View style={globalStyles.section} wrap={false}>
      <View style={globalStyles.table}>
        <View style={globalStyles.row}>
          <Text style={[globalStyles.cell, globalStyles.headerCell, localStyles.colLabel]}>B.6. PESSOAS VITIMADAS (NOVOS)</Text>
          <Text style={[globalStyles.cell, globalStyles.headerCell, localStyles.colTotal, { textAlign: 'center' }]}>TOT</Text>
          <Text style={[globalStyles.cell, globalStyles.headerCell, localStyles.colSex]}></Text>
          <Text style={[globalStyles.cell, globalStyles.headerCell, localStyles.colAge4, { textAlign: 'center' }]}>0-12</Text>
          <Text style={[globalStyles.cell, globalStyles.headerCell, localStyles.colAge4, { textAlign: 'center' }]}>13-17</Text>
          <Text style={[globalStyles.cell, globalStyles.headerCell, localStyles.colAge4, { textAlign: 'center' }]}>18-59</Text>
          <Text style={[globalStyles.cell, globalStyles.headerCell, localStyles.colAge4, { textAlign: 'center' }]}>60+</Text>
        </View>
        <RowDemoStandard label="Ingressos no mês" data={data.bloco1.b6_vitimas} />
      </View>
    </View>

    {/* C. CRIANÇAS E ADOLESCENTES */}
    <View style={globalStyles.section} wrap={false}>
      <View style={globalStyles.table}>
        <View style={globalStyles.row}>
          <Text style={[globalStyles.cell, globalStyles.headerCell, localStyles.colLabel]}>C. CRIANÇAS E ADOLESCENTES</Text>
          <Text style={[globalStyles.cell, globalStyles.headerCell, localStyles.colTotal, { textAlign: 'center' }]}>TOT</Text>
          <Text style={[globalStyles.cell, globalStyles.headerCell, localStyles.colSex]}></Text>
          <Text style={[globalStyles.cell, globalStyles.headerCell, localStyles.colAge3, { textAlign: 'center' }]}>0-6</Text>
          <Text style={[globalStyles.cell, globalStyles.headerCell, localStyles.colAge3, { textAlign: 'center' }]}>7-12</Text>
          <Text style={[globalStyles.cell, globalStyles.headerCell, localStyles.colAge3, { textAlign: 'center' }]}>13-17</Text>
        </View>
        <RowDemoChild label="C.1. Violência Intrafamiliar (Física/Psico)" data={data.bloco1.c1_infamiliar} />
        <RowDemoChild label="C.2. Abuso Sexual" data={data.bloco1.c2_abuso} />
        <RowDemoChild label="C.3. Exploração Sexual" data={data.bloco1.c3_exploracao} />
        <RowDemoChild label="C.4. Negligência / Abandono" data={data.bloco1.c4_negligencia} />
      </View>
    </View>

    {/* C.5 TRABALHO INFANTIL */}
    <View style={globalStyles.section} wrap={false}>
      <View style={globalStyles.table}>
        <View style={globalStyles.row}>
          <Text style={[globalStyles.cell, globalStyles.headerCell, localStyles.colLabel]}>C.5. TRABALHO INFANTIL</Text>
          <Text style={[globalStyles.cell, globalStyles.headerCell, localStyles.colTotal, { textAlign: 'center' }]}>TOT</Text>
          <Text style={[globalStyles.cell, globalStyles.headerCell, localStyles.colSex]}></Text>
          <Text style={[globalStyles.cell, globalStyles.headerCell, localStyles.colAge2, { textAlign: 'center' }]}>0-12 ANOS</Text>
          <Text style={[globalStyles.cell, globalStyles.headerCell, localStyles.colAge2, { textAlign: 'center' }]}>13-15 ANOS</Text>
        </View>
        <RowDemoLabor label="Casos Identificados" data={data.bloco1.c5_trabalho_infantil} />
      </View>
    </View>

    <View break />

    {/* D. IDOSOS / OUTROS GRUPOS */}
    <View style={globalStyles.section} wrap={false}>
      <View style={globalStyles.table}>
        <RowSimple label="D. IDOSOS (VIOLAÇÕES)" isHeader />
        <RowSimple label="D.1. Violência Física, Psicológica ou Patrimonial" value={data.bloco1.d1_violencia} />
        <RowSimple label="D.2. Negligência ou Abandono" value={data.bloco1.d2_negligencia} />
      </View>
    </View>

    <View style={globalStyles.section} wrap={false}>
      <View style={globalStyles.table}>
        <View style={globalStyles.row}>
          <Text style={[globalStyles.cell, globalStyles.headerCell, localStyles.colLabel]}>E / G / I. OUTROS GRUPOS</Text>
          <Text style={[globalStyles.cell, globalStyles.headerCell, localStyles.colTotal, { textAlign: 'center' }]}>TOT</Text>
          <Text style={[globalStyles.cell, globalStyles.headerCell, localStyles.colSex]}></Text>
          <Text style={[globalStyles.cell, globalStyles.headerCell, localStyles.colAge4, { textAlign: 'center' }]}>0-12</Text>
          <Text style={[globalStyles.cell, globalStyles.headerCell, localStyles.colAge4, { textAlign: 'center' }]}>13-17</Text>
          <Text style={[globalStyles.cell, globalStyles.headerCell, localStyles.colAge4, { textAlign: 'center' }]}>18-59</Text>
          <Text style={[globalStyles.cell, globalStyles.headerCell, localStyles.colAge4, { textAlign: 'center' }]}>60+</Text>
        </View>
        <RowDemoStandard label="E.1. PCD: Violência Intrafamiliar" data={data.bloco1.e1_violencia} />
        <RowDemoStandard label="E.2. PCD: Negligência/Abandono" data={data.bloco1.e2_negligencia} />
        <RowDemoStandard label="G.1. Tráfico de Pessoas" data={data.bloco1.g1_trafico} />
        <RowDemoStandard label="I.1. População em Situação de Rua" data={data.bloco1.i1_rua} />
      </View>
    </View>

    {/* F / H - MULHERES E DISCRIMINAÇÃO */}
    <View style={globalStyles.section} wrap={false}>
      <View style={globalStyles.table}>
        <RowSimple label="F / H. MULHERES E DISCRIMINAÇÃO" isHeader />
        <RowSimple label="F.1. Mulheres: Violência Doméstica/Intrafamiliar" value={data.bloco1.f1_mulheres} />
        <RowSimple label="H.1. Discriminação por Orientação Sexual/Gênero" value={data.bloco1.h1_discriminacao} />
      </View>
    </View>

    {/* BLOCO II - ATENDIMENTOS */}
    <View style={globalStyles.section} wrap={false}>
      <Text style={globalStyles.sectionTitle}>Bloco II - Atendimentos Realizados</Text>
      
      <View style={globalStyles.table}>
        <RowSimple label="M. DESCRIÇÃO DO ATENDIMENTO" isHeader />
        <RowSimple label="M.1. Atendimentos individualizados (Técnicos)" value={data.bloco2.m1_individual} />
        <RowSimple label="M.2. Atendimentos em grupo (Participantes)" value={data.bloco2.m2_grupo} />
        <RowSimple label="M.3. Encaminhamentos para CRAS" value={data.bloco2.m3_cras} />
        <RowSimple label="M.4. Visitas Domiciliares realizadas" value={data.bloco2.m4_visitas} />
      </View>
    </View>

    {/* ASSINATURAS */}
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 30 }} wrap={false}>
      <View style={{ width: '40%', alignItems: 'center' }}>
        <View style={{ borderBottomWidth: 1, width: '100%', marginBottom: 5 }} />
        <Text style={{ fontSize: 8, color: COLORS.textSecondary, textTransform: 'uppercase' }}>Responsável Técnico</Text>
      </View>
      <View style={{ width: '40%', alignItems: 'center' }}>
        <View style={{ borderBottomWidth: 1, width: '100%', marginBottom: 5 }} />
        <Text style={{ fontSize: 8, color: COLORS.textSecondary, textTransform: 'uppercase' }}>Coordenação do CREAS</Text>
      </View>
    </View>

  </ReportLayout>
);