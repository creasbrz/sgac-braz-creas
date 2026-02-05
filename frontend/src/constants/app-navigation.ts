// frontend/src/constants/app-navigation.ts
import {
  PieChart, LayoutDashboard, Calendar, Users, FolderKanban, Archive,
  UserCog, Projector, AlertTriangle, Briefcase, ShieldAlert,
  type LucideIcon
} from 'lucide-react'
import { ROUTES } from './app-routes'
import type { UserRole } from '@/types/user'

export type NavSection = 'Meu Trabalho' | 'Gestão de Casos' | 'Administração'

export interface NavLink {
  readonly to: string
  readonly icon: LucideIcon
  readonly label: string
  readonly allowedRoles: readonly UserRole[]
  readonly section: NavSection
}

export const NAV_LINKS: readonly NavLink[] = [
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
    // [CORREÇÃO] Restrito apenas para Gestão e Auditoria
    allowedRoles: ['Gerente', 'Auditor'],
    section: 'Gestão de Casos',
  },
  {
    to: ROUTES.CASES,
    icon: FolderKanban,
    label: 'Todos os Casos',
    allowedRoles: ['Gerente', 'Agente_Social', 'Especialista', 'Auditor'],
    section: 'Gestão de Casos',
  },
  {
    to: ROUTES.TEAM_OVERVIEW,
    icon: Users,
    label: 'Gestão da Equipe',
    allowedRoles: ['Gerente', 'Auditor'],
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
    label: 'Casos Desligados',
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
    to: ROUTES.AUDIT, // Este link levará para o Dashboard com a aba Audit ativa (precisa ajustar lógica de rota depois se quiser deep link)
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
] as const

export const navLinks = NAV_LINKS