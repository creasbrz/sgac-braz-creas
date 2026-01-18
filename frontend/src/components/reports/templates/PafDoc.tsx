// frontend/src/components/reports/templates/PafDoc.tsx
import { Text, View } from '@react-pdf/renderer';
import { ReportLayout, styles } from './ReportLayout';
import { CaseDetailData, PafData } from '@/types/case';
import { format } from 'date-fns';

interface PafDocProps {
  caseData: CaseDetailData;
  paf: PafData;
}

// Helper local seguro
const formatDateSafe = (date: Date | string) => {
  try { return format(new Date(date), 'dd/MM/yyyy'); } catch { return '-'; }
};

const formatCPF = (cpf: string) => {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

export const PafDoc = ({ caseData, paf }: PafDocProps) => (
  <ReportLayout 
    title="Plano de Acompanhamento Familiar (PAF)" 
    subtitle={`Versão do Planejamento: ${paf.versaoAtual || 1}`}
  >
    
    {/* Identificação Rápida (Estilo Card Cinza) */}
    <View style={{ marginBottom: 20, backgroundColor: '#f3f4f6', padding: 10, borderRadius: 4, borderLeftWidth: 4, borderLeftColor: '#111827' }}>
      <Text style={{ fontSize: 10, marginBottom: 4 }}>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>REFERÊNCIA FAMILIAR: </Text> 
        {caseData.nomeCompleto.toUpperCase()}
      </Text>
      <Text style={{ fontSize: 10 }}>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>CPF RESPONSÁVEL: </Text> 
        {formatCPF(caseData.cpf)}
      </Text>
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>1. DIAGNÓSTICO SOCIOFAMILIAR</Text>
      <Text style={{ fontSize: 10, textAlign: 'justify', lineHeight: 1.5, color: '#1f2937' }}>
        {paf.diagnostico || 'Não informado.'}
      </Text>
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>2. OBJETIVOS PACTUADOS</Text>
      <Text style={{ fontSize: 10, textAlign: 'justify', lineHeight: 1.5, color: '#1f2937' }}>
        {paf.objetivos || 'Não informado.'}
      </Text>
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>3. ESTRATÉGIAS E ENCAMINHAMENTOS</Text>
      <Text style={{ fontSize: 10, textAlign: 'justify', lineHeight: 1.5, color: '#1f2937' }}>
        {paf.estrategias || 'Não informado.'}
      </Text>
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>4. PRAZOS E REAVALIAÇÃO</Text>
      <View style={styles.kpiContainer}>
        <Text style={{ fontSize: 10 }}>
          Data prevista para reavaliação deste plano: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{formatDateSafe(paf.deadline)}</Text>
        </Text>
      </View>
    </View>

    {/* Assinaturas */}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 50 }} wrap={false}>
      <View style={{ width: '45%', alignItems: 'center' }}>
        <View style={{ borderBottomWidth: 1, width: '100%', marginBottom: 5, borderColor: '#000' }} />
        <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold' }}>{paf.autor?.nome || 'Técnico Responsável'}</Text>
        <Text style={{ fontSize: 8, color: '#666' }}>Especialista CREAS</Text>
      </View>

      <View style={{ width: '45%', alignItems: 'center' }}>
        <View style={{ borderBottomWidth: 1, width: '100%', marginBottom: 5, borderColor: '#000' }} />
        <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold' }}>{caseData.nomeCompleto}</Text>
        <Text style={{ fontSize: 8, color: '#666' }}>Usuário(a) / Responsável</Text>
      </View>
    </View>

  </ReportLayout>
);