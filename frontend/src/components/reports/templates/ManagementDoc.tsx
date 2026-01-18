// frontend/src/components/reports/templates/ManagementDoc.tsx
import { Text, View } from '@react-pdf/renderer';
import { ReportLayout, styles } from './ReportLayout';
import { ManagementReportData, StatData } from '@/types/case';

interface ManagementDocProps {
  data: ManagementReportData;
}

const TeamTable = ({ title, members }: { title: string, members: StatData[] }) => (
  <View style={{ marginBottom: 15 }}>
    <Text style={[styles.sectionTitle, { fontSize: 10, marginTop: 5 }]}>{title}</Text>
    <View style={styles.table}>
      <View style={[styles.row, styles.headerCell]}>
        <Text style={[styles.cell, { width: '70%', fontWeight: 'bold' }]}>NOME DO PROFISSIONAL</Text>
        <Text style={[styles.cell, styles.textCenter, { width: '30%', fontWeight: 'bold' }]}>CASOS ATIVOS</Text>
      </View>
      {members.map((m, i) => (
        <View key={i} style={[styles.row, i % 2 !== 0 ? { backgroundColor: '#f9fafb' } : {}]}>
          <Text style={[styles.cell, { width: '70%' }]}>{m.name}</Text>
          <Text style={[styles.cell, styles.textCenter, { width: '30%' }]}>{m.value}</Text>
        </View>
      ))}
      {members.length === 0 && (
        <View style={styles.row}>
          <Text style={[styles.cell, styles.textCenter, { width: '100%', fontStyle: 'italic', color: '#666', padding: 5 }]}>
            Nenhum profissional registrado.
          </Text>
        </View>
      )}
    </View>
  </View>
);

export const ManagementDoc = ({ data }: ManagementDocProps) => (
  <ReportLayout 
    title="Relatório de Gestão e Produtividade" 
    subtitle={`Referência: ${data.periodo}`}
  >
    
    {/* 1. Visão Geral (KPIs) */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>1. RESUMO GERAL DA UNIDADE</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
        
        <View style={[styles.kpiContainer, { flex: 1 }]}>
          <Text style={styles.kpiLabel}>Total Ativos</Text>
          <Text style={styles.kpiValue}>{data.stats.ativos}</Text>
        </View>
        <View style={[styles.kpiContainer, { flex: 1 }]}>
          <Text style={styles.kpiLabel}>Em Acolhida</Text>
          <Text style={styles.kpiValue}>{data.stats.acolhidas}</Text>
        </View>
        <View style={[styles.kpiContainer, { flex: 1 }]}>
          <Text style={styles.kpiLabel}>Em Acomp. PAEFI</Text>
          <Text style={styles.kpiValue}>{data.stats.paefi}</Text>
        </View>
        <View style={[styles.kpiContainer, { flex: 1, borderLeftWidth: 4, borderLeftColor: '#2563eb' }]}>
           <Text style={styles.kpiLabel}>Novos (Mês)</Text>
           <Text style={[styles.kpiValue, { color: '#2563eb' }]}>{data.stats.novos || '-'}</Text>
        </View>

      </View>
    </View>

    {/* 2. Carga Horária / Distribuição */}
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionTitle}>2. DISTRIBUIÇÃO DA EQUIPE TÉCNICA</Text>
      
      <TeamTable 
        title="ESPECIALISTAS (TÉCNICOS DE REFERÊNCIA)" 
        members={data.cargaHoraria.especialistas} 
      />

      <TeamTable 
        title="AGENTES SOCIAIS (ACOLHIDA/BUSCA ATIVA)" 
        members={data.cargaHoraria.agentes} 
      />
    </View>

  </ReportLayout>
);