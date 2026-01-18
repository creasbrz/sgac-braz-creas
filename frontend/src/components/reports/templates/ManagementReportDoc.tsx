// frontend/src/components/reports/templates/ManagementReportDoc.tsx
import { Text, View } from '@react-pdf/renderer';
import { ReportLayout, styles } from './ReportLayout';
import { ManagementReportData } from '@/types/case';

interface ManagementDocProps {
  data: ManagementReportData;
}

const KpiBox = ({ label, value, color = '#111827' }: { label: string, value: number, color?: string }) => (
  <View style={[styles.kpiContainer, { flex: 1, borderLeftWidth: color !== '#111827' ? 4 : 1, borderLeftColor: color !== '#111827' ? color : '#e5e7eb' }]}>
    <Text style={styles.kpiLabel}>{label}</Text>
    <Text style={[styles.kpiValue, { color }]}>{value}</Text>
  </View>
);

export const ManagementReportDoc = ({ data }: ManagementDocProps) => (
  <ReportLayout 
    title="Relatório Gerencial de Monitoramento" 
    subtitle={`Período de Referência: ${data.periodo}`}
  >
    
    {/* 1. Indicadores de Volume */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>1. INDICADORES DE VOLUME (FLUXO)</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <KpiBox label="ATIVOS TOTAIS" value={data.stats.ativos} />
        <KpiBox label="ACOLHIDA" value={data.stats.acolhidas} />
        <KpiBox label="ACOMPANHAMENTO" value={data.stats.paefi} />
        <KpiBox label="NOVOS CASOS" value={data.stats.novos} color="#2563eb" />
        <KpiBox label="DESLIGAMENTOS" value={data.stats.desligados} color="#16a34a" />
      </View>
    </View>

    {/* 2. Equipe Técnica (Comparativo Lado a Lado) */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>2. CARGA DE TRABALHO DA EQUIPE</Text>
      <View style={{ flexDirection: 'row', gap: 15 }}>
        
        {/* Coluna: Agentes */}
        <View style={{ width: '50%' }}>
          <Text style={{ fontSize: 9, fontWeight: 'bold', textAlign: 'center', marginBottom: 4, backgroundColor: '#f0fdf4', padding: 2, color: '#166534' }}>
             ACOLHIDA
          </Text>
          <View style={styles.table}>
            <View style={[styles.row, styles.headerCell]}>
              <Text style={[styles.cell, { width: '75%', fontWeight: 'bold' }]}>AGENTE SOCIAL</Text>
              <Text style={[styles.cell, styles.textCenter, { width: '25%', fontWeight: 'bold' }]}>QTD</Text>
            </View>
            {data.cargaHoraria.agentes.map((a, i) => (
              <View key={i} style={[styles.row, i % 2 !== 0 ? { backgroundColor: '#f9fafb' } : {}]}>
                <Text style={[styles.cell, { width: '75%' }]}>{a.name}</Text>
                <Text style={[styles.cell, styles.textCenter, styles.bold, { width: '25%' }]}>{a.value}</Text>
              </View>
            ))}
            {data.cargaHoraria.agentes.length === 0 && (
               <Text style={[styles.cell, styles.textCenter, { width: '100%', fontStyle: 'italic', color: '#666', padding: 5 }]}>Nenhum registro</Text>
            )}
          </View>
        </View>

        {/* Coluna: Especialistas */}
        <View style={{ width: '50%' }}>
          <Text style={{ fontSize: 9, fontWeight: 'bold', textAlign: 'center', marginBottom: 4, backgroundColor: '#eff6ff', padding: 2, color: '#1e40af' }}>
             ACOMPANHAMENTO
          </Text>
          <View style={styles.table}>
            <View style={[styles.row, styles.headerCell]}>
              <Text style={[styles.cell, { width: '75%', fontWeight: 'bold' }]}>ESPECIALISTA</Text>
              <Text style={[styles.cell, styles.textCenter, { width: '25%', fontWeight: 'bold' }]}>QTD</Text>
            </View>
            {data.cargaHoraria.especialistas.map((e, i) => (
              <View key={i} style={[styles.row, i % 2 !== 0 ? { backgroundColor: '#f9fafb' } : {}]}>
                <Text style={[styles.cell, { width: '75%' }]}>{e.name}</Text>
                <Text style={[styles.cell, styles.textCenter, styles.bold, { width: '25%' }]}>{e.value}</Text>
              </View>
            ))}
             {data.cargaHoraria.especialistas.length === 0 && (
               <Text style={[styles.cell, styles.textCenter, { width: '100%', fontStyle: 'italic', color: '#666', padding: 5 }]}>Nenhum registro</Text>
            )}
          </View>
        </View>
      </View>
    </View>

    {/* 3. Vigilância (Diferencial deste relatório) */}
    {data.vigilancia && (
      <View style={styles.section} wrap={false}>
        <Text style={styles.sectionTitle}>3. VIGILÂNCIA SOCIOASSISTENCIAL (VIOLAÇÕES)</Text>
        <View style={styles.table}>
          <View style={[styles.row, styles.headerCell]}>
            <Text style={[styles.cell, { width: '70%', fontWeight: 'bold' }]}>NATUREZA DA VIOLAÇÃO</Text>
            <Text style={[styles.cell, styles.textCenter, { width: '15%', fontWeight: 'bold' }]}>CASOS</Text>
            <Text style={[styles.cell, styles.textCenter, { width: '15%', fontWeight: 'bold' }]}>INCIDÊNCIA</Text>
          </View>
          {data.vigilancia.violacoes.map((v, i) => (
            <View key={i} style={[styles.row, i % 2 !== 0 ? { backgroundColor: '#f9fafb' } : {}]}>
              <Text style={[styles.cell, { width: '70%' }]}>{v.name}</Text>
              <Text style={[styles.cell, styles.textCenter, { width: '15%' }]}>{v.value}</Text>
              <Text style={[styles.cell, styles.textCenter, { width: '15%' }]}>
                {data.stats.ativos > 0 ? ((v.value / data.stats.ativos) * 100).toFixed(1) : 0}%
              </Text>
            </View>
          ))}
          {data.vigilancia.violacoes.length === 0 && (
             <View style={styles.row}>
                <Text style={[styles.cell, styles.textCenter, { width: '100%', fontStyle: 'italic', padding: 10, color: '#666' }]}>
                  Nenhuma violação tipificada registrada no período.
                </Text>
             </View>
          )}
        </View>
      </View>
    )}

    {/* Assinatura do Gerente */}
    <View style={{ marginTop: 30, alignItems: 'center' }} wrap={false}>
      <View style={{ borderBottomWidth: 1, width: '40%', marginBottom: 5, borderColor: '#333' }} />
      <Text style={{ fontSize: 10, fontWeight: 'bold' }}>Gerência</Text>
      <Text style={{ fontSize: 8, color: '#666' }}>CREAS Brazlândia</Text>
    </View>

  </ReportLayout>
);