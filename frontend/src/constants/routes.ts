// frontend/src/constants/routes.ts

/**
 * Define os caminhos exatos (paths) que o React Router usa no App.tsx.
 * Nomes de rotas-pai são absolutos (começam com '/')
 * Nomes de rotas-filhas são relativos (NÃO começam com '/')
 */
export const ROUTE_PATHS = { //
  LOGIN: '/', //
  DASHBOARD: '/dashboard', // Rota "Pai" que usa o MainLayout
  CASES: 'cases', // Rota "Filha" de /dashboard
  CLOSED_CASES: 'cases/closed', // Rota "Filha" de /dashboard
  CASE_DETAIL: 'cases/:id', // Rota "Filha" de /dashboard
  AGENDA: 'agenda', // Rota "Filha" de /dashboard
  TEAM: 'team-overview', // Rota "Filha" de /dashboard
  REPORTS: 'reports', // Rota "Filha" de /dashboard
  USERS: 'users', // Rota "Filha" de /dashboard
  NOT_FOUND: '*', //
} as const

/**
 * Define as rotas absolutas (completas) para serem usadas em componentes
 * como <Link to={...}> ou navigate(...).
 */
export const ROUTES = { //
  LOGIN: ROUTE_PATHS.LOGIN, //
  DASHBOARD: ROUTE_PATHS.DASHBOARD, //
  CASES: `${ROUTE_PATHS.DASHBOARD}/${ROUTE_PATHS.CASES}`, // ex: /dashboard/cases
  CLOSED_CASES: `${ROUTE_PATHS.DASHBOARD}/${ROUTE_PATHS.CLOSED_CASES}`, // ex: /dashboard/cases/closed
  AGENDA: `${ROUTE_PATHS.DASHBOARD}/${ROUTE_PATHS.AGENDA}`, // ex: /dashboard/agenda
  TEAM_OVERVIEW: `${ROUTE_PATHS.DASHBOARD}/${ROUTE_PATHS.TEAM}`, // ex: /dashboard/team-overview
  REPORTS: `${ROUTE_PATHS.DASHBOARD}/${ROUTE_PATHS.REPORTS}`, // ex: /dashboard/reports
  USERS: `${ROUTE_PATHS.DASHBOARD}/${ROUTE_PATHS.USERS}`, // ex: /dashboard/users
  NOT_FOUND: ROUTE_PATHS.NOT_FOUND, //

  // Função para o único link dinâmico que temos
  CASE_DETAIL: (id: string) => `${ROUTE_PATHS.DASHBOARD}/cases/${id}`, // ex: /dashboard/cases/123-abc
} as const