// frontend/src/components/reports/templates/CaseDoc.tsx
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReportLayout, styles as globalStyles } from './ReportLayout';
import { CaseDetailData } from '@/types/case';

// --- ESTILOS LOCAIS (Estendem os globais) ---
const localStyles = StyleSheet.create({
  fieldContainer: {
    marginBottom: 6,
    paddingRight: 8,
  },
  label: {
    fontSize: 8,
    color: '#64748b', // Slate 500
    textTransform: 'uppercase',
    marginBottom: 2,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 10,
    color: '#1e293b', // Slate 800
    textAlign: 'justify',
  },
  valueHighlight: {
    fontSize: 10,
    color: '#0f172a', // Slate 900
    fontWeight: 'bold',
  },
  evolutionItem: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  evolutionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    backgroundColor: '#f8fafc',
    padding: 4,
    borderRadius: 2,
  },
  evolutionMeta: {
    fontSize: 8,
    color: '#475569',
    fontWeight: 'bold',
  },
  emptyState: {
    fontSize: 9,
    color: '#94a3b8',
    fontStyle: 'italic',
    padding: 8,
    textAlign: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  }
});

// --- HELPERS ---

const formatCurrency = (val: number | string | null | undefined) => {
  if (val === null || val === undefined) return '-';
  const num = Number(val);
  return isNaN(num) ? '-' : `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
};

const formatDate = (date: string | Date | null | undefined) => {
  if (!date) return '-';
  try {
    return format(new Date(date), 'dd/MM/yyyy');
  } catch { return '-'; }
};

// --- SUB-COMPONENTES ---

const InfoField = ({ label, value, width = '100%', highlight = false }: { label: string, value?: string | number | null, width?: string, highlight?: boolean }) => (
  <View style={[localStyles.fieldContainer, { width }]}>
    <Text style={localStyles.label}>{label}</Text>
    <Text style={highlight ? localStyles.valueHighlight : localStyles.value}>{value || '-'}</Text>
  </View>
);

const SectionHeader = ({ title }: { title: string }) => (
  <Text style={globalStyles.sectionTitle}>{title}</Text>
);

// --- COMPONENTE PRINCIPAL ---

interface CaseDocProps {
  data: CaseDetailData;
}

export const CaseDoc = ({ data }: CaseDocProps) => {
  
  const enderecoCompleto = [
    data.endereco_logradouro,
    data.endereco_complemento,
    data.endereco_bairro,
    data.endereco_cidade,
    data.endereco_uf
  ].filter(Boolean).join(', ');

  return (
    <ReportLayout 
      title="Ficha Social / Prontuário"
      subtitle={`Referência: ${data.nomeCompleto} (CPF: ${data.cpf || 'N/I'})`}
    >
      
      {/* 1. IDENTIFICAÇÃO */}
      <View style={globalStyles.section}>
        <SectionHeader title="1. Identificação do Titular" />
        
        <View style={globalStyles.row}>
          <InfoField label="Nome Completo" value={data.nomeCompleto} width="60%" highlight />
          <InfoField label="CPF" value={data.cpf} width="25%" />
          <InfoField label="Nascimento" value={formatDate(data.nascimento)} width="15%" />
        </View>

        <View style={globalStyles.row}>
          <InfoField label="Nome Social" value={data.nomeSocial} width="40%" />
          <InfoField label="Sexo" value={data.sexo} width="20%" />
          <InfoField label="Ocupação" value={data.ocupacao} width="25%" />
          <InfoField label="Renda" value={formatCurrency(data.renda)} width="15%" />
        </View>

        {(data.responsavelLegal || data.parentescoResponsavel) && (
           <View style={[globalStyles.row, { marginTop: 4, padding: 6, backgroundColor: '#f8fafc', borderRadius: 4 }]}>
             <InfoField label="Responsável Legal" value={data.responsavelLegal} width="60%" />
             <InfoField label="Vínculo" value={data.parentescoResponsavel} width="40%" />
           </View>
        )}
      </View>

      {/* 2. DADOS DE CONTATO E TÉCNICOS */}
      <View style={globalStyles.section}>
        <SectionHeader title="2. Dados Técnicos e Localização" />
        
        <View style={globalStyles.row}>
          <InfoField label="Endereço" value={enderecoCompleto} width="65%" />
          <InfoField label="CEP" value={data.endereco_cep} width="15%" />
          <InfoField label="RA" value={data.endereco_ra} width="20%" />
        </View>

        <View style={globalStyles.row}>
          <InfoField label="Telefone" value={data.telefone} width="30%" />
          <InfoField label="Origem" value={data.origem} width="25%" />
          <InfoField label="Data Entrada" value={formatDate(data.dataEntrada)} width="20%" />
          <InfoField label="Técnico Ref." value={data.especialistaPAEFI?.nome} width="25%" highlight />
        </View>

        <View style={globalStyles.row}>
           <InfoField label="Violações" value={data.violacao?.join(', ')} width="100%" />
        </View>
        
        {data.observacoes && (
          <View style={{ marginTop: 4 }}>
             <InfoField label="Observações Iniciais" value={data.observacoes} />
          </View>
        )}
      </View>

      {/* 3. COMPOSIÇÃO FAMILIAR */}
      <View style={globalStyles.section} wrap={false}>
        <SectionHeader title="3. Composição Familiar" />
        
        <View style={globalStyles.table}>
          <View style={[globalStyles.row, globalStyles.headerCell]}>
            <Text style={[globalStyles.cell, { width: '40%', fontWeight: 'bold' }]}>NOME</Text>
            <Text style={[globalStyles.cell, { width: '25%', fontWeight: 'bold' }]}>PARENTESCO</Text>
            <Text style={[globalStyles.cell, globalStyles.textCenter, { width: '15%', fontWeight: 'bold' }]}>IDADE</Text>
            <Text style={[globalStyles.cell, globalStyles.textRight, { width: '20%', fontWeight: 'bold' }]}>RENDA</Text>
          </View>

          {data.familia?.map((membro, i) => (
            <View key={i} style={[globalStyles.row, i % 2 !== 0 ? { backgroundColor: '#f9fafb' } : {}]}>
              <Text style={[globalStyles.cell, { width: '40%' }]}>{membro.nome}</Text>
              <Text style={[globalStyles.cell, { width: '25%' }]}>{membro.parentesco}</Text>
              <Text style={[globalStyles.cell, globalStyles.textCenter, { width: '15%' }]}>{membro.idade || '-'}</Text>
              <Text style={[globalStyles.cell, globalStyles.textRight, { width: '20%' }]}>{formatCurrency(membro.renda)}</Text>
            </View>
          ))}

          {(!data.familia || data.familia.length === 0) && (
             <Text style={localStyles.emptyState}>Nenhum familiar cadastrado.</Text>
          )}
        </View>
      </View>

      {/* 4. HISTÓRICO DE EVOLUÇÕES */}
      <View style={globalStyles.section} break>
        <SectionHeader title="4. Histórico de Evoluções" />
        
        {data.evolucoes?.map((evo, i) => (
          <View key={i} style={localStyles.evolutionItem} wrap={false}>
            <View style={localStyles.evolutionHeader}>
              <Text style={localStyles.evolutionMeta}>
                DATA: {format(new Date(evo.createdAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </Text>
              <Text style={localStyles.evolutionMeta}>
                RESP: {evo.autor?.nome?.toUpperCase() || 'SISTEMA'}
              </Text>
            </View>
            <Text style={[localStyles.value, { lineHeight: 1.5 }]}>{evo.conteudo}</Text>
          </View>
        ))}

        {(!data.evolucoes || data.evolucoes.length === 0) && (
           <Text style={localStyles.emptyState}>Nenhum registro de atendimento.</Text>
        )}
      </View>

      {/* 5. ENCAMINHAMENTOS E BENEFÍCIOS (Lado a Lado se possível, ou sequencial) */}
      <View style={globalStyles.section} wrap={false}>
        <SectionHeader title="5. Encaminhamentos e Rede" />
        <View style={globalStyles.table}>
          <View style={[globalStyles.row, globalStyles.headerCell]}>
            <Text style={[globalStyles.cell, { width: '15%', fontWeight: 'bold' }]}>DATA</Text>
            <Text style={[globalStyles.cell, { width: '30%', fontWeight: 'bold' }]}>INSTITUIÇÃO</Text>
            <Text style={[globalStyles.cell, { width: '35%', fontWeight: 'bold' }]}>MOTIVO</Text>
            <Text style={[globalStyles.cell, { width: '20%', fontWeight: 'bold' }]}>STATUS</Text>
          </View>
          {data.encaminhamentos?.map((enc, i) => (
            <View key={i} style={[globalStyles.row, i % 2 !== 0 ? { backgroundColor: '#f9fafb' } : {}]}>
              <Text style={[globalStyles.cell, { width: '15%' }]}>{formatDate(enc.dataEnvio)}</Text>
              <Text style={[globalStyles.cell, { width: '30%' }]}>{enc.instituicao}</Text>
              <Text style={[globalStyles.cell, { width: '35%' }]}>{enc.motivo}</Text>
              <Text style={[globalStyles.cell, { width: '20%', fontSize: 8 }]}>{enc.status}</Text>
            </View>
          ))}
          {(!data.encaminhamentos || data.encaminhamentos.length === 0) && (
             <Text style={localStyles.emptyState}>Sem encaminhamentos.</Text>
          )}
        </View>
      </View>

      <View style={globalStyles.section} wrap={false}>
        <SectionHeader title="6. Benefícios Eventuais" />
        <View style={globalStyles.table}>
          <View style={[globalStyles.row, globalStyles.headerCell]}>
            <Text style={[globalStyles.cell, { width: '20%', fontWeight: 'bold' }]}>SOLICITAÇÃO</Text>
            <Text style={[globalStyles.cell, { width: '40%', fontWeight: 'bold' }]}>BENEFÍCIO</Text>
            <Text style={[globalStyles.cell, { width: '20%', fontWeight: 'bold' }]}>STATUS</Text>
            <Text style={[globalStyles.cell, { width: '20%', fontWeight: 'bold' }]}>ENTREGA</Text>
          </View>
          {data.entregas?.map((ben, i) => (
            <View key={i} style={[globalStyles.row, i % 2 !== 0 ? { backgroundColor: '#f9fafb' } : {}]}>
              <Text style={[globalStyles.cell, { width: '20%' }]}>{formatDate(ben.dataSolicitacao)}</Text>
              <Text style={[globalStyles.cell, { width: '40%' }]}>{ben.tipo}</Text>
              <Text style={[globalStyles.cell, { width: '20%' }]}>{ben.status}</Text>
              <Text style={[globalStyles.cell, { width: '20%' }]}>{formatDate(ben.dataEntrega)}</Text>
            </View>
          ))}
          {(!data.entregas || data.entregas.length === 0) && (
             <Text style={localStyles.emptyState}>Sem benefícios.</Text>
          )}
        </View>
      </View>

    </ReportLayout>
  );
};