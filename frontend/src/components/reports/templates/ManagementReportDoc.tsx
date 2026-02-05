// frontend/src/components/reports/templates/ManagementReportDoc.tsx
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportLayout, styles as globalStyles } from './ReportLayout';
import { ManagementReportData, StatData } from '@/types/case';

// --- CONFIGURAÇÃO E CONSTANTES ---
const COLORS = {
  primary: '#111827',
  blue: '#2563eb',
  green: '#16a34a',
  bgGreen: '#f0fdf4',
  textGreen: '#166534',
  bgBlue: '#eff6ff',
  textBlue: '#1e40af',
  bgLight: '#f9fafb',
  textSecondary: '#6b7280'
};

const localStyles = StyleSheet.create({
  tableTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    padding: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  kpiLabel: {
    fontSize: 8,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 2,
    fontWeight: 'bold',
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary
  },
  signatureBox: {
    marginTop: 40,
    alignItems: 'center',
    width: '100%'
  },
  signatureLine: {
    borderBottomWidth: 1,
    width: '40%',
    marginBottom: 5,
    borderColor: '#333'
  }
});

// --- SUB-COMPONENTES ---

// 1. KPI Box
interface KpiBoxProps {
  label: string;
  value: number | string;
  color?: string;
  borderColor?: string;
}

const KpiBox = ({ label, value, color = COLORS.primary, borderColor = '#e5e7eb' }: KpiBoxProps) => (
  <View style={[globalStyles.kpiContainer, { flex: 1, borderLeftWidth: 4, borderLeftColor: borderColor }]}>
    <Text style={localStyles.kpiLabel}>{label}</Text>
    <Text style={[localStyles.kpiValue, { color }]}>{value}</Text>
  </View>
);

// 2. Linha da Tabela
interface TableRowProps {
  isOdd: boolean;
  cols: { text: string | number; width: string; align?: 'left' | 'right' | 'center'; bold?: boolean }[];
}

const TableRow = ({ isOdd, cols }: TableRowProps) => (
  <View style={[globalStyles.row, isOdd ? { backgroundColor: COLORS.bgLight } : {}]}>
    {cols.map((col, idx) => (
      <Text
        key={idx}
        style={[
          globalStyles.cell,
          {
            width: col.width,
            textAlign: col.align || 'left',
            fontWeight: col.bold ? 'bold' : 'normal',
          }
        ]}
      >
        {col.text}
      </Text>
    ))}
  </View>
);

// 3. Tabela de Equipe Reutilizável
interface TeamTableProps {
  title: string;
  members: StatData[];
  headerColor: { bg: string, text: string };
}

const TeamTable = ({ title, members, headerColor }: TeamTableProps) => (
  <View style={{ width: '50%' }}>
    <Text style={[localStyles.tableTitle, { backgroundColor: headerColor.bg, color: headerColor.text }]}>
      {title}
    </Text>
    
    <View style={globalStyles.table}>
      {/* Header */}
      <View style={[globalStyles.row, globalStyles.headerCell]}>
        <Text style={[globalStyles.cell, { width: '75%', fontWeight: 'bold' }]}>PROFISSIONAL</Text>
        <Text style={[globalStyles.cell, globalStyles.textCenter, { width: '25%', fontWeight: 'bold' }]}>QTD</Text>
      </View>

      {/* Rows */}
      {members.map((m, i) => (
        <TableRow
          key={i}
          isOdd={i % 2 !== 0}
          cols={[
            { text: m.name, width: '75%' },
            { text: m.value, width: '25%', align: 'center', bold: true }
          ]}
        />
      ))}

      {members.length === 0 && (
         <Text style={[globalStyles.cell, globalStyles.textCenter, { width: '100%', padding: 5, fontStyle: 'italic', color: COLORS.textSecondary }]}>
           Nenhum registro.
         </Text>
      )}
    </View>
  </View>
);

// --- COMPONENTE PRINCIPAL ---

interface ManagementDocProps {
  data: ManagementReportData;
}

export const ManagementReportDoc = ({ data }: ManagementDocProps) => (
  <ReportLayout 
    title="Relatório Gerencial de Monitoramento" 
    subtitle={`Período de Referência: ${data.periodo}`}
  >
    
    {/* 1. Indicadores de Volume */}
    <View style={globalStyles.section}>
      <Text style={globalStyles.sectionTitle}>1. INDICADORES DE VOLUME (FLUXO)</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        
        <KpiBox label="ATIVOS TOTAIS" value={data.stats.ativos} borderColor={COLORS.primary} />
        <KpiBox label="ACOLHIDA" value={data.stats.acolhidas} borderColor={COLORS.primary} />
        <KpiBox label="ACOMPANHAMENTO" value={data.stats.paefi} borderColor={COLORS.primary} />
        
        <KpiBox 
          label="NOVOS CASOS" 
          value={data.stats.novos || 0} 
          color={COLORS.blue} 
          borderColor={COLORS.blue} 
        />
        
        <KpiBox 
          label="DESLIGAMENTOS" 
          value={data.stats.desligados || 0} 
          color={COLORS.green} 
          borderColor={COLORS.green} 
        />

      </View>
    </View>

    {/* 2. Equipe Técnica (Comparativo Lado a Lado) */}
    <View style={globalStyles.section} wrap={false}>
      <Text style={globalStyles.sectionTitle}>2. CARGA DE TRABALHO DA EQUIPE</Text>
      
      <View style={{ flexDirection: 'row', gap: 15 }}>
        
        {/* Coluna: Agentes */}
        <TeamTable 
          title="ACOLHIDA (AGENTES)"
          members={data.cargaHoraria.agentes}
          headerColor={{ bg: COLORS.bgGreen, text: COLORS.textGreen }}
        />

        {/* Coluna: Especialistas */}
        <TeamTable 
          title="ACOMPANHAMENTO (ESPECIALISTAS)"
          members={data.cargaHoraria.especialistas}
          headerColor={{ bg: COLORS.bgBlue, text: COLORS.textBlue }}
        />

      </View>
    </View>

    {/* 3. Vigilância (Diferencial deste relatório) */}
    {data.vigilancia && (
      <View style={globalStyles.section} wrap={false}>
        <Text style={globalStyles.sectionTitle}>3. VIGILÂNCIA SOCIOASSISTENCIAL (VIOLAÇÕES)</Text>
        
        <View style={globalStyles.table}>
          {/* Header */}
          <View style={[globalStyles.row, globalStyles.headerCell]}>
            <Text style={[globalStyles.cell, { width: '70%', fontWeight: 'bold' }]}>NATUREZA DA VIOLAÇÃO</Text>
            <Text style={[globalStyles.cell, globalStyles.textCenter, { width: '15%', fontWeight: 'bold' }]}>CASOS</Text>
            <Text style={[globalStyles.cell, globalStyles.textCenter, { width: '15%', fontWeight: 'bold' }]}>INCIDÊNCIA</Text>
          </View>

          {/* Rows */}
          {data.vigilancia.violacoes.map((v, i) => (
            <TableRow
              key={i}
              isOdd={i % 2 !== 0}
              cols={[
                { text: v.name, width: '70%' },
                { text: v.value, width: '15%', align: 'center' },
                { 
                  text: data.stats.ativos > 0 ? `${((v.value / data.stats.ativos) * 100).toFixed(1)}%` : '0%', 
                  width: '15%', 
                  align: 'center' 
                }
              ]}
            />
          ))}

          {data.vigilancia.violacoes.length === 0 && (
             <Text style={[globalStyles.cell, globalStyles.textCenter, { width: '100%', padding: 10, fontStyle: 'italic', color: COLORS.textSecondary }]}>
               Nenhuma violação tipificada registrada no período.
             </Text>
          )}
        </View>
      </View>
    )}

    {/* Assinatura do Gerente */}
    <View style={localStyles.signatureBox} wrap={false}>
      <View style={localStyles.signatureLine} />
      <Text style={{ fontSize: 10, fontWeight: 'bold' }}>Gerência</Text>
      <Text style={{ fontSize: 8, color: COLORS.textSecondary }}>CREAS Brazlândia</Text>
    </View>

  </ReportLayout>
);