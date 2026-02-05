// frontend/src/components/reports/templates/DismissalDoc.tsx
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportLayout, styles as globalStyles } from './ReportLayout';
import { DismissalReportData } from '@/types/case';

// --- CONFIGURAÇÃO E CONSTANTES ---
const COLORS = {
  success: '#16a34a',
  danger: '#dc2626',
  primary: '#111827',
  secondary: '#4b5563',
  bgLight: '#f9fafb',
};

// Estilos locais específicos
const localStyles = StyleSheet.create({
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
    marginBottom: 20,
  },
  kpiLabel: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  tableRowOdd: {
    backgroundColor: COLORS.bgLight
  },
  emptyState: {
    fontSize: 9,
    color: '#94a3b8',
    fontStyle: 'italic',
    padding: 10,
    textAlign: 'center',
    width: '100%',
  }
});

// --- SUB-COMPONENTES ---

interface KpiBoxProps {
  label: string;
  value: string | number;
  color?: string;
  borderColor: string;
}

const KpiBox = ({ label, value, color = COLORS.primary, borderColor }: KpiBoxProps) => (
  <View style={[globalStyles.kpiContainer, { borderLeftWidth: 4, borderLeftColor: borderColor, flex: 1 }]}>
    <Text style={localStyles.kpiLabel}>{label}</Text>
    <Text style={[localStyles.kpiValue, { color }]}>{value}</Text>
  </View>
);

interface TableRowProps {
  isOdd: boolean;
  cols: { text: string | number; width: string; align?: 'left' | 'right' | 'center'; bold?: boolean }[];
}

const TableRow = ({ isOdd, cols }: TableRowProps) => (
  <View style={[globalStyles.row, isOdd ? localStyles.tableRowOdd : {}]}>
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

// --- COMPONENTE PRINCIPAL ---

interface DismissalDocProps {
  data: DismissalReportData;
}

export const DismissalDoc = ({ data }: DismissalDocProps) => {
  // Ordenação para melhor leitura (Maior -> Menor)
  // O TypeScript agora reconhece 'byReason' graças à correção no types/case.ts
  const sortedReasons = [...data.byReason].sort((a, b) => b.value - a.value);

  return (
    <ReportLayout
      title="Relatório Analítico de Desligamentos"
      subtitle={`Período de Análise: ${data.periodo}`}
    >

      {/* 1. KPIs */}
      <View style={globalStyles.section}>
        <Text style={globalStyles.sectionTitle}>1. Indicadores de Desempenho</Text>
        
        <View style={localStyles.kpiRow}>
          <KpiBox
            label="Total Desligamentos"
            value={data.total}
            borderColor={COLORS.primary}
          />
          
          <KpiBox
            label="Taxa de Sucesso"
            value={`${data.successRate}%`}
            color={COLORS.success}
            borderColor={COLORS.success}
          />
          
          <KpiBox
            label="Índice de Evasão"
            value={`${data.evasionRate}%`}
            color={COLORS.danger}
            borderColor={COLORS.danger}
          />
        </View>
      </View>

      {/* 2. Motivos (Tabela) */}
      <View style={globalStyles.section} wrap={false}>
        <Text style={globalStyles.sectionTitle}>2. Motivos de Desligamento</Text>
        <View style={globalStyles.table}>
          
          {/* Header */}
          <View style={[globalStyles.row, globalStyles.headerCell]}>
            <Text style={[globalStyles.cell, { width: '70%', fontWeight: 'bold' }]}>MOTIVO REGISTRADO</Text>
            <Text style={[globalStyles.cell, globalStyles.textCenter, { width: '15%', fontWeight: 'bold' }]}>QTD</Text>
            <Text style={[globalStyles.cell, globalStyles.textRight, { width: '15%', fontWeight: 'bold' }]}>%</Text>
          </View>
          
          {/* Rows */}
          {sortedReasons.map((r, i) => (
            <TableRow
              key={i}
              isOdd={i % 2 !== 0}
              cols={[
                { text: r.name, width: '70%' },
                { text: r.value, width: '15%', align: 'center' },
                { 
                  text: data.total > 0 ? `${((r.value / data.total) * 100).toFixed(1)}%` : '0%', 
                  width: '15%', 
                  align: 'right' 
                }
              ]}
            />
          ))}

          {sortedReasons.length === 0 && (
            <Text style={localStyles.emptyState}>Nenhum registro encontrado no período.</Text>
          )}
        </View>
      </View>

      {/* 3. Evolução Temporal */}
      <View style={globalStyles.section} wrap={false}>
        <Text style={globalStyles.sectionTitle}>3. Evolução Mensal</Text>
        <View style={globalStyles.table}>
          
          {/* Header */}
          <View style={[globalStyles.row, globalStyles.headerCell]}>
            <Text style={[globalStyles.cell, { width: '60%', fontWeight: 'bold' }]}>MÊS DE REFERÊNCIA</Text>
            <Text style={[globalStyles.cell, globalStyles.textRight, { width: '40%', fontWeight: 'bold' }]}>VOLUME DE SAÍDAS</Text>
          </View>
          
          {/* Rows */}
          {data.monthlyTrend.map((m, i) => (
            <TableRow
              key={i}
              isOdd={i % 2 !== 0}
              cols={[
                { text: m.name, width: '60%' },
                { text: m.value, width: '40%', align: 'right', bold: true }
              ]}
            />
          ))}

          {data.monthlyTrend.length === 0 && (
             <Text style={localStyles.emptyState}>Sem dados para exibir.</Text>
          )}
        </View>
      </View>

    </ReportLayout>
  );
};