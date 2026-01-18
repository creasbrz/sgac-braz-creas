// frontend/src/components/reports/templates/DismissalDoc.tsx
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportLayout, styles } from './ReportLayout'; 
import { DismissalReportData } from '@/types/case';

interface DismissalDocProps {
  data: DismissalReportData;
}

// Estilos locais apenas para o layout específico desta página (Grid de KPIs)
const localStyles = StyleSheet.create({
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
    marginBottom: 20,
  }
});

export const DismissalDoc = ({ data }: DismissalDocProps) => {
  // Ordenação para melhor leitura (Maior -> Menor)
  const sortedReasons = [...data.byReason].sort((a, b) => b.value - a.value);

  // Cores locais
  const colors = {
    success: '#16a34a',
    danger: '#dc2626',
    secondary: '#4b5563',
    primary: '#111827'
  };

  return (
    <ReportLayout 
      title="Relatório Analítico de Desligamentos" 
      subtitle={`Período de Análise: ${data.periodo}`}
    >
      
      {/* 1. KPIs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Indicadores de Desempenho</Text>
        
        {/* Container Flex (Local) */}
        <View style={localStyles.kpiRow}>
          
          {/* Box (Do ReportLayout) + Customização de Borda */}
          <View style={[styles.kpiContainer, { borderLeftWidth: 4, borderLeftColor: colors.primary, flex: 1 }]}>
            <Text style={styles.kpiLabel}>Total Desligamentos</Text>
            <Text style={styles.kpiValue}>{data.total}</Text>
          </View>
          
          <View style={[styles.kpiContainer, { borderLeftWidth: 4, borderLeftColor: colors.success, flex: 1 }]}>
            <Text style={styles.kpiLabel}>Taxa de Sucesso</Text>
            <Text style={[styles.kpiValue, { color: colors.success }]}>
              {data.successRate}%
            </Text>
          </View>
          
          <View style={[styles.kpiContainer, { borderLeftWidth: 4, borderLeftColor: colors.danger, flex: 1 }]}>
            <Text style={styles.kpiLabel}>Índice de Evasão</Text>
            <Text style={[styles.kpiValue, { color: colors.danger }]}>
              {data.evasionRate}%
            </Text>
          </View>

        </View>
      </View>

      {/* 2. Motivos (Tabela) */}
      <View style={styles.section} wrap={false}>
        <Text style={styles.sectionTitle}>2. Motivos de Desligamento</Text>
        <View style={styles.table}>
          {/* Header */}
          <View style={[styles.row, styles.headerCell]}>
            <Text style={[styles.cell, { width: '70%', fontWeight: 'bold' }]}>MOTIVO REGISTRADO</Text>
            <Text style={[styles.cell, styles.textCenter, { width: '15%', fontWeight: 'bold' }]}>QTD</Text>
            <Text style={[styles.cell, styles.textRight, { width: '15%', fontWeight: 'bold' }]}>%</Text>
          </View>
          
          {/* Rows */}
          {sortedReasons.map((r, i) => (
            <View key={i} style={[styles.row, i % 2 !== 0 ? { backgroundColor: '#f9fafb' } : {}]}>
              <Text style={[styles.cell, { width: '70%' }]}>{r.name}</Text>
              <Text style={[styles.cell, styles.textCenter, { width: '15%' }]}>{r.value}</Text>
              <Text style={[styles.cell, styles.textRight, { width: '15%' }]}>
                {data.total > 0 ? ((r.value / data.total) * 100).toFixed(1) : 0}%
              </Text>
            </View>
          ))}

          {sortedReasons.length === 0 ? (
            <View style={styles.row}>
              <Text style={[styles.cell, styles.textCenter, { width: '100%', color: colors.secondary, padding: 10 }]}>
                Nenhum registro encontrado no período.
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* 3. Evolução Temporal */}
      <View style={styles.section} wrap={false}>
        <Text style={styles.sectionTitle}>3. Evolução Mensal</Text>
        <View style={styles.table}>
          {/* Header */}
          <View style={[styles.row, styles.headerCell]}>
            <Text style={[styles.cell, { width: '60%', fontWeight: 'bold' }]}>MÊS DE REFERÊNCIA</Text>
            <Text style={[styles.cell, styles.textRight, { width: '40%', fontWeight: 'bold' }]}>VOLUME DE SAÍDAS</Text>
          </View>
          
          {/* Rows */}
          {data.monthlyTrend.map((m, i) => (
            <View key={i} style={[styles.row, i % 2 !== 0 ? { backgroundColor: '#f9fafb' } : {}]}>
              <Text style={[styles.cell, { width: '60%' }]}>{m.name}</Text>
              <Text style={[styles.cell, styles.textRight, styles.bold, { width: '40%' }]}>{m.value}</Text>
            </View>
          ))}

          {data.monthlyTrend.length === 0 ? (
            <View style={styles.row}>
              <Text style={[styles.cell, styles.textCenter, { width: '100%', color: colors.secondary, padding: 10 }]}>
                Sem dados para exibir.
              </Text>
            </View>
          ) : null}
        </View>
      </View>

    </ReportLayout>
  );
};