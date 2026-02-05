// frontend/src/components/reports/templates/GroupAttendanceDoc.tsx
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportLayout, styles as globalStyles } from './ReportLayout';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GroupActivity, GroupAttendance } from '@/types/group';

// --- CONFIGURAÇÃO ---
const COLORS = {
  present: '#15803d', // Green 700
  absent: '#b91c1c',  // Red 700
  text: '#1f2937',    // Gray 800
  lightText: '#6b7280' // Gray 500
};

const localStyles = StyleSheet.create({
  activityHeaderBox: {
    backgroundColor: '#f9fafb',
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 20,
  },
  headerLabel: {
    fontSize: 8,
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 2,
    fontWeight: 'bold',
  },
  headerValue: {
    fontSize: 10,
    color: '#111827',
    fontWeight: 'bold',
  },
  signatureBox: {
    marginTop: 50,
    alignItems: 'center',
    alignSelf: 'center',
    width: '60%'
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    width: '100%',
    marginBottom: 5,
  }
});

// --- HELPERS ---
const formatDate = (date: string | Date) => {
  return format(new Date(date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
};

interface GroupDocProps {
  group: GroupActivity;
  participants: GroupAttendance[];
  type: 'blank' | 'filled'; // 'blank' = Imprimir para assinar | 'filled' = Relatório pós-grupo
}

export const GroupAttendanceDoc = ({ group, participants, type }: GroupDocProps) => {
  
  // Definição das colunas baseada no tipo de relatório
  const isBlank = type === 'blank';
  
  // Larguras das colunas
  const COL_WIDTHS = isBlank 
    ? { idx: '8%', name: '52%', sign: '40%' } 
    : { idx: '8%', name: '42%', status: '15%', obs: '35%' };

  const title = isBlank ? "LISTA DE FREQUÊNCIA" : "RELATÓRIO DE EXECUÇÃO";
  const subtitle = `Atividade: ${group.tema}`;

  return (
    <ReportLayout title={title} subtitle={subtitle}>
      
      {/* 1. CABEÇALHO DA ATIVIDADE (Card Destacado) */}
      <View style={localStyles.activityHeaderBox}>
        <View style={[globalStyles.row, { marginBottom: 8 }]}>
          <View style={{ width: '70%' }}>
            <Text style={localStyles.headerLabel}>TEMA / ATIVIDADE</Text>
            <Text style={localStyles.headerValue}>{group.tema.toUpperCase()}</Text>
          </View>
          <View style={{ width: '30%' }}>
             <Text style={localStyles.headerLabel}>TIPO DE GRUPO</Text>
             <Text style={localStyles.headerValue}>{group.tipo}</Text>
          </View>
        </View>

        <View style={globalStyles.row}>
          <View style={{ width: '70%' }}>
            <Text style={localStyles.headerLabel}>LOCAL DE REALIZAÇÃO</Text>
            <Text style={localStyles.headerValue}>{group.local || "CREAS - Sala de Grupos"}</Text>
          </View>
          <View style={{ width: '30%' }}>
             <Text style={localStyles.headerLabel}>DATA E HORÁRIO</Text>
             <Text style={localStyles.headerValue}>{formatDate(group.dataRealizacao)}</Text>
          </View>
        </View>
      </View>

      {/* 2. LISTA DE PARTICIPANTES */}
      <View style={globalStyles.section} wrap={false}>
        <Text style={globalStyles.sectionTitle}>
          {isBlank ? 'Registro de Presença' : 'Participantes e Status'}
        </Text>

        <View style={globalStyles.table}>
          {/* Header da Tabela */}
          <View style={[globalStyles.row, globalStyles.headerCell]}>
            <Text style={[globalStyles.cell, { width: COL_WIDTHS.idx, textAlign: 'center', fontWeight: 'bold' }]}>#</Text>
            <Text style={[globalStyles.cell, { width: COL_WIDTHS.name, fontWeight: 'bold' }]}>NOME DO PARTICIPANTE</Text>
            
            {isBlank ? (
              <Text style={[globalStyles.cell, { width: COL_WIDTHS.sign, fontWeight: 'bold' }]}>ASSINATURA</Text>
            ) : (
              <>
                <Text style={[globalStyles.cell, { width: COL_WIDTHS.status, textAlign: 'center', fontWeight: 'bold' }]}>STATUS</Text>
                <Text style={[globalStyles.cell, { width: COL_WIDTHS.obs, fontWeight: 'bold' }]}>OBSERVAÇÕES</Text>
              </>
            )}
          </View>

          {/* Linhas de Dados */}
          {participants.map((p, i) => (
            <View key={i} style={[globalStyles.row, i % 2 !== 0 ? { backgroundColor: '#f9fafb' } : {}]}>
              <Text style={[globalStyles.cell, { width: COL_WIDTHS.idx, textAlign: 'center', color: COLORS.lightText }]}>{i + 1}</Text>
              
              {/* Nome (com fallback seguro) */}
              <Text style={[globalStyles.cell, { width: COL_WIDTHS.name }]}>
                 {/* Suporta tanto estrutura populada (objeto) quanto string direta se houver legado */}
                 {typeof p.nomeParticipante === 'string' ? p.nomeParticipante : (p as any).caso?.nomeCompleto || 'Participante'}
              </Text>

              {isBlank ? (
                // Espaço para assinatura
                <Text style={[globalStyles.cell, { width: COL_WIDTHS.sign }]}></Text> 
              ) : (
                <>
                  {/* Status Colorido */}
                  <Text style={[
                    globalStyles.cell, 
                    { 
                      width: COL_WIDTHS.status, 
                      textAlign: 'center', 
                      fontWeight: 'bold',
                      color: p.presente ? COLORS.present : COLORS.absent,
                      fontSize: 8
                    }
                  ]}>
                    {p.presente ? 'PRESENTE' : 'AUSENTE'}
                  </Text>
                  
                  {/* Observações */}
                  <Text style={[globalStyles.cell, { width: COL_WIDTHS.obs, fontSize: 8, color: COLORS.text }]}>
                    {p.observacoes || '-'}
                  </Text>
                </>
              )}
            </View>
          ))}

          {/* Linhas Extras (Apenas para Impressão em Branco) */}
          {isBlank && Array.from({ length: 5 }).map((_, i) => (
            <View key={`empty-${i}`} style={globalStyles.row}>
              <Text style={[globalStyles.cell, { width: COL_WIDTHS.idx, textAlign: 'center', color: '#e5e7eb' }]}>
                {participants.length + i + 1}
              </Text>
              <Text style={[globalStyles.cell, { width: COL_WIDTHS.name }]}></Text>
              <Text style={[globalStyles.cell, { width: COL_WIDTHS.sign }]}></Text>
            </View>
          ))}
        </View>
      </View>

      {/* 3. ASSINATURA DO TÉCNICO (Apenas Lista em Branco) */}
      {isBlank && (
        <View style={localStyles.signatureBox} wrap={false}>
          <View style={localStyles.signatureLine} />
          <Text style={{ fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>
            {group.facilitador?.nome || 'FACILITADOR RESPONSÁVEL'}
          </Text>
          <Text style={{ fontSize: 8, color: '#6b7280' }}>
            Técnico(a) de Referência / Facilitador
          </Text>
        </View>
      )}

      {/* 4. RESUMO (Apenas Relatório Preenchido) */}
      {!isBlank && (
        <View style={{ marginTop: 20, flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
           <View style={{ padding: 8, backgroundColor: '#f0fdf4', borderRadius: 4, borderWidth: 1, borderColor: '#bbf7d0' }}>
              <Text style={{ fontSize: 9, color: '#166534', fontWeight: 'bold' }}>
                 PRESENTES: {participants.filter(p => p.presente).length}
              </Text>
           </View>
           <View style={{ padding: 8, backgroundColor: '#fef2f2', borderRadius: 4, borderWidth: 1, borderColor: '#fecaca' }}>
              <Text style={{ fontSize: 9, color: '#991b1b', fontWeight: 'bold' }}>
                 AUSENTES: {participants.filter(p => !p.presente).length}
              </Text>
           </View>
        </View>
      )}

    </ReportLayout>
  );
};