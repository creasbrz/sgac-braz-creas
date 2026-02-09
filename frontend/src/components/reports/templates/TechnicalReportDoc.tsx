import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Estilos Profissionais (Padrão ABNT/Oficial)
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
    color: '#333'
  },
  header: {
    marginBottom: 30,
    borderBottom: 1,
    borderColor: '#ccc',
    paddingBottom: 10,
    textAlign: 'center'
  },
  brasao: {
    width: 60,
    height: 60,
    alignSelf: 'center',
    marginBottom: 10,
    backgroundColor: '#eee', // Placeholder cinza se não tiver imagem
    borderRadius: 30
  },
  institutionName: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  subHeader: {
    fontSize: 10,
    color: '#666'
  },
  titleBox: {
    marginVertical: 20,
    alignItems: 'center'
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textDecoration: 'underline'
  },
  section: {
    marginBottom: 15
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: '#f0f0f0',
    padding: 4,
    marginBottom: 8,
    borderLeft: 3,
    borderColor: '#333'
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4
  },
  label: {
    width: 140,
    fontWeight: 'bold',
    fontSize: 10
  },
  value: {
    flex: 1,
    fontSize: 10
  },
  text: {
    textAlign: 'justify',
    marginBottom: 8,
    textIndent: 20 // Parágrafo ABNT
  },
  signatureArea: {
    marginTop: 60,
    alignItems: 'center'
  },
  signatureLine: {
    width: 250,
    borderBottom: 1,
    borderColor: '#000',
    marginBottom: 5
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    textAlign: 'center',
    color: '#999',
    borderTop: 1,
    borderColor: '#eee',
    paddingTop: 10
  }
})

interface ReportProps {
  type: string
  caseData: any
  pafData: any
  authorName?: string
  authorRole?: string
}

const TITLES: Record<string, string> = {
  'RELATORIO_SOCIO': 'RELATÓRIO SOCIOASSISTENCIAL',
  'RELATORIO_INFORMATIVO': 'RELATÓRIO INFORMATIVO',
  'SOLICITACAO_ACOLHIMENTO': 'SOLICITAÇÃO DE ACOLHIMENTO INSTITUCIONAL'
}

export const TechnicalReportDoc = ({ type, caseData, pafData, authorName, authorRole }: ReportProps) => {
  const currentDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Cabeçalho Institucional */}
        <View style={styles.header}>
          {/* <Image src="/logo-brasao.png" style={styles.brasao} /> // Descomente e coloque o logo na pasta public */}
          <Text style={styles.institutionName}>Governo do Distrito Federal</Text>
          <Text style={styles.subHeader}>Secretaria de Desenvolvimento Social - SEDES</Text>
          <Text style={styles.subHeader}>Centro de Referência Especializado de Assistência Social - CREAS Brazlândia</Text>
        </View>

        {/* Título do Documento */}
        <View style={styles.titleBox}>
          <Text style={styles.title}>{TITLES[type] || 'DOCUMENTO TÉCNICO'}</Text>
        </View>

        {/* 1. Identificação da Família */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. IDENTIFICAÇÃO</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Titular/Referência:</Text>
            <Text style={styles.value}>{caseData?.nomeCompleto?.toUpperCase() || 'NÃO INFORMADO'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>CPF:</Text>
            <Text style={styles.value}>{caseData?.cpf || '---'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Data de Nascimento:</Text>
            <Text style={styles.value}>
              {caseData?.nascimento ? format(new Date(caseData.nascimento), 'dd/MM/yyyy') : '---'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Endereço:</Text>
            <Text style={styles.value}>
              {caseData?.endereco?.logradouro}, {caseData?.endereco?.cidade} - {caseData?.endereco?.ra}
            </Text>
          </View>
        </View>

        {/* 2. Conteúdo Técnico (Dinâmico baseado no PAF) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. RELATO TÉCNICO</Text>
          
          <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 2 }}>Diagnóstico Situacional:</Text>
          <Text style={styles.text}>{pafData?.diagnostico || 'Não preenchido.'}</Text>

          <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 2, marginTop: 6 }}>Objetivos Traçados:</Text>
          <Text style={styles.text}>{pafData?.objetivos || 'Não preenchido.'}</Text>

          <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 2, marginTop: 6 }}>Estratégias e Encaminhamentos:</Text>
          <Text style={styles.text}>{pafData?.estrategias || 'Não preenchido.'}</Text>
        </View>

        {/* 3. Conclusão/Parecer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. PARECER TÉCNICO</Text>
          <Text style={styles.text}>
            Diante do exposto, este equipamento sugere a continuidade do acompanhamento socioassistencial 
            visando a superação das vulnerabilidades apresentadas. Colocamo-nos à disposição para 
            quaisquer esclarecimentos adicionais.
          </Text>
        </View>

        {/* Data e Assinatura */}
        <View style={{ marginTop: 20 }}>
          <Text style={{ textAlign: 'right', marginBottom: 40 }}>Brazlândia - DF, {currentDate}.</Text>
          
          <View style={styles.signatureArea}>
            <View style={styles.signatureLine} />
            <Text style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{authorName || 'Técnico Responsável'}</Text>
            <Text style={{ fontSize: 10 }}>{authorRole || 'Especialista em Assistência Social'}</Text>
            <Text style={{ fontSize: 10 }}>CREAS Brazlândia</Text>
          </View>
        </View>

        {/* Rodapé */}
        <Text style={styles.footer}>
          Documento gerado eletronicamente pelo Sistema de Gestão (SGAC). A autenticidade pode ser verificada junto ao CREAS.
        </Text>

      </Page>
    </Document>
  )
}