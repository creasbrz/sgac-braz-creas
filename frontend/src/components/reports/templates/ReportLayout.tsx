// frontend/src/components/reports/templates/ReportLayout.tsx
import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- DESIGN TOKENS (Fonte da Verdade Visual) ---
const theme = {
  colors: {
    primary: '#111827',     // Gray 900 (Títulos e Bordas Fortes)
    secondary: '#4b5563',   // Gray 600 (Textos secundários)
    text: '#1f2937',        // Gray 800 (Texto corrido)
    border: '#e5e7eb',      // Gray 200 (Divisórias internas)
    headerBg: '#f3f4f6',    // Gray 100
    rowAlt: '#f9fafb',      // Gray 50
  },
  fontSizes: {
    xs: 8,
    sm: 9,
    base: 10,
    lg: 12,
    xl: 14,
    xxl: 16,
  },
};

// --- ESTILOS GLOBAIS (Exportados para reuso) ---
export const styles = StyleSheet.create({
  page: {
    padding: 30, // Margem padrão A4
    paddingTop: 40,
    fontSize: theme.fontSizes.base,
    fontFamily: 'Helvetica', // Fonte Nativa (Zero erros de carregamento)
    color: theme.colors.text,
    backgroundColor: '#ffffff',
    paddingBottom: 60, // Espaço para o rodapé
  },

  // --- CABEÇALHO ---
  headerContainer: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
    paddingBottom: 10,
  },
  headerTopLine: {
    fontSize: theme.fontSizes.xs,
    textAlign: 'center',
    color: theme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  headerUnit: {
    fontSize: theme.fontSizes.sm,
    textAlign: 'center',
    color: theme.colors.primary,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: theme.fontSizes.xxl,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    marginTop: 5,
  },
  subTitle: {
    fontSize: theme.fontSizes.sm,
    textAlign: 'center',
    marginTop: 4,
    color: theme.colors.secondary,
  },

  // --- SEÇÕES ---
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.lg,
    fontFamily: 'Helvetica-Bold',
    color: theme.colors.primary,
    backgroundColor: theme.colors.headerBg,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    textTransform: 'uppercase',
  },

  // --- TABELAS / GRIDS (Sistema Flexbox) ---
  table: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    minHeight: 18, // Altura mínima para legibilidade
    alignItems: 'center',
  },
  // Célula Padrão
  cell: {
    padding: 5,
    fontSize: theme.fontSizes.base,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    textAlign: 'left',
  },
  // Célula de Cabeçalho
  headerCell: {
    backgroundColor: theme.colors.headerBg,
    fontFamily: 'Helvetica-Bold',
    fontSize: theme.fontSizes.xs,
    textTransform: 'uppercase',
    color: theme.colors.secondary,
  },

  // --- UTILITÁRIOS ---
  bold: { fontFamily: 'Helvetica-Bold' },
  textCenter: { textAlign: 'center' },
  textRight: { textAlign: 'right' },
  
  // KPI Box (Reutilizável)
  kpiContainer: {
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  kpiValue: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: theme.colors.primary,
  },
  kpiLabel: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.secondary,
    textTransform: 'uppercase',
    marginTop: 4,
  },

  // --- RODAPÉ ---
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: theme.colors.secondary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 10,
  },
});

interface LayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  orientation?: 'portrait' | 'landscape';
}

export const ReportLayout = ({ title, subtitle, children, orientation = 'portrait' }: LayoutProps) => (
  <Document title={title} author="Sistema CREAS" creator="SGAC">
    <Page size="A4" orientation={orientation} style={styles.page}>
      
      {/* Cabeçalho Institucional Padrão */}
      <View style={styles.headerContainer} fixed>
        <Text style={styles.headerTopLine}>Governo do Distrito Federal</Text>
        <Text style={styles.headerTopLine}>Secretaria de Estado de Desenvolvimento Social - SEDES</Text>
        <Text style={styles.headerUnit}>CREAS BRAZLÂNDIA</Text>
        
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subTitle}>{subtitle}</Text>}
      </View>

      {/* Conteúdo Dinâmico */}
      {children}

      {/* Rodapé Padrão */}
      <Text 
        style={styles.footer} 
        render={({ pageNumber, totalPages }) => (
          `Documento Oficial • Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} • Página ${pageNumber} de ${totalPages}`
        )} 
        fixed 
      />
    </Page>
  </Document>
);