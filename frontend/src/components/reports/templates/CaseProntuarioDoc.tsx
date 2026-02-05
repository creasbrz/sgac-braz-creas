// frontend/src/components/reports/templates/CaseProntuarioDoc.tsx
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { ReportLayout, styles as globalStyles } from './ReportLayout';
import { CaseDetailData } from '@/types/case';

// --- ESTILOS LOCAIS ---
// Apenas o que é específico deste relatório e não existe no global
const localStyles = StyleSheet.create({
  fieldContainer: {
    marginBottom: 6,
    paddingRight: 8,
  },
  label: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 2,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 10,
    color: '#1e293b',
    fontFamily: 'Helvetica-Bold', // Destaque para valores no prontuário
  },
  sectionGap: {
    marginBottom: 12
  }
});

// --- HELPERS DE FORMATAÇÃO ---

const formatDate = (date: Date | string | undefined | null) => {
  if (!date) return '-';
  try {
    return format(new Date(date), 'dd/MM/yyyy');
  } catch { return '-'; }
};

const formatCPF = (cpf: string | undefined | null) => {
  if (!cpf) return '-';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

const formatCurrency = (val: number | string | undefined | null) => {
  if (val === null || val === undefined || val === '') return 'R$ 0,00';
  const num = Number(val);
  return isNaN(num) ? '-' : `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
};

const formatPhone = (phone: string | undefined | null) => {
  if (!phone) return '-';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 11) return clean.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (clean.length === 10) return clean.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return phone;
};

// --- SUB-COMPONENTES ---

const InfoField = ({ label, value, width = 'auto' }: { label: string, value?: string | number | null, width?: string }) => (
  <View style={[localStyles.fieldContainer, { width }]}>
    <Text style={localStyles.label}>{label}</Text>
    <Text style={localStyles.value}>{value || '-'}</Text>
  </View>
);

const SectionHeader = ({ title }: { title: string }) => (
  <Text style={globalStyles.sectionTitle}>{title}</Text>
);

// --- COMPONENTE PRINCIPAL ---

interface CaseDocProps {
  data: CaseDetailData;
}

export const CaseProntuarioDoc = ({ data }: CaseDocProps) => {

  // Lógica de Endereço
  const enderecoCompleto = [
    data.endereco_logradouro,
    data.endereco_complemento ? `(${data.endereco_complemento})` : null,
    data.endereco_bairro,
  ].filter(Boolean).join(', ');

  const cidadeUf = [data.endereco_cidade, data.endereco_uf].filter(Boolean).join('/');

  // Lógica de Telefone (Prioriza array de contatos, fallback para string antiga)
  const telefonePrincipal = data.contatos && data.contatos.length > 0 
    ? data.contatos[0].numero 
    : data.telefone;

  return (
    <ReportLayout 
      title="Prontuário Técnico"
      subtitle={`Referência: ${data.nomeCompleto.toUpperCase()}`}
    >
      
      {/* 1. IDENTIFICAÇÃO PESSOAL */}
      <View style={globalStyles.section}>
        <SectionHeader title="1. Identificação Pessoal" />
        
        <View style={globalStyles.row}>
          <InfoField label="Nome Completo" value={data.nomeCompleto.toUpperCase()} width="60%" />
          <InfoField label="CPF" value={formatCPF(data.cpf)} width="40%" />
        </View>
        
        <View style={globalStyles.row}>
          <InfoField label="Nome Social" value={data.nomeSocial} width="40%" />
          <InfoField label="Data Nasc." value={formatDate(data.nascimento)} width="30%" />
          <InfoField label="Sexo" value={data.sexo} width="30%" />
        </View>

        <View style={globalStyles.row}>
          <InfoField label="Ocupação" value={data.ocupacao} width="40%" />
          <InfoField label="Renda Individual" value={formatCurrency(data.renda)} width="30%" />
          <InfoField label="Status Atual" value={data.status?.replace(/_/g, ' ')} width="30%" />
        </View>
      </View>

      {/* 2. LOCALIZAÇÃO E CONTATO */}
      <View style={globalStyles.section}>
        <SectionHeader title="2. Localização e Contato" />
        
        <View style={globalStyles.row}>
          <InfoField label="Endereço Resindencial" value={enderecoCompleto} width="70%" />
          <InfoField label="CEP" value={data.endereco_cep} width="30%" />
        </View>
        
        <View style={globalStyles.row}>
          <InfoField label="Cidade/UF" value={cidadeUf} width="40%" />
          <InfoField label="Região Administrativa" value={data.endereco_ra} width="30%" />
          <InfoField label="Telefone Principal" value={formatPhone(telefonePrincipal)} width="30%" />
        </View>
      </View>

      {/* 3. DADOS DO ATENDIMENTO */}
      <View style={globalStyles.section}>
        <SectionHeader title="3. Dados do Atendimento" />
        
        <View style={globalStyles.row}>
          <InfoField label="Data de Entrada" value={formatDate(data.dataEntrada)} width="33%" />
          <InfoField label="Origem da Demanda" value={data.origem} width="33%" />
          <InfoField label="Técnico de Referência" value={data.especialistaPAEFI?.nome} width="33%" />
        </View>
        
        <View style={globalStyles.row}>
          <InfoField label="Violações Identificadas" value={data.violacao?.join(', ')} width="100%" />
        </View>
      </View>

      {/* 4. COMPOSIÇÃO FAMILIAR */}
      <View style={globalStyles.section} wrap={false}>
        <SectionHeader title="4. Composição Familiar" />
        
        <View style={globalStyles.table}>
          {/* Header da Tabela */}
          <View style={[globalStyles.row, globalStyles.headerCell]}>
            <Text style={[globalStyles.cell, { width: '40%', fontWeight: 'bold' }]}>NOME</Text>
            <Text style={[globalStyles.cell, { width: '25%', fontWeight: 'bold' }]}>PARENTESCO</Text>
            <Text style={[globalStyles.cell, globalStyles.textCenter, { width: '15%', fontWeight: 'bold' }]}>IDADE</Text>
            <Text style={[globalStyles.cell, globalStyles.textRight, { width: '20%', fontWeight: 'bold' }]}>RENDA</Text>
          </View>

          {/* Linhas da Tabela */}
          {data.familia?.map((membro, i) => (
            <View key={i} style={[globalStyles.row, i % 2 !== 0 ? { backgroundColor: '#f9fafb' } : {}]}>
              <Text style={[globalStyles.cell, { width: '40%' }]}>{membro.nome}</Text>
              <Text style={[globalStyles.cell, { width: '25%' }]}>{membro.parentesco}</Text>
              <Text style={[globalStyles.cell, globalStyles.textCenter, { width: '15%' }]}>
                {membro.idade ? `${membro.idade} anos` : '-'}
              </Text>
              <Text style={[globalStyles.cell, globalStyles.textRight, { width: '20%' }]}>
                {formatCurrency(membro.renda)}
              </Text>
            </View>
          ))}

          {(!data.familia || data.familia.length === 0) && (
            <Text style={[globalStyles.cell, globalStyles.textCenter, { padding: 10, color: '#94a3b8', width: '100%' }]}>
              Nenhum familiar cadastrado.
            </Text>
          )}
        </View>
      </View>
      
      {/* Nota de Rodapé específica do Prontuário */}
      <View style={{ marginTop: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
         <Text style={{ fontSize: 8, color: '#64748b', textAlign: 'center' }}>
            Este documento contém dados sensíveis protegidos pela LGPD. O sigilo é obrigatório.
         </Text>
      </View>

    </ReportLayout>
  );
};