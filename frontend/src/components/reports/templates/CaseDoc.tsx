// frontend/src/components/reports/templates/CaseDoc.tsx
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { CaseDetailData } from '@/types/case';

// --- DESIGN TOKENS ---
const theme = {
  colors: {
    primary: '#111827',     // Gray 900
    secondary: '#4b5563',   // Gray 600
    text: '#1f2937',        // Gray 800
    border: '#e5e7eb',      // Gray 200
    headerBg: '#f3f4f6',    // Gray 100
    accent: '#000000',      
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
    fontFamily: 'Helvetica', // Fonte nativa (Sem erros de 404)
    color: theme.colors.text,
    backgroundColor: '#ffffff',
  },
  // Cabeçalho
  headerContainer: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: theme.fontSizes.xl,
    fontFamily: 'Helvetica-Bold',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: theme.fontSizes.lg,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: theme.colors.primary,
  },
  // Grid Layout
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
  },
  value: {
    fontSize: theme.fontSizes.base,
    color: theme.colors.primary,
    fontFamily: 'Helvetica-Bold',
  },
  // Tabelas
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary,
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableHeaderCell: {
    fontSize: theme.fontSizes.xs,
    fontFamily: 'Helvetica-Bold',
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
  // Evoluções
  evolutionItem: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  evolutionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  evolutionMeta: {
    fontSize: theme.fontSizes.xs,
    fontFamily: 'Helvetica-Bold',
    color: theme.colors.secondary,
    backgroundColor: theme.colors.headerBg,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
  },
  evolutionContent: {
    fontSize: theme.fontSizes.base,
    lineHeight: 1.5,
    textAlign: 'justify',
  },
  // Helpers
  emptyState: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.secondary,
    fontStyle: 'italic',
    padding: 5,
  },
});

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

const formatCurrency = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') return '-';
  const num = Number(value);
  if (isNaN(num)) return '-';
  return `R$ ${num.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
};

interface CaseDocProps {
  data: CaseDetailData;
}

export const CaseDoc = ({ data }: CaseDocProps) => {
  // Helpers para dados complexos
  const enderecoCompleto = [
    data.endereco_logradouro,
    data.endereco_complemento,
    data.endereco_bairro,
    data.endereco_cidade,
    data.endereco_uf
  ].filter(Boolean).join(', ');

  const formattedDate = data.nascimento ? format(new Date(data.nascimento), 'dd/MM/yyyy') : '-';
  const entryDate = data.dataEntrada ? format(new Date(data.dataEntrada), 'dd/MM/yyyy') : '-';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* CABEÇALHO */}
        <View style={styles.headerContainer} fixed>
          <View>
            <Text style={styles.headerTitle}>Ficha Social / Prontuário</Text>
            <Text style={styles.headerSubtitle}>Sistema de Gestão de Assistência Social - CREAS</Text>
          </View>
          <View style={styles.headerMeta}>
            <Text style={styles.headerMetaText}>CREAS Brazlândia</Text>
            <Text style={styles.headerMetaText}>Emissão: {format(new Date(), 'dd/MM/yyyy HH:mm')}</Text>
          </View>
        </View>

        {/* 1. IDENTIFICAÇÃO (Campos validados pelo schema.prisma) */}
        <View style={styles.section}>
          <SectionTitle title="1. Identificação do Titular" />
          
          <View style={styles.row}>
            <Field label="Nome Completo" value={data.nomeCompleto} width="60%" />
            <Field label="CPF" value={data.cpf} width="40%" />
          </View>
          
          <View style={styles.row}>
            <Field label="Nome Social" value={data.nomeSocial} width="40%" />
            <Field label="Data Nascimento" value={formattedDate} width="30%" />
            <Field label="Sexo" value={data.sexo} width="30%" />
          </View>

          <View style={styles.row}>
            <Field label="Ocupação" value={data.ocupacao} width="40%" />
            <Field label="Renda Mensal" value={formatCurrency(data.renda)} width="30%" />
            <Field label="Status" value={data.status?.replace(/_/g, ' ')} width="30%" />
          </View>

          {/* Se houver responsável legal (Menores/Incapazes) */}
          {(data.responsavelLegal || data.parentescoResponsavel) && (
             <View style={[styles.row, { marginTop: 5, padding: 5, backgroundColor: theme.colors.headerBg }]}>
                <Field label="Responsável Legal" value={data.responsavelLegal} width="60%" />
                <Field label="Vínculo/Parentesco" value={data.parentescoResponsavel} width="40%" />
             </View>
          )}
        </View>

        {/* 2. CONTATO E LOCALIZAÇÃO */}
        <View style={styles.section}>
          <SectionTitle title="2. Contato e Localização" />
          
          <View style={styles.row}>
            <Field label="Endereço Completo" value={enderecoCompleto} width="75%" />
            <Field label="CEP" value={data.endereco_cep} width="25%" />
          </View>
          
          <View style={styles.row}>
            <Field label="Região Administrativa (RA)" value={data.endereco_ra} width="50%" />
            <Field label="Telefone Principal" value={data.telefone} width="50%" />
          </View>
        </View>

        {/* 3. DADOS DA DEMANDA */}
        <View style={styles.section}>
          <SectionTitle title="3. Dados da Demanda" />
          <View style={styles.row}>
            <Field label="Data de Entrada" value={entryDate} width="25%" />
            <Field label="Origem" value={data.origem} width="25%" />
            <Field label="Urgência" value={data.urgencia} width="25%" />
            <Field label="Técnico Ref." value={data.especialistaPAEFI?.nome} width="25%" />
          </View>
          <View style={styles.row}>
            <Field label="Violações Identificadas" value={data.violacao?.join(', ')} width="100%" />
          </View>
          {data.observacoes && (
            <View style={styles.row}>
               <Field label="Observações Iniciais" value={data.observacoes} width="100%" />
            </View>
          )}
        </View>

        {/* 4. COMPOSIÇÃO FAMILIAR */}
        <View style={styles.section}>
          <SectionTitle title="4. Composição Familiar" />
          
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '40%' }]}>Nome</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Parentesco</Text>
            <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'center' }]}>Idade</Text>
            <Text style={[styles.tableHeaderCell, { width: '25%', textAlign: 'right' }]}>Renda</Text>
          </View>

          {data.familia?.map((membro, i) => (
            <View key={i} style={styles.tableRow} wrap={false}>
              <Text style={[styles.tableCell, { width: '40%' }]}>{membro.nome}</Text>
              <Text style={[styles.tableCell, { width: '20%' }]}>{membro.parentesco}</Text>
              <Text style={[styles.tableCell, { width: '15%', textAlign: 'center' }]}>{membro.idade || '-'}</Text>
              <Text style={[styles.tableCell, { width: '25%', textAlign: 'right' }]}>{formatCurrency(membro.renda)}</Text>
            </View>
          ))}
          
          {(!data.familia || data.familia.length === 0) ? (
             <Text style={styles.emptyState}>Nenhum familiar cadastrado.</Text>
          ) : null}
        </View>

        {/* 5. EVOLUÇÕES (Histórico) */}
        <View style={styles.section} break>
          <SectionTitle title="5. Histórico de Evoluções" />
          
          {data.evolucoes?.map((evo, i) => (
            <View key={i} style={styles.evolutionItem} wrap={false}>
              <View style={styles.evolutionHeader}>
                <Text style={styles.evolutionMeta}>
                  DATA: {format(new Date(evo.createdAt), 'dd/MM/yyyy HH:mm')}
                </Text>
                <Text style={styles.evolutionMeta}>
                  TÉCNICO: {evo.autor?.nome || 'Sistema'}
                </Text>
              </View>
              <Text style={styles.evolutionContent}>{evo.conteudo}</Text>
            </View>
          ))}

          {(!data.evolucoes || data.evolucoes.length === 0) ? (
             <Text style={styles.emptyState}>Nenhum registro de evolução encontrado.</Text>
          ) : null}
        </View>

        {/* 6. ENCAMINHAMENTOS */}
        <View style={styles.section} wrap={false}>
          <SectionTitle title="6. Encaminhamentos Realizados" />
          
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Data</Text>
            <Text style={[styles.tableHeaderCell, { width: '35%' }]}>Instituição</Text>
            <Text style={[styles.tableHeaderCell, { width: '35%' }]}>Motivo</Text>
            <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Status</Text>
          </View>
          
          {data.encaminhamentos?.map((enc, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '15%' }]}>{format(new Date(enc.dataEnvio), 'dd/MM/yyyy')}</Text>
              <Text style={[styles.tableCell, { width: '35%' }]}>{enc.instituicao}</Text>
              <Text style={[styles.tableCell, { width: '35%' }]}>{enc.motivo}</Text>
              <Text style={[styles.tableCell, { width: '15%' }]}>{enc.status}</Text>
            </View>
          ))}

          {(!data.encaminhamentos || data.encaminhamentos.length === 0) ? (
             <Text style={styles.emptyState}>Nenhum encaminhamento registrado.</Text>
          ) : null}
        </View>

        {/* 7. BENEFÍCIOS */}
        <View style={styles.section} wrap={false}>
          <SectionTitle title="7. Benefícios e Entregas" />
          
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Data Solic.</Text>
            <Text style={[styles.tableHeaderCell, { width: '40%' }]}>Benefício</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Status</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Entrega</Text>
          </View>

          {data.entregas?.map((ben, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '20%' }]}>{format(new Date(ben.dataSolicitacao), 'dd/MM/yyyy')}</Text>
              <Text style={[styles.tableCell, { width: '40%' }]}>{ben.tipo}</Text>
              <Text style={[styles.tableCell, { width: '20%' }]}>{ben.status}</Text>
              <Text style={[styles.tableCell, { width: '20%' }]}>
                {ben.dataEntrega ? format(new Date(ben.dataEntrega), 'dd/MM/yyyy') : '-'}
              </Text>
            </View>
          ))}

          {(!data.entregas || data.entregas.length === 0) ? (
             <Text style={styles.emptyState}>Nenhum benefício registrado.</Text>
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
};