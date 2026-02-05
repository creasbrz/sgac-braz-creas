// frontend/src/components/reports/templates/AnalyticsReportDoc.tsx
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportLayout, styles as globalStyles } from './ReportLayout';
import { AnalyticsReportData } from '@/types/case';

// --- CONFIGURAÇÃO E CONSTANTES ---
const COLORS = {
  blue: '#2563eb',
  purple: '#7c3aed',
  green: '#16a34a',
  red: '#dc2626',
  gray: '#4b5563',
  bgLight: '#f9fafb',
  bgInsight: '#eff6ff',
  borderInsight: '#2563eb'
};

// Estilos locais específicos para este relatório (estendem os globais)
const localStyles = StyleSheet.create({
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
  insightBox: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: COLORS.bgInsight,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.borderInsight,
    borderRadius: 2
  },
  insightTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 2
  },
  insightText: {
    fontSize: 9,
    color: '#334155',
    textAlign: 'justify',
    lineHeight: 1.3
  },
  tableRowOdd: {
    backgroundColor: COLORS.bgLight
  },
  footerNote: {
    marginTop: 20,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb'
  }
});

// --- HELPERS ---
const truncate = (str: string, max: number) => 
  str.length > max ? str.substring(0, max) + '...' : str;

const getSaldoColor = (novos: number, fechados: number) => {
  const saldo = novos - fechados;
  if (saldo > 0) return COLORS.blue;
  if (saldo < 0) return COLORS.green; // Negativo é bom (redução de demanda represada)
  return COLORS.gray;
};

// --- SUB-COMPONENTES (Para limpar o render principal) ---

const KpiBox = ({ label, value, color }: { label: string, value: string | number, color: string }) => (
  <View style={[globalStyles.kpiContainer, { flex: 1, borderLeftWidth: 4, borderLeftColor: color }]}>
    <Text style={localStyles.kpiLabel}>{label}</Text>
    <Text style={[localStyles.kpiValue, { color }]}>{value}</Text>
  </View>
);

interface TableRowProps {
  isOdd: boolean;
  cols: { text: string | number; width: string; align?: 'left' | 'right' | 'center'; color?: string; bold?: boolean }[];
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
            color: col.color || 'black',
            fontWeight: col.bold ? 'bold' : 'normal',
            fontSize: 9
          }
        ]}
      >
        {col.text}
      </Text>
    ))}
  </View>
);

// --- COMPONENTE PRINCIPAL ---

interface AnalyticsDocProps {
  data: AnalyticsReportData;
}

export const AnalyticsReportDoc = ({ data }: AnalyticsDocProps) => (
  <ReportLayout 
    title="Relatório de Inteligência de Dados" 
    subtitle={`Período de Análise: Últimos ${data.periodo} meses`}
  >
    
    {/* 1. KPIs */}
    <View style={globalStyles.section}>
      <Text style={globalStyles.sectionTitle}>1. INDICADORES DE PERFORMANCE (KPIs)</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
        
        <KpiBox 
          label="Tempo Médio Resolução" 
          value={`${Math.round(data.kpis.tempoMedio)} dias`} 
          color={COLORS.blue} 
        />
        
        <KpiBox 
          label="Casos Ativos (PAEFI)" 
          value={data.kpis.ativosPaefi} 
          color={COLORS.purple} 
        />

        {data.kpis.previsaoNovos !== null && (
          <KpiBox 
            label="Previsão (Próx. Mês)" 
            value={`~${Math.round(data.kpis.previsaoNovos)} novos`} 
            color={COLORS.green} 
          />
        )}
      </View>
    </View>

    {/* 2. Insights IA */}
    {data.insights.length > 0 && (
      <View style={globalStyles.section} wrap={false}>
        <Text style={globalStyles.sectionTitle}>2. ANÁLISE AUTOMÁTICA E TENDÊNCIAS</Text>
        {data.insights.map((insight, index) => (
          <View key={index} style={localStyles.insightBox}>
            <Text style={localStyles.insightTitle}>{insight.title}</Text>
            <Text style={localStyles.insightText}>{insight.description}</Text>
          </View>
        ))}
      </View>
    )}

    {/* 3. Fluxo de Entradas e Saídas */}
    <View style={globalStyles.section} wrap={false}>
      <Text style={globalStyles.sectionTitle}>3. FLUXO DE ENTRADAS E SAÍDAS</Text>
      <View style={globalStyles.table}>
        {/* Header */}
        <View style={[globalStyles.row, globalStyles.headerCell]}>
          <Text style={[globalStyles.cell, { width: '40%', fontWeight: 'bold' }]}>REFERÊNCIA</Text>
          <Text style={[globalStyles.cell, globalStyles.textCenter, { width: '20%', fontWeight: 'bold' }]}>NOVOS</Text>
          <Text style={[globalStyles.cell, globalStyles.textCenter, { width: '20%', fontWeight: 'bold' }]}>DESLIGADOS</Text>
          <Text style={[globalStyles.cell, globalStyles.textRight, { width: '20%', fontWeight: 'bold' }]}>SALDO</Text>
        </View>
        
        {/* Body */}
        {data.fluxo.map((item, i) => {
          const saldo = item.novos - item.fechados;
          return (
            <TableRow 
              key={i} 
              isOdd={i % 2 !== 0}
              cols={[
                { text: item.name, width: '40%' },
                { text: item.novos, width: '20%', align: 'center' },
                { text: item.fechados, width: '20%', align: 'center' },
                { 
                  text: saldo > 0 ? `+${saldo}` : saldo, 
                  width: '20%', 
                  align: 'right', 
                  bold: true, 
                  color: getSaldoColor(item.novos, item.fechados) 
                }
              ]}
            />
          );
        })}
      </View>
    </View>

    {/* 4. Layout Lado a Lado (Violações e Produtividade) */}
    <View style={{ flexDirection: 'row', gap: 20 }}>
      
      {/* Coluna Esquerda: Violações */}
      <View style={{ width: '55%' }} wrap={false}>
        <Text style={globalStyles.sectionTitle}>4. TIPIFICAÇÃO DAS VIOLAÇÕES</Text>
        <View style={globalStyles.table}>
          <View style={[globalStyles.row, globalStyles.headerCell]}>
            <Text style={[globalStyles.cell, { width: '65%', fontWeight: 'bold' }]}>NATUREZA</Text>
            <Text style={[globalStyles.cell, globalStyles.textCenter, { width: '15%', fontWeight: 'bold' }]}>QTD</Text>
            <Text style={[globalStyles.cell, globalStyles.textRight, { width: '20%', fontWeight: 'bold' }]}>%</Text>
          </View>
          
          {data.violacoes.map((v, i) => (
            <TableRow 
              key={i}
              isOdd={i % 2 !== 0}
              cols={[
                { text: truncate(v.name, 28), width: '65%' },
                { text: v.value, width: '15%', align: 'center' },
                { text: `${v.percent.toFixed(1)}%`, width: '20%', align: 'right', color: COLORS.gray }
              ]}
            />
          ))}
          
          {data.violacoes.length === 0 && (
             <Text style={[globalStyles.cell, globalStyles.textCenter, { color: '#666', padding: 10, width: '100%' }]}>
               Nenhum registro no período.
             </Text>
          )}
        </View>
      </View>

      {/* Coluna Direita: Produtividade */}
      <View style={{ width: '45%' }} wrap={false}>
        <Text style={globalStyles.sectionTitle}>5. PRODUTIVIDADE</Text>
        <View style={globalStyles.table}>
          <View style={[globalStyles.row, globalStyles.headerCell]}>
            <Text style={[globalStyles.cell, { width: '70%', fontWeight: 'bold' }]}>PROFISSIONAL</Text>
            <Text style={[globalStyles.cell, globalStyles.textRight, { width: '30%', fontWeight: 'bold' }]}>AÇÕES</Text>
          </View>
          
          {data.produtividade.map((p, i) => (
            <TableRow 
              key={i}
              isOdd={i % 2 !== 0}
              cols={[
                { text: truncate(p.name, 18), width: '70%' },
                { text: p.value, width: '30%', align: 'right', bold: true }
              ]}
            />
          ))}

          {data.produtividade.length === 0 && (
             <Text style={[globalStyles.cell, globalStyles.textCenter, { color: '#666', padding: 10, width: '100%' }]}>
               Sem dados registrados.
             </Text>
          )}
        </View>
      </View>

    </View>

    {/* Rodapé Técnico */}
    <View style={localStyles.footerNote}>
       <Text style={{ fontSize: 8, color: '#666', textAlign: 'justify' }}>
         Nota Técnica: As previsões apresentadas no item 1 são estimativas estatísticas baseadas em regressão linear simples dos dados históricos do período selecionado e podem sofrer variações sazonais.
      </Text>
    </View>

  </ReportLayout>
);