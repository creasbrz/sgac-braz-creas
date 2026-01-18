// frontend/src/components/reports/templates/ObservatoryDoc.tsx
import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { ReportLayout, styles } from './ReportLayout';
import { ObservatoryData, StatData } from '@/types/case';
// Se MapPoint não estiver exportado de types, defina localmente ou importe de onde estiver
interface MapPoint { id: string; lat: number; lng: number; categoria?: string; }

interface ObservatoryDocProps {
  data: ObservatoryData & { mapData?: MapPoint[] };
}

// Componente Auxiliar de Tabela Simples (Reutiliza estilos globais)
const SimpleTable = ({ title, data, columns }: { title: string, data: StatData[], columns: [string, string] }) => (
  <View style={{ marginBottom: 10 }}>
    <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 4, color: '#111827', textTransform: 'uppercase' }}>
        {title}
    </Text>
    <View style={styles.table}>
      <View style={[styles.row, styles.headerCell]}>
        <Text style={[styles.cell, { width: '75%', fontWeight: 'bold' }]}>{columns[0]}</Text>
        <Text style={[styles.cell, styles.textCenter, { width: '25%', fontWeight: 'bold' }]}>{columns[1]}</Text>
      </View>
      {data.sort((a, b) => b.value - a.value).slice(0, 10).map((item, i) => (
        <View key={i} style={[styles.row, i % 2 !== 0 ? { backgroundColor: '#f9fafb' } : {}]}>
          <Text style={[styles.cell, { width: '75%' }]}>{item.name}</Text>
          <Text style={[styles.cell, styles.textCenter, { width: '25%' }]}>{item.value}</Text>
        </View>
      ))}
      {data.length === 0 && (
        <View style={styles.row}>
            <Text style={[styles.cell, styles.textCenter, { width: '100%', fontStyle: 'italic', color: '#666' }]}>
            Sem dados registrados.
            </Text>
        </View>
      )}
    </View>
  </View>
);

export const ObservatoryDoc = ({ data }: ObservatoryDocProps) => {
  const totalViolacoes = data.violationData.reduce((acc, v) => acc + v.value, 0) || 1;
  const totalMapPoints = data.mapData ? data.mapData.length : 0;

  // Agrupar dados do mapa para o relatório
  const territorySummary = React.useMemo(() => {
    if (!data.mapData) return [];
    const counts: Record<string, number> = {};
    data.mapData.forEach(p => {
      const cat = p.categoria || 'Não classificado';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value: Number(value) })); // Garante number
  }, [data.mapData]);

  return (
    <ReportLayout title="Relatório do Observatório Social" subtitle="Monitoramento, Vigilância e Perfil Territorial">
      
      {/* --- SEÇÃO 1: VISÃO GERAL --- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. VISÃO GERAL E FLUXO</Text>
        
        {/* KPIs em Linha (Estilo Card) */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, gap: 10 }}>
           <View style={[styles.kpiContainer, { flex: 1, borderLeftWidth: 4, borderLeftColor: '#2563eb' }]}>
              <Text style={styles.kpiLabel}>NOVOS (Período)</Text>
              <Text style={[styles.kpiValue, { color: '#2563eb' }]}>
                {data.evolutionData.reduce((acc, c) => acc + c.novos, 0)}
              </Text>
           </View>
           <View style={[styles.kpiContainer, { flex: 1, borderLeftWidth: 4, borderLeftColor: '#16a34a' }]}>
              <Text style={styles.kpiLabel}>DESLIGAMENTOS</Text>
              <Text style={[styles.kpiValue, { color: '#16a34a' }]}>
                {data.evolutionData.reduce((acc, c) => acc + c.desligados, 0)}
              </Text>
           </View>
           <View style={[styles.kpiContainer, { flex: 1, borderLeftWidth: 4, borderLeftColor: '#dc2626' }]}>
              <Text style={styles.kpiLabel}>RISCO ALTO</Text>
              <Text style={[styles.kpiValue, { color: '#dc2626' }]}>
                {data.urgencyData.filter(u => u.weight >= 3).reduce((acc, u) => acc + u.value, 0)}
              </Text>
           </View>
           <View style={[styles.kpiContainer, { flex: 1 }]}>
              <Text style={styles.kpiLabel}>OCORRÊNCIAS</Text>
              <Text style={styles.kpiValue}>{totalViolacoes}</Text>
           </View>
        </View>

        {/* Tabela de Evolução */}
        <View style={styles.table}>
          <View style={[styles.row, styles.headerCell]}>
            <Text style={[styles.cell, { width: '40%', fontWeight: 'bold' }]}>MÊS/PERÍODO</Text>
            <Text style={[styles.cell, styles.textCenter, { width: '20%', fontWeight: 'bold' }]}>ENTRADAS</Text>
            <Text style={[styles.cell, styles.textCenter, { width: '20%', fontWeight: 'bold' }]}>SAÍDAS</Text>
            <Text style={[styles.cell, styles.textCenter, { width: '20%', fontWeight: 'bold' }]}>SALDO</Text>
          </View>
          {data.evolutionData.map((d, i) => {
            const saldo = d.novos - d.desligados;
            return (
                <View key={i} style={[styles.row, i % 2 !== 0 ? { backgroundColor: '#f9fafb' } : {}]}>
                <Text style={[styles.cell, { width: '40%' }]}>{d.name}</Text>
                <Text style={[styles.cell, styles.textCenter, { width: '20%' }]}>{d.novos}</Text>
                <Text style={[styles.cell, styles.textCenter, { width: '20%' }]}>{d.desligados}</Text>
                <Text style={[styles.cell, styles.textCenter, styles.bold, { width: '20%', color: saldo > 0 ? '#b91c1c' : '#15803d' }]}>
                    {saldo > 0 ? `+${saldo}` : saldo}
                </Text>
                </View>
            )
          })}
        </View>
      </View>

      <View break />

      {/* --- SEÇÃO 2: NATUREZA DAS VIOLAÇÕES --- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. NATUREZA DAS VIOLAÇÕES DE DIREITOS</Text>
        <View style={styles.table}>
          <View style={[styles.row, styles.headerCell]}>
            <Text style={[styles.cell, { width: '70%', fontWeight: 'bold' }]}>TIPIFICAÇÃO</Text>
            <Text style={[styles.cell, styles.textCenter, { width: '15%', fontWeight: 'bold' }]}>QTD</Text>
            <Text style={[styles.cell, styles.textCenter, { width: '15%', fontWeight: 'bold' }]}>%</Text>
          </View>
          {data.violationData.sort((a, b) => b.value - a.value).map((v, i) => (
            <View key={i} style={[styles.row, i % 2 !== 0 ? { backgroundColor: '#f9fafb' } : {}]}>
              <Text style={[styles.cell, { width: '70%' }]}>{v.name}</Text>
              <Text style={[styles.cell, styles.textCenter, { width: '15%' }]}>{v.value}</Text>
              <Text style={[styles.cell, styles.textCenter, { width: '15%' }]}>
                {((v.value / totalViolacoes) * 100).toFixed(1)}%
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* --- SEÇÃO 3: REDE SOCIOASSISTENCIAL --- */}
      <View style={styles.section} wrap={false}>
        <Text style={styles.sectionTitle}>3. ARTICULAÇÃO EM REDE</Text>
        <View style={{ flexDirection: 'row', gap: 15 }}>
          {/* Porta de Entrada */}
          <View style={{ width: '50%' }}>
            <SimpleTable title="PORTA DE ENTRADA (ORIGEM)" data={data.originData} columns={['Órgão Demandante', 'Casos']} />
          </View>
          {/* Porta de Saída */}
          <View style={{ width: '50%' }}>
            <SimpleTable title="ENCAMINHAMENTOS (SAÍDA)" data={data.networkData} columns={['Instituição Destino', 'Envios']} />
          </View>
        </View>
      </View>

      <View break />

      {/* --- SEÇÃO 4: PERFORMANCE E ATENDIMENTOS --- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. PERFORMANCE E ATENDIMENTOS</Text>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 15 }}>
            <View style={[styles.kpiContainer, { flex: 1 }]}>
                <Text style={styles.kpiLabel}>TEMPO MÉDIO (PERMANÊNCIA)</Text>
                <Text style={styles.kpiValue}>{data.efficiencyData.avgPermanence} dias</Text>
            </View>
            <View style={[styles.kpiContainer, { flex: 1 }]}>
                <Text style={styles.kpiLabel}>TEMPO MÉDIO (ESPERA)</Text>
                <Text style={styles.kpiValue}>{data.efficiencyData.avgWaitTime} dias</Text>
            </View>
            <View style={[styles.kpiContainer, { flex: 1 }]}>
                <Text style={styles.kpiLabel}>ATIVIDADES COLETIVAS</Text>
                <Text style={styles.kpiValue}>{data.collectiveData.totalGroups} Grupos</Text>
                <Text style={{ fontSize: 8, color: '#666', marginTop: 2 }}>{data.collectiveData.totalParticipants} Participantes</Text>
            </View>
        </View>

        {/* Benefícios */}
        <SimpleTable title="BENEFÍCIOS EVENTUAIS CONCEDIDOS" data={data.benefitsData} columns={['Benefício', 'Concessões']} />
      </View>

      {/* --- SEÇÃO 5: PERFIL SOCIAL --- */}
      <View style={styles.section} wrap={false}>
        <Text style={styles.sectionTitle}>5. PERFIL SOCIAL DOS USUÁRIOS</Text>
        <View style={{ flexDirection: 'row', gap: 15 }}>
          <View style={{ width: '60%' }}>
            <SimpleTable title="FAIXA ETÁRIA" data={data.ageData} columns={['Faixa', 'Usuários']} />
          </View>
          <View style={{ width: '40%' }}>
            <SimpleTable title="GÊNERO" data={data.sexData} columns={['Identidade', 'Qtd']} />
          </View>
        </View>
      </View>

      {/* --- SEÇÃO 6: TERRITÓRIO --- */}
      <View style={styles.section} wrap={false}>
        <Text style={styles.sectionTitle}>6. RESUMO TERRITORIAL</Text>
        <View style={[styles.kpiContainer, { alignItems: 'flex-start', padding: 10, marginBottom: 10 }]}>
            <Text style={{ fontSize: 10 }}>
                Total de casos georreferenciados: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{totalMapPoints}</Text>
            </Text>
            <Text style={{ fontSize: 9, color: '#666', fontStyle: 'italic', marginTop: 2 }}>
                Distribuição dos casos ativos mapeados no território de abrangência.
            </Text>
        </View>
        
        {/* Tabela de Categorias do Território */}
        <SimpleTable title="DISTRIBUIÇÃO POR CATEGORIA TERRITORIAL" data={territorySummary as StatData[]} columns={['Categoria', 'Casos']} />
      </View>

      <View style={{ marginTop: 30, alignItems: 'center' }} wrap={false}>
        <View style={{ borderBottomWidth: 1, width: '50%', marginBottom: 5 }} />
        <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold' }}>Coordenação do Observatório</Text>
      </View>

    </ReportLayout>
  );
};