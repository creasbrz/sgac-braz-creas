import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportLayout, styles } from './ReportLayout'; // Estilos globais
import { RmaReportData, AgeBreakdown, ChildBreakdown, ChildLaborBreakdown } from '@/types/case';

// --- ESTILOS LOCAIS (Específicos para a densidade do RMA) ---
const localStyles = StyleSheet.create({
  // Ajuste de fonte para tabelas densas
  denseText: { fontSize: 8 },
  
  // Larguras de Colunas Específicas do RMA
  colLabel: { width: '45%' },
  colTotal: { width: '8%' },
  colSex: { width: '7%' },
  
  // Distribuição de Faixas Etárias
  colAge4: { width: '10%' },    // 4 colunas (0-12, 13-17, 18-59, 60+)
  colAge3: { width: '13.33%' }, // 3 colunas (0-6, 7-12, 13-17)
  colAge2: { width: '20%' },    // 2 colunas (0-12, 13-15)
});

// --- COMPONENTES AUXILIARES ---

const RowSimple = ({ label, value, bg }: { label: string, value: number, bg?: string }) => (
  <View style={[styles.row, bg ? { backgroundColor: bg } : {}]}>
    <Text style={[styles.cell, localStyles.denseText, { width: '92%' }]}>{label}</Text>
    <Text style={[styles.cell, styles.textCenter, styles.bold, localStyles.denseText, { width: '8%' }]}>{value}</Text>
  </View>
);

const RowDemoStandard = ({ label, data }: { label: string, data: AgeBreakdown }) => (
  <View>
    <View style={[styles.row, { borderBottomWidth: 0 }]}>
      <Text style={[styles.cell, localStyles.colLabel, localStyles.denseText]}>{label}</Text>
      <Text style={[styles.cell, styles.textCenter, styles.bold, localStyles.colTotal, localStyles.denseText]}>{data.total}</Text>
      <Text style={[styles.cell, styles.textCenter, localStyles.colSex, { fontSize: 6 }]}>MASC</Text>
      <Text style={[styles.cell, styles.textCenter, localStyles.colAge4, localStyles.denseText]}>{data.masculino.a0_12}</Text>
      <Text style={[styles.cell, styles.textCenter, localStyles.colAge4, localStyles.denseText]}>{data.masculino.a13_17}</Text>
      <Text style={[styles.cell, styles.textCenter, localStyles.colAge4, localStyles.denseText]}>{data.masculino.a18_59}</Text>
      <Text style={[styles.cell, styles.textCenter, localStyles.colAge4, localStyles.denseText]}>{data.masculino.a60_mais}</Text>
    </View>
    <View style={styles.row}>
      <View style={[styles.cell, localStyles.colLabel]} />
      <View style={[styles.cell, localStyles.colTotal, { backgroundColor: '#f9fafb' }]} />
      <Text style={[styles.cell, styles.textCenter, localStyles.colSex, { fontSize: 6 }]}>FEM</Text>
      <Text style={[styles.cell, styles.textCenter, localStyles.colAge4, localStyles.denseText]}>{data.feminino.a0_12}</Text>
      <Text style={[styles.cell, styles.textCenter, localStyles.colAge4, localStyles.denseText]}>{data.feminino.a13_17}</Text>
      <Text style={[styles.cell, styles.textCenter, localStyles.colAge4, localStyles.denseText]}>{data.feminino.a18_59}</Text>
      <Text style={[styles.cell, styles.textCenter, localStyles.colAge4, localStyles.denseText]}>{data.feminino.a60_mais}</Text>
    </View>
  </View>
);

const RowDemoChild = ({ label, data }: { label: string, data: ChildBreakdown }) => (
  <View>
    <View style={[styles.row, { borderBottomWidth: 0 }]}>
      <Text style={[styles.cell, localStyles.colLabel, localStyles.denseText]}>{label}</Text>
      <Text style={[styles.cell, styles.textCenter, styles.bold, localStyles.colTotal, localStyles.denseText]}>{data.total}</Text>
      <Text style={[styles.cell, styles.textCenter, localStyles.colSex, { fontSize: 6 }]}>MASC</Text>
      <Text style={[styles.cell, styles.textCenter, localStyles.colAge3, localStyles.denseText]}>{data.masculino.a0_6}</Text>
      <Text style={[styles.cell, styles.textCenter, localStyles.colAge3, localStyles.denseText]}>{data.masculino.a7_12}</Text>
      <Text style={[styles.cell, styles.textCenter, localStyles.colAge3, localStyles.denseText]}>{data.masculino.a13_17}</Text>
    </View>
    <View style={styles.row}>
      <View style={[styles.cell, localStyles.colLabel]} />
      <View style={[styles.cell, localStyles.colTotal, { backgroundColor: '#f9fafb' }]} />
      <Text style={[styles.cell, styles.textCenter, localStyles.colSex, { fontSize: 6 }]}>FEM</Text>
      <Text style={[styles.cell, styles.textCenter, localStyles.colAge3, localStyles.denseText]}>{data.feminino.a0_6}</Text>
      <Text style={[styles.cell, styles.textCenter, localStyles.colAge3, localStyles.denseText]}>{data.feminino.a7_12}</Text>
      <Text style={[styles.cell, styles.textCenter, localStyles.colAge3, localStyles.denseText]}>{data.feminino.a13_17}</Text>
    </View>
  </View>
);

const RowDemoLabor = ({ label, data }: { label: string, data: ChildLaborBreakdown }) => (
  <View>
    <View style={[styles.row, { borderBottomWidth: 0 }]}>
      <Text style={[styles.cell, localStyles.colLabel, localStyles.denseText]}>{label}</Text>
      <Text style={[styles.cell, styles.textCenter, styles.bold, localStyles.colTotal, localStyles.denseText]}>{data.total}</Text>
      <Text style={[styles.cell, styles.textCenter, localStyles.colSex, { fontSize: 6 }]}>MASC</Text>
      <Text style={[styles.cell, styles.textCenter, localStyles.colAge2, localStyles.denseText]}>{data.masculino.a0_12}</Text>
      <Text style={[styles.cell, styles.textCenter, localStyles.colAge2, localStyles.denseText]}>{data.masculino.a13_15}</Text>
    </View>
    <View style={styles.row}>
      <View style={[styles.cell, localStyles.colLabel]} />
      <View style={[styles.cell, localStyles.colTotal, { backgroundColor: '#f9fafb' }]} />
      <Text style={[styles.cell, styles.textCenter, localStyles.colSex, { fontSize: 6 }]}>FEM</Text>
      <Text style={[styles.cell, styles.textCenter, localStyles.colAge2, localStyles.denseText]}>{data.feminino.a0_12}</Text>
      <Text style={[styles.cell, styles.textCenter, localStyles.colAge2, localStyles.denseText]}>{data.feminino.a13_15}</Text>
    </View>
  </View>
);

export const RmaDoc = ({ data }: { data: RmaReportData }) => (
  <ReportLayout 
    title="Registro Mensal de Atendimentos (RMA)" 
    subtitle={`Referência: ${data.periodo}`}
  >

    {/* BLOCO I */}
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionTitle}>Bloco I - PAEFI (Acompanhamento)</Text>

      <View style={styles.table}>
        <View style={styles.row}>
          <Text style={[styles.cell, styles.headerCell, { width: '92%', textAlign: 'left', paddingLeft: 5 }]}>
            A. VOLUME / B. PERFIL (NOVOS CASOS)
          </Text>
          <Text style={[styles.cell, styles.headerCell, { width: '8%', textAlign: 'center' }]}>TOTAL</Text>
        </View>
        
        <RowSimple label="A.1. Total de casos em acompanhamento (Estoque)" value={data.bloco1.a1_total_acompanhamento} />
        <RowSimple label="A.2. Novos casos inseridos no mês" value={data.bloco1.a2_novos_casos} />
        
        <View style={[styles.row, { backgroundColor: '#f3f4f6' }]}>
          <Text style={[styles.cell, styles.bold, { width: '100%', fontSize: 8 }]}>B. DETALHAMENTO DO PERFIL DOS NOVOS CASOS</Text>
        </View>
        
        <RowSimple label="B.1. Famílias beneficiárias do Bolsa Família" value={data.bloco1.b1_bolsa_familia} />
        <RowSimple label="B.2. Famílias com membros beneficiários do BPC" value={data.bloco1.b2_bpc} />
        <RowSimple label="B.3. Situação de Trabalho Infantil" value={data.bloco1.b3_trabalho_infantil} />
        <RowSimple label="B.4. Situação de Acolhimento" value={data.bloco1.b4_acolhimento} />
        <RowSimple label="B.5. Violência associada ao uso abusivo de substâncias" value={data.bloco1.b5_drogas} />
        <RowSimple label="B.7. Adolescente em cumprimento de MSE" value={data.bloco1.b7_mse} />
      </View>
    </View>

    {/* --- B.6 DEMOGRAFIA GERAL --- */}
    <View style={styles.section} wrap={false}>
      <View style={styles.table}>
        <View style={styles.row}>
          <Text style={[styles.cell, styles.headerCell, localStyles.colLabel, { textAlign: 'left' }]}>B.6. PESSOAS VITIMADAS (NOVOS)</Text>
          <Text style={[styles.cell, styles.headerCell, localStyles.colTotal]}>TOT</Text>
          <Text style={[styles.cell, styles.headerCell, localStyles.colSex]}>SX</Text>
          <Text style={[styles.cell, styles.headerCell, localStyles.colAge4]}>0-12</Text>
          <Text style={[styles.cell, styles.headerCell, localStyles.colAge4]}>13-17</Text>
          <Text style={[styles.cell, styles.headerCell, localStyles.colAge4]}>18-59</Text>
          <Text style={[styles.cell, styles.headerCell, localStyles.colAge4]}>60+</Text>
        </View>
        <RowDemoStandard label="Ingressos no mês" data={data.bloco1.b6_vitimas} />
      </View>
    </View>

    {/* --- C. CRIANÇAS E ADOLESCENTES --- */}
    <View style={styles.section} wrap={false}>
      <View style={styles.table}>
        <View style={styles.row}>
          <Text style={[styles.cell, styles.headerCell, localStyles.colLabel, { textAlign: 'left' }]}>C. CRIANÇAS E ADOLESCENTES</Text>
          <Text style={[styles.cell, styles.headerCell, localStyles.colTotal]}>TOT</Text>
          <Text style={[styles.cell, styles.headerCell, localStyles.colSex]}>SX</Text>
          <Text style={[styles.cell, styles.headerCell, localStyles.colAge3]}>0-6</Text>
          <Text style={[styles.cell, styles.headerCell, localStyles.colAge3]}>7-12</Text>
          <Text style={[styles.cell, styles.headerCell, localStyles.colAge3]}>13-17</Text>
        </View>
        <RowDemoChild label="C.1. Violência Intrafamiliar (Física/Psico)" data={data.bloco1.c1_infamiliar} />
        <RowDemoChild label="C.2. Abuso Sexual" data={data.bloco1.c2_abuso} />
        <RowDemoChild label="C.3. Exploração Sexual" data={data.bloco1.c3_exploracao} />
        <RowDemoChild label="C.4. Negligência / Abandono" data={data.bloco1.c4_negligencia} />
      </View>
    </View>

    {/* --- C.5 TRABALHO INFANTIL --- */}
    <View style={styles.section} wrap={false}>
      <View style={styles.table}>
        <View style={styles.row}>
          <Text style={[styles.cell, styles.headerCell, localStyles.colLabel, { textAlign: 'left' }]}>C.5. TRABALHO INFANTIL</Text>
          <Text style={[styles.cell, styles.headerCell, localStyles.colTotal]}>TOT</Text>
          <Text style={[styles.cell, styles.headerCell, localStyles.colSex]}>SX</Text>
          <Text style={[styles.cell, styles.headerCell, localStyles.colAge2]}>0-12 ANOS</Text>
          <Text style={[styles.cell, styles.headerCell, localStyles.colAge2]}>13-15 ANOS</Text>
        </View>
        <RowDemoLabor label="Casos Identificados" data={data.bloco1.c5_trabalho_infantil} />
      </View>
    </View>

    {/* --- D. IDOSOS --- */}
    <View style={styles.section} wrap={false}>
      <View style={styles.table}>
        <View style={[styles.row, { backgroundColor: '#f3f4f6' }]}>
          <Text style={[styles.cell, styles.bold, { width: '100%', fontSize: 8 }]}>D. IDOSOS (VIOLAÇÕES)</Text>
        </View>
        <RowSimple label="D.1. Violência Física, Psicológica ou Patrimonial" value={data.bloco1.d1_violencia} />
        <RowSimple label="D.2. Negligência ou Abandono" value={data.bloco1.d2_negligencia} />
      </View>
    </View>

    {/* --- E / G / I - OUTROS GRUPOS --- */}
    <View style={styles.section} wrap={false}>
      <View style={styles.table}>
        <View style={styles.row}>
          <Text style={[styles.cell, styles.headerCell, localStyles.colLabel, { textAlign: 'left' }]}>E / G / I. OUTROS GRUPOS</Text>
          <Text style={[styles.cell, styles.headerCell, localStyles.colTotal]}>TOT</Text>
          <Text style={[styles.cell, styles.headerCell, localStyles.colSex]}>SX</Text>
          <Text style={[styles.cell, styles.headerCell, localStyles.colAge4]}>0-12</Text>
          <Text style={[styles.cell, styles.headerCell, localStyles.colAge4]}>13-17</Text>
          <Text style={[styles.cell, styles.headerCell, localStyles.colAge4]}>18-59</Text>
          <Text style={[styles.cell, styles.headerCell, localStyles.colAge4]}>60+</Text>
        </View>
        <RowDemoStandard label="E.1. PCD: Violência Intrafamiliar" data={data.bloco1.e1_violencia} />
        <RowDemoStandard label="E.2. PCD: Negligência/Abandono" data={data.bloco1.e2_negligencia} />
        <RowDemoStandard label="G.1. Tráfico de Pessoas" data={data.bloco1.g1_trafico} />
        <RowDemoStandard label="I.1. População em Situação de Rua" data={data.bloco1.i1_rua} />
      </View>
    </View>

    {/* --- F / H - MULHERES E DISCRIMINAÇÃO --- */}
    <View style={styles.section} wrap={false}>
      <View style={styles.table}>
        <View style={[styles.row, { backgroundColor: '#f3f4f6' }]}>
          <Text style={[styles.cell, styles.bold, { width: '100%', fontSize: 8 }]}>F / H. MULHERES E DISCRIMINAÇÃO</Text>
        </View>
        <RowSimple label="F.1. Mulheres: Violência Doméstica/Intrafamiliar" value={data.bloco1.f1_mulheres} />
        <RowSimple label="H.1. Discriminação por Orientação Sexual/Gênero" value={data.bloco1.h1_discriminacao} />
      </View>
    </View>

    {/* BLOCO II - ATENDIMENTOS */}
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionTitle}>Bloco II - Atendimentos Realizados</Text>
      
      <View style={styles.table}>
        <View style={styles.row}>
          <Text style={[styles.cell, styles.headerCell, { width: '92%', textAlign: 'left', paddingLeft: 5 }]}>
            M. DESCRIÇÃO DO ATENDIMENTO
          </Text>
          <Text style={[styles.cell, styles.headerCell, { width: '8%', textAlign: 'center' }]}>QTD</Text>
        </View>
        <RowSimple label="M.1. Atendimentos individualizados (Técnicos)" value={data.bloco2.m1_individual} />
        <RowSimple label="M.2. Atendimentos em grupo (Participantes)" value={data.bloco2.m2_grupo} />
        <RowSimple label="M.3. Encaminhamentos para CRAS" value={data.bloco2.m3_cras} />
        <RowSimple label="M.4. Visitas Domiciliares realizadas" value={data.bloco2.m4_visitas} />
      </View>
    </View>

    {/* ASSINATURAS (Correção de cores aplicada aqui) */}
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 30 }} wrap={false}>
      <View style={{ width: '40%', alignItems: 'center' }}>
        <View style={{ borderBottomWidth: 1, width: '100%', marginBottom: 5 }} />
        <Text style={{ fontSize: 8, color: '#4b5563' }}>Responsável Técnico</Text>
      </View>
      <View style={{ width: '40%', alignItems: 'center' }}>
        <View style={{ borderBottomWidth: 1, width: '100%', marginBottom: 5 }} />
        <Text style={{ fontSize: 8, color: '#4b5563' }}>Coordenação do CREAS</Text>
      </View>
    </View>

  </ReportLayout>
);