// frontend/src/constants/navigation.ts
import {
  PieChart,
  LayoutDashboard,
  Calendar,
  Users,
  FolderKanban,
  Archive,
  // --- SUGESTÃO 1 APLICADA ---
  UserCog, // Ícone diferente para 'Utilizadores'
} from 'lucide-react'
// --- SUGESTÃO 2 APLICADA ---
import type { LucideIcon } from 'lucide-react' // Tipo genérico para ícones
import { ROUTES } from './routes' //
import type { UserRole } from '@/types/user' //

interface NavLink {
  to: string
  icon: LucideIcon // Usa o tipo genérico
  label: string
  allowedRoles: UserRole[]
  // --- SUGESTÃO 3 APLICADA ---
  section: 'Acompanhamento' | 'Administração' // Adiciona o agrupamento
}

export const navLinks: NavLink[] = [
  {
    to: ROUTES.DASHBOARD, //
    icon: LayoutDashboard,
    label: 'Painel',
    allowedRoles: ['Gerente', 'Agente Social', 'Especialista'], //
    section: 'Acompanhamento',
  },
  {
    to: ROUTES.CASES, //
    icon: FolderKanban,
    label: 'Meus Casos Ativos',
    allowedRoles: ['Gerente', 'Agente Social', 'Especialista'], //
    section: 'Acompanhamento',
  },
  {
    to: ROUTES.TEAM_OVERVIEW, //
    icon: Users,
    label: 'Casos Ativos (Equipe)',
    allowedRoles: ['Gerente'], //
    section: 'Acompanhamento',
  },
  {
    to: ROUTES.CLOSED_CASES, //
    icon: Archive,
    label: 'Casos Finalizados',
    allowedRoles: ['Gerente', 'Agente Social', 'Especialista'], //
    section: 'Acompanhamento',
  },
  {
    to: ROUTES.AGENDA, //
    icon: Calendar,
    label: 'Agenda',
    allowedRoles: ['Gerente', 'Agente Social', 'Especialista'], //
    section: 'Acompanhamento',
  },
  {
    to: ROUTES.USERS, //
    icon: UserCog, // Ícone atualizado
    label: 'Utilizadores',
    allowedRoles: ['Gerente'], //
    section: 'Administração',
  },
  {
    to: ROUTES.REPORTS, //
    icon: PieChart,
    label: 'Relatórios',
    allowedRoles: ['Gerente'], //
    section: 'Administração',
  },
]