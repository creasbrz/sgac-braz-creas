// frontend/src/constants/navigation.ts
import {
  PieChart,
  LayoutDashboard,
  Calendar,
  Users,
  FolderKanban,
  Archive,
  UserCog,
  ShieldCheck
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ROUTES } from './routes'
import type { UserRole } from '@/types/user'

interface NavLink {
  to: string
  icon: LucideIcon
  label: string
  allowedRoles: UserRole[]
  section: 'Acompanhamento' | 'Administração'
}

export const navLinks: NavLink[] = [
  {
    to: ROUTES.DASHBOARD,
    icon: LayoutDashboard,
    label: 'Painel',
    allowedRoles: ['Gerente', 'Agente_Social', 'Especialista'],
    section: 'Acompanhamento',
  },
  {
    to: ROUTES.CASES,
    icon: FolderKanban,
    label: 'Meus Casos Ativos',
    allowedRoles: ['Gerente', 'Agente_Social', 'Especialista'],
    section: 'Acompanhamento',
  },
  {
    to: ROUTES.TEAM_OVERVIEW,
    icon: Users,
    label: 'Casos Ativos (Equipe)',
    allowedRoles: ['Gerente'],
    section: 'Acompanhamento',
  },
  {
    to: ROUTES.CLOSED_CASES,
    icon: Archive,
    label: 'Casos Finalizados',
    allowedRoles: ['Gerente', 'Agente_Social', 'Especialista'],
    section: 'Acompanhamento',
  },
  {
    to: ROUTES.AGENDA,
    icon: Calendar,
    label: 'Agenda',
    allowedRoles: ['Gerente', 'Agente_Social', 'Especialista'],
    section: 'Acompanhamento',
  },
  {
    to: ROUTES.USERS,
    icon: UserCog,
    label: 'Utilizadores',
    allowedRoles: ['Gerente'],
    section: 'Administração',
  },
  {
    to: ROUTES.REPORTS,
    icon: PieChart,
    label: 'Relatórios',
    allowedRoles: ['Gerente'],
    section: 'Administração',
  },
  {
    // Usamos a string direta para garantir que funcione mesmo se ROUTES.AUDIT não estiver definido
    to: '/dashboard/audit', 
    icon: ShieldCheck,
    label: 'Auditoria Global',
    allowedRoles: ['Gerente'],
    section: 'Administração',
  },
]