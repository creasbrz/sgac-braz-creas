// frontend/src/constants/navigation.ts
import { PieChart, LayoutDashboard, Calendar, Users, FolderKanban } from 'lucide-react'
import { ROUTES } from './routes'

// A lista de links de navegação foi movida para o seu próprio ficheiro para
// uma melhor organização e para resolver o aviso do "Fast Refresh" do Vite.
export const navLinks = [
  {
    to: ROUTES.DASHBOARD,
    icon: LayoutDashboard,
    label: 'Painel',
    allowedRoles: ['Gerente'],
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
