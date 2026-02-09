// frontend/src/types/group.ts
import { z } from 'zod';

/**
 * Categorias de atividades coletivas suportadas pelo sistema.
 */
export const GROUP_TYPES = {
  ACOLHIDA_COLETIVA: 'Acolhida Coletiva',
  OFICINA: 'Oficina com Famílias',
  GRUPO_PAEFI: 'Grupo PAEFI',
  REUNIAO_REDE: 'Reunião de Rede',
  PALESTRA: 'Palestra / Ação Comunitária'
} as const;

export type GroupActivityType = keyof typeof GROUP_TYPES;

/**
 * Representa o registro de presença de um assistido (Vincula Caso <-> Grupo).
 */
export interface GroupAttendance {
  id: string;
  grupoId: string;
  casoId: string;
  presente: boolean;
  observacoes?: string;
  caso: {
    id: string;
    nomeCompleto: string;
    pasta?: string; 
  };
}

/**
 * Entidade principal de Atividade Coletiva / Grupo.
 */
export interface GroupActivity {
  id: string;
  tema: string;
  tipo: GroupActivityType;
  dataRealizacao: string;
  local: string; 
  descricao?: string;
  orgaosEnvolvidos: string[];
  facilitador: { 
    id: string; 
    nome: string; 
  };
  _count?: { 
    participantes: number; 
  };
  attendanceConfirmed?: boolean;
  participantes?: GroupAttendance[];
}

// --- ZOD SCHEMAS ---

const GROUP_TYPE_KEYS = Object.keys(GROUP_TYPES) as [string, ...string[]];

export const createGroupSchema = z.object({
  tema: z.string().min(3, "O tema deve ter pelo menos 3 caracteres"),
  
  // [CORREÇÃO FINAL] Usando a propriedade 'message' diretamente, 
  // conforme solicitado pela mensagem de erro do TypeScript.
  tipo: z.enum(GROUP_TYPE_KEYS, {
    message: "Selecione um tipo válido"
  }),
  
  dataRealizacao: z.string().datetime({ message: "Data inválida" }), 
  local: z.string().min(3, "Local é obrigatório"),
  descricao: z.string().optional(),
  facilitadorId: z.string().uuid("Selecione um técnico responsável"),
  orgaosEnvolvidos: z.array(z.string()).optional()
});

export const updateAttendanceSchema = z.object({
  attendanceId: z.string().uuid(),
  presente: z.boolean(),
  observacoes: z.string().max(500).optional()
});

export type CreateGroupFormValues = z.infer<typeof createGroupSchema>;
export type UpdateAttendanceFormValues = z.infer<typeof updateAttendanceSchema>;