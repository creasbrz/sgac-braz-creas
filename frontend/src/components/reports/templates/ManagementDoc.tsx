// frontend/src/components/reports/templates/ManagementDoc.tsx
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportLayout, styles as globalStyles } from './ReportLayout';
import { ManagementReportData, StatData } from '@/types/case';

// --- CONFIGURAÇÃO E CONSTANTES ---
const COLORS = {
  primary: '#111827',
  blue: '#2563eb',
  purple: '#7c3aed',
  emerald: '#10b981',
  bgLight: '#f9fafb',
  textSecondary: '#6b7280'
};

// Estilos locais
const localStyles = StyleSheet.create({
  subTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    marginTop: 10
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
  }
});

// --- SUB-COMPONENTES ---

// 1. KPI Box
interface KpiBoxProps {
  label: string;
  value: string | number;
  color?: string;
  borderColor?: string;
}

const KpiBox = ({ label, value, color = COLORS.primary, borderColor = COLORS.primary }: KpiBoxProps) => (
  <View style={[globalStyles.kpiContainer, { borderLeftWidth: 4, borderLeftColor: borderColor, flex: 1 }]}>
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

// 3. Tabela de Equipe (Refatorada)
const TeamTable = ({ title, members }: { title: string, members: StatData[] }) => (
  <View style={{ marginBottom: 15 }} wrap={false}>
    <Text style={localStyles.subTitle}>{title}</Text>
    <View style={globalStyles.table}>
      
      {/* Header */}
      <View style={[globalStyles.row, globalStyles.headerCell]}>
        <Text style={[globalStyles.cell, { width: '70%', fontWeight: 'bold' }]}>NOME DO PROFISSIONAL</Text>
        <Text style={[globalStyles.cell, globalStyles.textCenter, { width: '30%', fontWeight: 'bold' }]}>CASOS ATIVOS</Text>
      </View>

      {/* Rows */}
      {members.map((m, i) => (
        <TableRow 
          key={i}
          isOdd={i % 2 !== 0}
          cols={[
            { text: m.name, width: '70%' },
            { text: m.value, width: '30%', align: 'center', bold: true }
          ]}
        />
      ))}

      {members.length === 0 && (
         <Text style={[globalStyles.cell, globalStyles.textCenter, { padding: 10, color: '#94a3b8', width: '100%', fontStyle: 'italic' }]}>
           Nenhum profissional registrado nesta categoria.
         </Text>
      )}
    </View>
  </View>
);

// --- COMPONENTE PRINCIPAL ---

export const ManagementDoc = ({ data }: { data: ManagementReportData }) => (
  <ReportLayout 
    title="Relatório de Gestão e Produtividade" 
    subtitle={`Período de Referência: ${data.periodo}`}
  >
    
    {/* 1. Visão Geral (KPIs) */}
    <View style={globalStyles.section}>
      <Text style={globalStyles.sectionTitle}>1. RESUMO GERAL DA UNIDADE</Text>
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
        
        <KpiBox 
          label="Total Ativos" 
          value={data.stats.ativos} 
          borderColor={COLORS.primary}
        />
        
        <KpiBox 
          label="Em Acolhida" 
          value={data.stats.acolhidas} 
          borderColor={COLORS.purple}
          color={COLORS.purple}
        />
        
        <KpiBox 
          label="Acomp. PAEFI" 
          value={data.stats.paefi} 
          borderColor={COLORS.emerald}
          color={COLORS.emerald}
        />
        
        <KpiBox 
          label="Novos (Mês)" 
          value={data.stats.novos || '-'} 
          borderColor={COLORS.blue}
          color={COLORS.blue}
        />

      </View>
    </View>

    {/* 2. Carga Horária / Distribuição */}
    <View style={globalStyles.section} wrap={false}>
      <Text style={globalStyles.sectionTitle}>2. DISTRIBUIÇÃO DA EQUIPE TÉCNICA</Text>
      
      <TeamTable 
        title="ESPECIALISTAS (TÉCNICOS DE REFERÊNCIA)" 
        members={data.cargaHoraria.especialistas} 
      />

      <TeamTable 
        title="AGENTES SOCIAIS (ACOLHIDA E BUSCA ATIVA)" 
        members={data.cargaHoraria.agentes} 
      />
    </View>

  </ReportLayout>
);