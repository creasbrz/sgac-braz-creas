import {
  PieChart, LayoutDashboard, Calendar, Users, FolderKanban, Archive,
  UserCog, Projector, AlertTriangle, Briefcase, ShieldAlert
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ROUTES } from './routes'
import type { UserRole } from '@/types/user'

interface NavLink {
  to: string
  icon: LucideIcon
  label: string
  allowedRoles: UserRole[]
  section: 'Meu Trabalho' | 'Gestão de Casos' | 'Administração'
}

export const navLinks: NavLink[] = [
  // --- SEÇÃO: MEU TRABALHO ---
  {
    to: ROUTES.WORKSPACE,
    icon: Briefcase,
    label: 'Minha Mesa',
    allowedRoles: ['Gerente', 'Agente_Social', 'Especialista'],
    section: 'Meu Trabalho',
  },
  {
    to: ROUTES.WAITING_LIST,
    icon: AlertTriangle,
    label: 'Fila de Espera',
    allowedRoles: ['Gerente', 'Agente_Social', 'Especialista', 'Auditor'], 
    section: 'Meu Trabalho',
  },
  {
    to: ROUTES.AGENDA,
    icon: Calendar,
    label: 'Minha Agenda',
    allowedRoles: ['Gerente', 'Agente_Social', 'Especialista'],
    section: 'Meu Trabalho',
  },

  // --- SEÇÃO: GESTÃO DE CASOS ---
  {
    to: ROUTES.DASHBOARD,
    icon: LayoutDashboard,
    label: 'Painel Geral',
    allowedRoles: ['Gerente', 'Agente_Social', 'Especialista', 'Auditor'],
    section: 'Gestão de Casos',
  },
  {
    to: ROUTES.CASES,
    icon: FolderKanban,
    label: 'Todos os Casos',
    allowedRoles: ['Gerente', 'Agente_Social', 'Especialista', 'Auditor'],
    section: 'Gestão de Casos',
  },
  // [MOVIDO] Trazido de volta para cá para facilitar acesso
  {
    to: ROUTES.TEAM_OVERVIEW,
    icon: Users,
    label: 'Gestão da Equipe',
    allowedRoles: ['Gerente', 'Auditor'], // Apenas Gerente/Auditor veem
    section: 'Gestão de Casos',
  },
  {
    to: ROUTES.GROUPS,
    icon: Projector,
    label: 'Grupos e Oficinas',
    allowedRoles: ['Gerente', 'Especialista', 'Agente_Social', 'Auditor'],
    section: 'Gestão de Casos',
  },
  {
    to: ROUTES.CLOSED_CASES,
    icon: Archive,
    label: 'Arquivo Morto',
    allowedRoles: ['Gerente', 'Agente_Social', 'Especialista', 'Auditor'],
    section: 'Gestão de Casos',
  },

  // --- SEÇÃO: ADMINISTRAÇÃO ---
  {
    to: ROUTES.REPORTS,
    icon: PieChart,
    label: 'Relatórios & RMA',
    allowedRoles: ['Gerente', 'Agente_Social', 'Especialista', 'Auditor'],
    section: 'Administração',
  },
  {
    to: ROUTES.AUDIT,
    icon: ShieldAlert,
    label: 'Auditoria de Logs',
    allowedRoles: ['Gerente', 'Auditor'],
    section: 'Administração',
  },
  {
    to: ROUTES.USERS,
    icon: UserCog,
    label: 'Gestão de Usuários',
    allowedRoles: ['Gerente'],
    section: 'Administração',
  },
]