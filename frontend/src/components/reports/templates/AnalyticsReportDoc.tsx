// frontend/src/components/reports/templates/AnalyticsReportDoc.tsx
import { Text, View } from '@react-pdf/renderer';
import { ReportLayout, styles } from './ReportLayout'; // Importando layout unificado
import { AnalyticsReportData } from '@/types/case';

interface AnalyticsDocProps {
  data: AnalyticsReportData;
}

export const AnalyticsReportDoc = ({ data }: AnalyticsDocProps) => (
  <ReportLayout 
    title="Relatório de Inteligência de Dados" 
    subtitle={`Período de Análise: Últimos ${data.periodo} meses`}
  >
    
    {/* 1. KPIs */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>1. INDICADORES DE PERFORMANCE (KPIs)</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
        
        <View style={[styles.kpiContainer, { flex: 1, borderLeftWidth: 4, borderLeftColor: '#2563eb' }]}>
          <Text style={styles.kpiLabel}>Tempo Médio Resolução</Text>
          <Text style={[styles.kpiValue, { color: '#2563eb' }]}>{Math.round(data.kpis.tempoMedio)} dias</Text>
        </View>

        <View style={[styles.kpiContainer, { flex: 1, borderLeftWidth: 4, borderLeftColor: '#7c3aed' }]}>
          <Text style={styles.kpiLabel}>Casos Ativos (PAEFI)</Text>
          <Text style={[styles.kpiValue, { color: '#7c3aed' }]}>{data.kpis.ativosPaefi}</Text>
        </View>

        {data.kpis.previsaoNovos !== null && (
          <View style={[styles.kpiContainer, { flex: 1, borderLeftWidth: 4, borderLeftColor: '#16a34a' }]}>
            <Text style={styles.kpiLabel}>Previsão (Próx. Mês)</Text>
            <Text style={[styles.kpiValue, { color: '#16a34a' }]}>~{Math.round(data.kpis.previsaoNovos)} novos</Text>
          </View>
        )}
      </View>
    </View>

    {/* 2. Insights */}
    {data.insights.length > 0 && (
      <View style={styles.section} wrap={false}>
        <Text style={styles.sectionTitle}>2. ANÁLISE AUTOMÁTICA E TENDÊNCIAS</Text>
        {data.insights.map((insight, index) => (
          <View key={index} style={{ marginBottom: 8, padding: 8, backgroundColor: '#eff6ff', borderLeftWidth: 3, borderLeftColor: '#2563eb', borderRadius: 2 }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#1e40af', marginBottom: 2 }}>{insight.title}</Text>
            <Text style={{ fontSize: 9, color: '#334155', textAlign: 'justify', lineHeight: 1.3 }}>{insight.description}</Text>
          </View>
        ))}
      </View>
    )}

    {/* 3. Fluxo */}
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionTitle}>3. FLUXO DE ENTRADAS E SAÍDAS</Text>
      <View style={styles.table}>
        <View style={[styles.row, styles.headerCell]}>
          <Text style={[styles.cell, { width: '40%', fontWeight: 'bold' }]}>REFERÊNCIA</Text>
          <Text style={[styles.cell, styles.textCenter, { width: '20%', fontWeight: 'bold' }]}>NOVOS</Text>
          <Text style={[styles.cell, styles.textCenter, { width: '20%', fontWeight: 'bold' }]}>DESLIGADOS</Text>
          <Text style={[styles.cell, styles.textRight, { width: '20%', fontWeight: 'bold' }]}>SALDO</Text>
        </View>
        {data.fluxo.map((item, i) => {
          const saldo = item.novos - item.fechados;
          const saldoColor = saldo > 0 ? '#2563eb' : (saldo < 0 ? '#16a34a' : '#4b5563');
          return (
            <View key={i} style={[styles.row, i % 2 !== 0 ? { backgroundColor: '#f9fafb' } : {}]}>
              <Text style={[styles.cell, { width: '40%' }]}>{item.name}</Text>
              <Text style={[styles.cell, styles.textCenter, { width: '20%' }]}>{item.novos}</Text>
              <Text style={[styles.cell, styles.textCenter, { width: '20%' }]}>{item.fechados}</Text>
              <Text style={[styles.cell, styles.textRight, styles.bold, { width: '20%', color: saldoColor }]}>
                {saldo > 0 ? `+${saldo}` : saldo}
              </Text>
            </View>
          );
        })}
      </View>
    </View>

    {/* 4. Layout Lado a Lado (Violações e Produtividade) */}
    <View style={{ flexDirection: 'row', gap: 20 }}>
      
      {/* Violações */}
      <View style={{ width: '55%' }} wrap={false}>
        <Text style={styles.sectionTitle}>4. TIPIFICAÇÃO DAS VIOLAÇÕES</Text>
        <View style={styles.table}>
          <View style={[styles.row, styles.headerCell]}>
            <Text style={[styles.cell, { width: '65%', fontWeight: 'bold' }]}>NATUREZA</Text>
            <Text style={[styles.cell, styles.textCenter, { width: '15%', fontWeight: 'bold' }]}>QTD</Text>
            <Text style={[styles.cell, styles.textRight, { width: '20%', fontWeight: 'bold' }]}>%</Text>
          </View>
          {data.violacoes.map((v, i) => (
            <View key={i} style={[styles.row, i % 2 !== 0 ? { backgroundColor: '#f9fafb' } : {}]}>
              <Text style={[styles.cell, { width: '65%', fontSize: 9 }]}>
                {v.name.length > 28 ? v.name.substring(0, 28) + '...' : v.name}
              </Text>
              <Text style={[styles.cell, styles.textCenter, { width: '15%' }]}>{v.value}</Text>
              <Text style={[styles.cell, styles.textRight, { width: '20%', color: '#4b5563' }]}>
                {v.percent.toFixed(1)}%
              </Text>
            </View>
          ))}
          {data.violacoes.length === 0 && (
             <Text style={[styles.cell, styles.textCenter, { color: '#666', padding: 10, width: '100%' }]}>Nenhum registro.</Text>
          )}
        </View>
      </View>

      {/* Produtividade */}
      <View style={{ width: '45%' }} wrap={false}>
        <Text style={styles.sectionTitle}>5. PRODUTIVIDADE</Text>
        <View style={styles.table}>
          <View style={[styles.row, styles.headerCell]}>
            <Text style={[styles.cell, { width: '70%', fontWeight: 'bold' }]}>PROFISSIONAL</Text>
            <Text style={[styles.cell, styles.textRight, { width: '30%', fontWeight: 'bold' }]}>AÇÕES</Text>
          </View>
          {data.produtividade.map((p, i) => (
            <View key={i} style={[styles.row, i % 2 !== 0 ? { backgroundColor: '#f9fafb' } : {}]}>
              <Text style={[styles.cell, { width: '70%', fontSize: 9 }]}>
                {p.name.length > 18 ? p.name.substring(0, 18) + '...' : p.name}
              </Text>
              <Text style={[styles.cell, styles.textRight, styles.bold, { width: '30%' }]}>{p.value}</Text>
            </View>
          ))}
          {data.produtividade.length === 0 && (
             <Text style={[styles.cell, styles.textCenter, { color: '#666', padding: 10, width: '100%' }]}>Sem dados.</Text>
          )}
        </View>
      </View>

    </View>

    {/* Nota de Rodapé Local */}
    <View style={{ marginTop: 20, paddingTop: 5, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
       <Text style={{ fontSize: 8, color: '#666', textAlign: 'justify' }}>
          Nota Técnica: As previsões apresentadas no item 1 são estimativas baseadas em regressão linear simples dos dados históricos do período selecionado.
      </Text>
    </View>

  </ReportLayout>
);