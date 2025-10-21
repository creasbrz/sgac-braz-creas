// frontend/src/constants/navigation.ts
import { PieChart, LayoutDashboard, Calendar, Users, FolderKanban, Archive } from 'lucide-react'
import { ROUTES } from './routes'

export const navLinks = [
  {
    to: ROUTES.DASHBOARD,
    icon: LayoutDashboard,
    label: 'Painel',
    allowedRoles: ['Gerente', 'Agente Social', 'Especialista'],
  },
  {
    to: ROUTES.CASES,
    icon: FolderKanban,
    label: 'Meus Casos Ativos',
    allowedRoles: ['Gerente', 'Agente Social', 'Especialista'],
  },
  {
    to: ROUTES.TEAM_OVERVIEW,
    icon: Users,
    label: 'Casos Ativos (Equipe)',
    allowedRoles: ['Gerente'],
  },
  {
    to: ROUTES.CLOSED_CASES,
    icon: Archive,
    label: 'Casos Finalizados',
    allowedRoles: ['Gerente', 'Agente Social', 'Especialista'],
  },
  {
    to: ROUTES.AGENDA,
    icon: Calendar,
    label: 'Agenda',
    allowedRoles: ['Gerente', 'Agente Social', 'Especialista'],
  },
  {
    to: ROUTES.USER_MANAGEMENT,
    icon: Users,
    label: 'Utilizadores',
    allowedRoles: ['Gerente'],
  },
  {
    to: ROUTES.REPORTS,
    icon: PieChart,
    label: 'Relatórios',
    allowedRoles: ['Gerente'],
  },
]

