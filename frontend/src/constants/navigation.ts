// frontend/src/constants/navigation.ts
import { PieChart, LayoutDashboard, Calendar, Users, FolderKanban } from 'lucide-react'
import { ROUTES } from './routes'

// A lista de links de navegação
export const navLinks = [
  {
    to: ROUTES.DASHBOARD,
    icon: LayoutDashboard,
    label: 'Painel',
    // Correção: Todos os utilizadores autenticados podem ver o painel
    allowedRoles: ['Gerente', 'Agente Social', 'Especialista'],
  },
  {
    to: ROUTES.CASES,
    icon: FolderKanban,
    label: 'Casos',
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