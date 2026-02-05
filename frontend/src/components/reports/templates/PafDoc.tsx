// frontend/src/components/reports/templates/PafDoc.tsx
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportLayout, styles as globalStyles } from './ReportLayout';
import { CaseDetailData, PafData } from '@/types/case';
import { format } from 'date-fns';

// --- CONFIGURAÇÃO ---
const COLORS = {
  primary: '#111827',
  secondary: '#4b5563',
  bgLight: '#f9fafb',
  border: '#e5e7eb',
  accent: '#0f172a'
};

const localStyles = StyleSheet.create({
  headerCard: {
    marginBottom: 20,
    backgroundColor: COLORS.bgLight,
    padding: 12,
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomWidth: 0
  },
  cardLabel: {
    fontSize: 8,
    color: COLORS.secondary,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: 2
  },
  cardValue: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: 6
  },
  sectionBox: {
    marginBottom: 15,
    textAlign: 'justify',
    fontSize: 10,
    lineHeight: 1.6,
    color: '#374151' // Gray 700
  },
  deadlineBox: {
    marginTop: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    alignItems: 'center',
    backgroundColor: '#fffbeb' // Amber 50 (bem suave para destaque)
  }
});

// --- HELPERS ---

const formatDate = (date: Date | string | undefined) => {
  if (!date) return '-';
  try { return format(new Date(date), 'dd/MM/yyyy'); } catch { return '-'; }
};

const formatCPF = (cpf: string | undefined) => {
  if (!cpf) return 'N/I';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

// --- SUB-COMPONENTES ---

const SectionBox = ({ title, content }: { title: string, content?: string }) => (
  <View style={globalStyles.section} wrap={false}>
    <Text style={globalStyles.sectionTitle}>{title}</Text>
    <Text style={localStyles.sectionBox}>
      {content || 'Não informado.'}
    </Text>
  </View>
);

const SignatureBlock = ({ name, role }: { name: string, role: string }) => (
  <View style={{ width: '45%', alignItems: 'center' }}>
    <View style={{ borderBottomWidth: 1, width: '100%', marginBottom: 6, borderColor: '#000' }} />
    <Text style={{ fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>{name}</Text>
    <Text style={{ fontSize: 8, color: COLORS.secondary }}>{role}</Text>
  </View>
);

// --- COMPONENTE PRINCIPAL ---

interface PafDocProps {
  caseData: CaseDetailData;
  paf: PafData;
}

export const PafDoc = ({ caseData, paf }: PafDocProps) => (
  <ReportLayout 
    title="Plano de Acompanhamento Familiar (PAF)" 
    subtitle={`Versão do Planejamento: ${paf.versaoAtual || 1} • Data de Criação: ${formatDate(paf.createdAt || new Date())}`}
  >
    
    {/* 1. Identificação Rápida */}
    <View style={localStyles.headerCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ width: '65%' }}>
           <Text style={localStyles.cardLabel}>REFERÊNCIA FAMILIAR</Text>
           <Text style={localStyles.cardValue}>{caseData.nomeCompleto.toUpperCase()}</Text>
        </View>
        <View style={{ width: '35%' }}>
           <Text style={localStyles.cardLabel}>CPF RESPONSÁVEL</Text>
           <Text style={localStyles.cardValue}>{formatCPF(caseData.cpf)}</Text>
        </View>
      </View>
      <View style={{ marginTop: 4 }}>
         <Text style={localStyles.cardLabel}>TÉCNICO DE REFERÊNCIA</Text>
         <Text style={[localStyles.cardValue, { marginBottom: 0 }]}>{paf.autor?.nome || 'Não atribuído'}</Text>
      </View>
    </View>

    {/* 2. Conteúdo do PAF */}
    <SectionBox 
      title="1. DIAGNÓSTICO SOCIOFAMILIAR" 
      content={paf.diagnostico} 
    />

    <SectionBox 
      title="2. OBJETIVOS PACTUADOS" 
      content={paf.objetivos} 
    />

    <SectionBox 
      title="3. ESTRATÉGIAS E ENCAMINHAMENTOS" 
      content={paf.estrategias} 
    />

    {/* 3. Prazos */}
    <View style={globalStyles.section} wrap={false}>
      <Text style={globalStyles.sectionTitle}>4. PRAZOS E REAVALIAÇÃO</Text>
      <View style={localStyles.deadlineBox}>
        <Text style={{ fontSize: 9, color: COLORS.secondary, marginBottom: 2, textTransform: 'uppercase' }}>
          Data prevista para reavaliação deste plano
        </Text>
        <Text style={{ fontSize: 12, fontWeight: 'bold', color: COLORS.primary }}>
          {formatDate(paf.deadline)}
        </Text>
      </View>
    </View>

    {/* 4. Assinaturas */}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 50 }} wrap={false}>
      <SignatureBlock 
        name={paf.autor?.nome || 'Técnico Responsável'} 
        role="Especialista CREAS / Orientador Social" 
      />
      
      <SignatureBlock 
        name={caseData.nomeCompleto} 
        role="Usuário(a) / Responsável Familiar" 
      />
    </View>

    <View style={{ marginTop: 20 }}>
       <Text style={{ fontSize: 8, color: '#9ca3af', textAlign: 'center', fontStyle: 'italic' }}>
          Este documento é parte integrante do prontuário do usuário e possui caráter sigiloso.
       </Text>
    </View>

  </ReportLayout>
);