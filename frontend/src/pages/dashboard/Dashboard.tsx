import { ManagerDashboard } from './ManagerDashboard'

// Este componente agora é apenas um wrapper semântico
// A proteção de rotas no App.tsx garante que apenas Gerentes/Auditores cheguem aqui.
export function Dashboard() {
  return <ManagerDashboard />
}