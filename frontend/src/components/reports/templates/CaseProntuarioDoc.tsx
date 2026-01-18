// frontend/src/components/reports/templates/CaseProntuarioDoc.tsx
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';
import { CaseDetailData } from '@/types/case';
import { format } from 'date-fns';

// 1. REGISTRO DA FONTE (Mesma do Design System)
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v20/KFOmCnqEu92Fr1Mu4mxP.ttf', fontWeight: 'normal' },
    { src: 'https://fonts.gstatic.com/s/roboto/v20/KFOlCnqEu92Fr1MmWUlfBBc9.ttf', fontWeight: 'bold' },
    { src: 'https://fonts.gstatic.com/s/roboto/v20/KFOkCnqEu92Fr1Mu51xIIzIXKMny.ttf', fontStyle: 'italic' }
  ]
});

// --- DESIGN TOKENS ---
const theme = {
  colors: {
    primary: '#111827',     // Gray 900
    secondary: '#4b5563',   // Gray 600
    text: '#1f2937',        // Gray 800
    border: '#e5e7eb',      // Gray 200
    headerBg: '#f3f4f6',    // Gray 100
  },
  fontSizes: {
    xs: 8,
    sm: 9,
    base: 10,
    lg: 12,
    xl: 16,
  },
};

// --- ESTILOS ---
const styles = StyleSheet.create({
  page: {
    padding: 30,
    paddingTop: 40,
    fontSize: theme.fontSizes.base,
    fontFamily: 'Roboto',
    color: theme.colors.text,
    backgroundColor: '#ffffff',
  },
  // Cabeçalho
  headerContainer: {
    marginBottom: 25,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: theme.fontSizes.xl,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerMeta: {
    position: 'absolute',
    right: 0,
    top: 0,
    textAlign: 'right',
  },
  headerMetaText: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.secondary,
    marginBottom: 2,
  },
  // Seções
  section: {
    marginBottom: 15,
  },
  sectionHeader: {
    backgroundColor: theme.colors.headerBg,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: theme.colors.primary,
  },
  // Grid System (Substitui Tabela antiga)
  row: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-end',
  },
  fieldContainer: {
    marginRight: 10,
  },
  label: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.secondary,
    marginBottom: 2,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  value: {
    fontSize: theme.fontSizes.base,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  // Tabela Limpa (Para Família)
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary,
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableHeaderCell: {
    fontSize: theme.fontSizes.xs,
    fontWeight: 'bold',
    color: theme.colors.secondary,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 4,
  },
  tableCell: {
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
  },
  // Helpers
  emptyState: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.secondary,
    fontStyle: 'italic',
    padding: 5,
  },
});

// --- HELPERS DE FORMATAÇÃO ---
const formatDateSafe = (date: Date | string | undefined | null) => {
  if (!date) return '-';
  try {
    return format(new Date(date), 'dd/MM/yyyy');
  } catch { return '-'; }
};

const formatCPF = (cpf: string | undefined | null) => {
  if (!cpf) return '-';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

const formatPhone = (phone: string | undefined | null) => {
  if (!phone) return '-';
  return phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3").replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
};

const formatCurrency = (val: number | string | undefined | null) => {
  if (val === null || val === undefined || val === '') return 'R$ 0,00';
  const num = Number(val);
  return isNaN(num) ? '-' : `R$ ${num.toFixed(2).replace('.', ',')}`;
};

// --- COMPONENTES AUXILIARES ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Field = ({ label, value, width = 'auto' }: { label: string, value?: string | number | null, width?: any }) => (
  <View style={[styles.fieldContainer, { width }]}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value || '-'}</Text>
  </View>
);

const SectionTitle = ({ title }: { title: string }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

interface CaseDocProps {
  data: CaseDetailData;
}

export const CaseProntuarioDoc = ({ data }: CaseDocProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* CABEÇALHO */}
      <View style={styles.headerContainer} fixed>
        <View>
          <Text style={styles.headerTitle}>Prontuário Técnico</Text>
          <Text style={styles.headerSubtitle}>CREAS - Sistema de Gestão</Text>
        </View>
        <View style={styles.headerMeta}>
          <Text style={styles.headerMetaText}>Beneficiário: {data.nomeCompleto.substring(0, 25).toUpperCase()}</Text>
          <Text style={styles.headerMetaText}>Emissão: {format(new Date(), 'dd/MM/yyyy HH:mm')}</Text>
        </View>
      </View>

      {/* 1. IDENTIFICAÇÃO PESSOAL */}
      <View style={styles.section}>
        <SectionTitle title="1. Identificação Pessoal" />
        
        <View style={styles.row}>
          <Field label="Nome Completo" value={data.nomeCompleto.toUpperCase()} width="60%" />
          <Field label="CPF" value={formatCPF(data.cpf)} width="40%" />
        </View>
        
        <View style={styles.row}>
          <Field label="Nome Social" value={data.nomeSocial} width="40%" />
          <Field label="Data Nasc." value={formatDateSafe(data.nascimento)} width="30%" />
          <Field label="Sexo" value={data.sexo} width="30%" />
        </View>

        <View style={styles.row}>
          <Field label="Ocupação" value={data.ocupacao} width="40%" />
          <Field label="Renda Individual" value={formatCurrency(data.renda)} width="30%" />
          <Field label="Status" value={data.status?.replace(/_/g, ' ')} width="30%" />
        </View>
      </View>

      {/* 2. LOCALIZAÇÃO E CONTATO */}
      <View style={styles.section}>
        <SectionTitle title="2. Localização e Contato" />
        
        <View style={styles.row}>
          <Field 
            label="Endereço" 
            value={`${data.endereco_logradouro || ''}, ${data.endereco_complemento || ''} - ${data.endereco_bairro || ''}`} 
            width="70%" 
          />
          <Field label="CEP" value={data.endereco_cep} width="30%" />
        </View>
        
        <View style={styles.row}>
          <Field label="Cidade/UF" value={`${data.endereco_cidade || ''}/${data.endereco_uf || ''}`} width="50%" />
          <Field 
            label="Telefone" 
            // Lógica de fallback para contatos antigos ou estrutura nova
            value={data.contatos && Array.isArray(data.contatos) && data.contatos.length > 0 
                ? `${formatPhone(data.contatos[0].numero)}` 
                : formatPhone(data.telefone)} 
            width="50%" 
          />
        </View>
      </View>

      {/* 3. DADOS TÉCNICOS */}
      <View style={styles.section}>
        <SectionTitle title="3. Dados do Atendimento" />
        <View style={styles.row}>
          <Field label="Data Entrada" value={formatDateSafe(data.dataEntrada)} width="33%" />
          <Field label="Origem da Demanda" value={data.origem} width="33%" />
          <Field label="Técnico Ref." value={data.especialistaPAEFI?.nome} width="33%" />
        </View>
        <View style={styles.row}>
          <Field label="Violações Identificadas" value={data.violacao?.join(', ')} width="100%" />
        </View>
      </View>

      {/* 4. COMPOSIÇÃO FAMILIAR */}
      <View style={styles.section} wrap={false}>
        <SectionTitle title="4. Composição Familiar" />
        
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { width: '40%' }]}>Nome</Text>
          <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Parentesco</Text>
          <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'center' }]}>Idade</Text>
          <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>Renda</Text>
        </View>

        {data.familia?.map((membro, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: '40%' }]}>{membro.nome}</Text>
            <Text style={[styles.tableCell, { width: '25%' }]}>{membro.parentesco}</Text>
            <Text style={[styles.tableCell, { width: '15%', textAlign: 'center' }]}>
                {membro.idade ? `${membro.idade} anos` : '-'}
            </Text>
            <Text style={[styles.tableCell, { width: '20%', textAlign: 'right' }]}>
                {formatCurrency(membro.renda)}
            </Text>
          </View>
        ))}

        {(!data.familia || data.familia.length === 0) ? (
           <Text style={styles.emptyState}>Nenhum familiar cadastrado.</Text>
        ) : null}
      </View>

      {/* RODAPÉ */}
      <Text 
        style={{ position: 'absolute', bottom: 20, left: 30, right: 30, textAlign: 'center', fontSize: 8, color: theme.colors.secondary, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10 }} 
        render={({ pageNumber, totalPages }) => `Documento Confidencial - Página ${pageNumber} de ${totalPages}`} 
        fixed 
      />

    </Page>
  </Document>
);