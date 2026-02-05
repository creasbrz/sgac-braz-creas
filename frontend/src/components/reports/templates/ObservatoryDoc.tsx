// frontend/src/components/reports/templates/ObservatoryDoc.tsx
import { useMemo } from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportLayout, styles as globalStyles } from './ReportLayout';
import { ObservatoryData, StatData } from '@/types/case';

// --- CONFIGURAÇÃO ---
const COLORS = {
  blue: '#2563eb',
  green: '#16a34a',
  red: '#dc2626',
  primary: '#111827',
  bgLight: '#f9fafb',
  textSecondary: '#6b7280'
};

const localStyles = StyleSheet.create({
  tableTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 4,
    color: COLORS.primary,
    textTransform: 'uppercase'
  },
  kpiLabel: {
    fontSize: 8,
    color: COLORS.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: 'bold'
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary
  },
  tableRowOdd: {
    backgroundColor: COLORS.bgLight
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

// 2. Tabela Simples Reutilizável
interface SimpleTableProps {
  title: string;
  data: StatData[];
  columns: [string, string];
}

const SimpleTable = ({ title, data, columns }: SimpleTableProps) => (
  <View style={{ marginBottom: 10 }}>
    <Text style={localStyles.tableTitle}>{title}</Text>
    <View style={globalStyles.table}>
      {/* Header */}
      <View style={[globalStyles.row, globalStyles.headerCell]}>
        <Text style={[globalStyles.cell, { width: '75%', fontWeight: 'bold' }]}>{columns[0]}</Text>
        <Text style={[globalStyles.cell, globalStyles.textCenter, { width: '25%', fontWeight: 'bold' }]}>{columns[1]}</Text>
      </View>
      
      {/* Rows */}
      {data.sort((a, b) => b.value - a.value).slice(0, 10).map((item, i) => (
        <View key={i} style={[globalStyles.row, i % 2 !== 0 ? localStyles.tableRowOdd : {}]}>
          <Text style={[globalStyles.cell, { width: '75%' }]}>{item.name}</Text>
          <Text style={[globalStyles.cell, globalStyles.textCenter, { width: '25%' }]}>{item.value}</Text>
        </View>
      ))}

      {data.length === 0 && (
        <View style={globalStyles.row}>
           <Text style={[globalStyles.cell, globalStyles.textCenter, { width: '100%', fontStyle: 'italic', color: COLORS.textSecondary, padding: 5 }]}>
             Sem dados registrados.
           </Text>
        </View>
      )}
    </View>
  </View>
);

// --- COMPONENTE PRINCIPAL ---

interface ObservatoryDocProps {
  data: ObservatoryData & { mapData?: { id: string; lat: number; lng: number; categoria?: string; }[] };
}

export const ObservatoryDoc = ({ data }: ObservatoryDocProps) => {
  
  // Cálculos derivados
  const totalViolacoes = data.violationData.reduce((acc, v) => acc + v.value, 0) || 1;
  const totalMapPoints = data.mapData ? data.mapData.length : 0;
  const totalNovos = data.evolutionData.reduce((acc, c) => acc + c.novos, 0);
  const totalDesligados = data.evolutionData.reduce((acc, c) => acc + c.desligados, 0);
  const totalRiscoAlto = data.urgencyData.filter(u => u.weight >= 3).reduce((acc, u) => acc + u.value, 0);

  // Agrupamento territorial memoizado
  const territorySummary = useMemo(() => {
    if (!data.mapData) return [];
    const counts: Record<string, number> = {};
    data.mapData.forEach(p => {
      const cat = p.categoria || 'Não classificado';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [data.mapData]);

  return (
    <ReportLayout 
      title="Relatório do Observatório Social" 
      subtitle="Monitoramento, Vigilância e Perfil Territorial"
    >
      
      {/* --- SEÇÃO 1: VISÃO GERAL --- */}
      <View style={globalStyles.section}>
        <Text style={globalStyles.sectionTitle}>1. VISÃO GERAL E FLUXO</Text>
        
        {/* KPIs em Linha */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, gap: 10 }}>
           <KpiBox 
             label="NOVOS (Período)" 
             value={totalNovos} 
             color={COLORS.blue} 
             borderColor={COLORS.blue} 
           />
           <KpiBox 
             label="DESLIGAMENTOS" 
             value={totalDesligados} 
             color={COLORS.green} 
             borderColor={COLORS.green} 
           />
           <KpiBox 
             label="RISCO ALTO" 
             value={totalRiscoAlto} 
             color={COLORS.red} 
             borderColor={COLORS.red} 
           />
           <KpiBox 
             label="OCORRÊNCIAS" 
             value={totalViolacoes} 
             borderColor={COLORS.primary} 
           />
        </View>

        {/* Tabela de Evolução */}
        <View style={globalStyles.table}>
          <View style={[globalStyles.row, globalStyles.headerCell]}>
            <Text style={[globalStyles.cell, { width: '40%', fontWeight: 'bold' }]}>MÊS/PERÍODO</Text>
            <Text style={[globalStyles.cell, globalStyles.textCenter, { width: '20%', fontWeight: 'bold' }]}>ENTRADAS</Text>
            <Text style={[globalStyles.cell, globalStyles.textCenter, { width: '20%', fontWeight: 'bold' }]}>SAÍDAS</Text>
            <Text style={[globalStyles.cell, globalStyles.textCenter, { width: '20%', fontWeight: 'bold' }]}>SALDO</Text>
          </View>
          
          {data.evolutionData.map((d, i) => {
            const saldo = d.novos - d.desligados;
            return (
                <View key={i} style={[globalStyles.row, i % 2 !== 0 ? localStyles.tableRowOdd : {}]}>
                  <Text style={[globalStyles.cell, { width: '40%' }]}>{d.name}</Text>
                  <Text style={[globalStyles.cell, globalStyles.textCenter, { width: '20%' }]}>{d.novos}</Text>
                  <Text style={[globalStyles.cell, globalStyles.textCenter, { width: '20%' }]}>{d.desligados}</Text>
                  <Text style={[
                    globalStyles.cell, 
                    globalStyles.textCenter, 
                    { width: '20%', fontWeight: 'bold', color: saldo > 0 ? COLORS.red : COLORS.green }
                  ]}>
                      {saldo > 0 ? `+${saldo}` : saldo}
                  </Text>
                </View>
            )
          })}
        </View>
      </View>

      <View break />

      {/* --- SEÇÃO 2: NATUREZA DAS VIOLAÇÕES --- */}
      <View style={globalStyles.section}>
        <Text style={globalStyles.sectionTitle}>2. NATUREZA DAS VIOLAÇÕES DE DIREITOS</Text>
        <View style={globalStyles.table}>
          <View style={[globalStyles.row, globalStyles.headerCell]}>
            <Text style={[globalStyles.cell, { width: '70%', fontWeight: 'bold' }]}>TIPIFICAÇÃO</Text>
            <Text style={[globalStyles.cell, globalStyles.textCenter, { width: '15%', fontWeight: 'bold' }]}>QTD</Text>
            <Text style={[globalStyles.cell, globalStyles.textCenter, { width: '15%', fontWeight: 'bold' }]}>%</Text>
          </View>
          
          {data.violationData.sort((a, b) => b.value - a.value).map((v, i) => (
            <View key={i} style={[globalStyles.row, i % 2 !== 0 ? localStyles.tableRowOdd : {}]}>
              <Text style={[globalStyles.cell, { width: '70%' }]}>{v.name}</Text>
              <Text style={[globalStyles.cell, globalStyles.textCenter, { width: '15%' }]}>{v.value}</Text>
              <Text style={[globalStyles.cell, globalStyles.textCenter, { width: '15%' }]}>
                {((v.value / totalViolacoes) * 100).toFixed(1)}%
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* --- SEÇÃO 3: REDE SOCIOASSISTENCIAL --- */}
      <View style={globalStyles.section} wrap={false}>
        <Text style={globalStyles.sectionTitle}>3. ARTICULAÇÃO EM REDE</Text>
        <View style={{ flexDirection: 'row', gap: 15 }}>
          
          {/* Porta de Entrada */}
          <View style={{ width: '50%' }}>
            <SimpleTable 
              title="PORTA DE ENTRADA (ORIGEM)" 
              data={data.originData} 
              columns={['Órgão Demandante', 'Casos']} 
            />
          </View>
          
          {/* Porta de Saída */}
          <View style={{ width: '50%' }}>
            <SimpleTable 
              title="ENCAMINHAMENTOS (SAÍDA)" 
              data={data.networkData} 
              columns={['Instituição Destino', 'Envios']} 
            />
          </View>

        </View>
      </View>

      <View break />

      {/* --- SEÇÃO 4: PERFORMANCE E ATENDIMENTOS --- */}
      <View style={globalStyles.section}>
        <Text style={globalStyles.sectionTitle}>4. PERFORMANCE E ATENDIMENTOS</Text>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 15 }}>
            <KpiBox 
              label="TEMPO MÉDIO (PERMANÊNCIA)" 
              value={`${data.efficiencyData.avgPermanence} dias`} 
              borderColor={COLORS.primary} 
            />
            <KpiBox 
              label="TEMPO MÉDIO (ESPERA)" 
              value={`${data.efficiencyData.avgWaitTime} dias`} 
              borderColor={COLORS.primary} 
            />
            
            {/* KPI Especial com Subtítulo */}
            <View style={[globalStyles.kpiContainer, { flex: 1, borderLeftWidth: 4, borderLeftColor: COLORS.primary }]}>
                <Text style={localStyles.kpiLabel}>ATIVIDADES COLETIVAS</Text>
                <Text style={localStyles.kpiValue}>{data.collectiveData.totalGroups} Grupos</Text>
                <Text style={{ fontSize: 8, color: COLORS.textSecondary, marginTop: 2 }}>
                  {data.collectiveData.totalParticipants} Participantes
                </Text>
            </View>
        </View>

        {/* Benefícios */}
        <SimpleTable 
          title="BENEFÍCIOS EVENTUAIS CONCEDIDOS" 
          data={data.benefitsData} 
          columns={['Benefício', 'Concessões']} 
        />
      </View>

      {/* --- SEÇÃO 5: PERFIL SOCIAL --- */}
      <View style={globalStyles.section} wrap={false}>
        <Text style={globalStyles.sectionTitle}>5. PERFIL SOCIAL DOS USUÁRIOS</Text>
        <View style={{ flexDirection: 'row', gap: 15 }}>
          <View style={{ width: '60%' }}>
            <SimpleTable 
              title="FAIXA ETÁRIA" 
              data={data.ageData} 
              columns={['Faixa', 'Usuários']} 
            />
          </View>
          <View style={{ width: '40%' }}>
            <SimpleTable 
              title="GÊNERO" 
              data={data.sexData} 
              columns={['Identidade', 'Qtd']} 
            />
          </View>
        </View>
      </View>

      {/* --- SEÇÃO 6: TERRITÓRIO --- */}
      <View style={globalStyles.section} wrap={false}>
        <Text style={globalStyles.sectionTitle}>6. RESUMO TERRITORIAL</Text>
        
        <View style={[globalStyles.kpiContainer, { alignItems: 'flex-start', padding: 10, marginBottom: 10 }]}>
            <Text style={{ fontSize: 10 }}>
                Total de casos georreferenciados: <Text style={{ fontWeight: 'bold' }}>{totalMapPoints}</Text>
            </Text>
            <Text style={{ fontSize: 9, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 2 }}>
                Distribuição dos casos ativos mapeados no território de abrangência.
            </Text>
        </View>
        
        {/* Tabela de Categorias do Território */}
        <SimpleTable 
          title="DISTRIBUIÇÃO POR CATEGORIA TERRITORIAL" 
          data={territorySummary} 
          columns={['Categoria', 'Casos']} 
        />
      </View>

      {/* Assinatura */}
      <View style={{ marginTop: 30, alignItems: 'center' }} wrap={false}>
        <View style={{ borderBottomWidth: 1, width: '50%', marginBottom: 5 }} />
        <Text style={{ fontSize: 10, fontWeight: 'bold' }}>Coordenação do Observatório</Text>
      </View>

    </ReportLayout>
  );
};