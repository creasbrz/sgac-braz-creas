// frontend/src/components/reports/templates/GroupAttendanceDoc.tsx
import { Text, View } from '@react-pdf/renderer';
import { ReportLayout, styles } from './ReportLayout';
import { format } from 'date-fns';
import { GroupActivity, GroupAttendance } from '@/types/group';

interface GroupDocProps {
  group: GroupActivity;
  participants: GroupAttendance[];
  type: 'blank' | 'filled'; // 'blank' para imprimir e assinar, 'filled' para relatório do sistema
}

export const GroupAttendanceDoc = ({ group, participants, type }: GroupDocProps) => (
  <ReportLayout title={type === 'blank' ? "LISTA DE FREQUÊNCIA" : "RELATÓRIO DE EXECUÇÃO DE GRUPO"}>
    
    {/* Cabeçalho da Atividade */}
    <View style={[styles.table, { marginBottom: 15 }]}>
      <View style={styles.row}>
        <Text style={[styles.cell, styles.headerCell, { width: '20%' }]}>ATIVIDADE:</Text>
        <Text style={[styles.cell, { width: '80%' }]}>{group.tema.toUpperCase()}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.cell, styles.headerCell, { width: '20%' }]}>TIPO:</Text>
        <Text style={[styles.cell, { width: '30%' }]}>{group.tipo}</Text>
        <Text style={[styles.cell, styles.headerCell, { width: '20%' }]}>DATA:</Text>
        <Text style={[styles.cell, { width: '30%' }]}>{format(new Date(group.dataRealizacao), "dd/MM/yyyy HH:mm")}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.cell, styles.headerCell, { width: '20%' }]}>LOCAL:</Text>
        <Text style={[styles.cell, { width: '80%' }]}>{group.local || "CREAS"}</Text>
      </View>
    </View>

    {/* Tabela de Participantes */}
    <View style={styles.table}>
      {/* Header da Tabela */}
      <View style={styles.row}>
        <Text style={[styles.cell, styles.headerCell, { width: '5%', textAlign: 'center' }]}>#</Text>
        <Text style={[styles.cell, styles.headerCell, { width: '45%' }]}>NOME DO PARTICIPANTE</Text>
        {type === 'blank' ? (
          <Text style={[styles.cell, styles.headerCell, { width: '50%' }]}>ASSINATURA</Text>
        ) : (
          <>
            <Text style={[styles.cell, styles.headerCell, { width: '15%', textAlign: 'center' }]}>STATUS</Text>
            <Text style={[styles.cell, styles.headerCell, { width: '35%' }]}>OBSERVAÇÕES</Text>
          </>
        )}
      </View>

      {/* Linhas */}
      {participants.map((p, i) => (
        <View key={i} style={styles.row}>
          <Text style={[styles.cell, { width: '5%', textAlign: 'center' }]}>{i + 1}</Text>
          <Text style={[styles.cell, { width: '45%' }]}>{p.caso?.nomeCompleto || 'Nome não disponível'}</Text>
          
          {type === 'blank' ? (
            <Text style={[styles.cell, { width: '50%' }]}></Text> // Espaço para assinar
          ) : (
            <>
              <Text style={[styles.cell, { width: '15%', textAlign: 'center', color: p.presente ? '#166534' : '#991b1b', fontWeight: 'bold' }]}>
                {p.presente ? 'PRESENTE' : 'AUSENTE'}
              </Text>
              <Text style={[styles.cell, { width: '35%', fontSize: 8 }]}>{p.observacoes || '-'}</Text>
            </>
          )}
        </View>
      ))}

      {/* Linhas em branco extras para Lista de Frequência impressa */}
      {type === 'blank' && Array.from({ length: 5 }).map((_, i) => (
        <View key={`empty-${i}`} style={styles.row}>
          <Text style={[styles.cell, { width: '5%', textAlign: 'center', color: '#ccc' }]}>{participants.length + i + 1}</Text>
          <Text style={[styles.cell, { width: '45%' }]}></Text>
          <Text style={[styles.cell, { width: '50%' }]}></Text>
        </View>
      ))}
    </View>

    {/* Assinatura do Técnico (apenas se for lista para impressão) */}
    {type === 'blank' && (
      <View style={{ marginTop: 40, alignItems: 'center' }}>
        <View style={{ borderBottomWidth: 1, width: '60%', marginBottom: 5 }} />
        <Text style={{ fontSize: 10, fontWeight: 'bold' }}>{group.facilitador?.nome}</Text>
        <Text style={{ fontSize: 8, color: '#666' }}>Técnico(a) Responsável</Text>
      </View>
    )}
  </ReportLayout>
);