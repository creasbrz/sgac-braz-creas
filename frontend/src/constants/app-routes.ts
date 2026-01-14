// frontend/src/constants/app-routes.ts
export const ROUTE_PATHS = {
  LOGIN: '/login',
  ROOT: '/',
  
  // Container Principal (Authenticated Layout)
  APP: '/app',

  // As duas telas principais
  WORKSPACE: 'workspace', // /app/workspace (Mesa de Trabalho)
  DASHBOARD: 'dashboard', // /app/dashboard (Indicadores/Estratégico)
  
  // Rotas Operacionais
  CASES: 'cases',
  CASE_DETAIL: 'cases/:id',
  WAITING_LIST: 'cases/waiting',
  CLOSED_CASES: 'cases/closed',
  GROUPS: 'groups',
  AGENDA: 'agenda',

  // Rotas de Gestão
  TEAM: 'team',
  REPORTS: 'reports',
  USERS: 'users',
  AUDIT: 'audit',
  
  NOT_FOUND: '*',
} as const

export const ROUTES = {
  LOGIN: ROUTE_PATHS.LOGIN,
  ROOT: ROUTE_PATHS.ROOT,
  
  // URLs Absolutas
  APP: ROUTE_PATHS.APP,
  WORKSPACE: `${ROUTE_PATHS.APP}/${ROUTE_PATHS.WORKSPACE}`,
  DASHBOARD: `${ROUTE_PATHS.APP}/${ROUTE_PATHS.DASHBOARD}`,
  
  CASES: `${ROUTE_PATHS.APP}/${ROUTE_PATHS.CASES}`,
  WAITING_LIST: `${ROUTE_PATHS.APP}/${ROUTE_PATHS.WAITING_LIST}`,
  CLOSED_CASES: `${ROUTE_PATHS.APP}/${ROUTE_PATHS.CLOSED_CASES}`,
  GROUPS: `${ROUTE_PATHS.APP}/${ROUTE_PATHS.GROUPS}`,
  AGENDA: `${ROUTE_PATHS.APP}/${ROUTE_PATHS.AGENDA}`,
  
  TEAM_OVERVIEW: `${ROUTE_PATHS.APP}/${ROUTE_PATHS.TEAM}`,
  REPORTS: `${ROUTE_PATHS.APP}/${ROUTE_PATHS.REPORTS}`,
  USERS: `${ROUTE_PATHS.APP}/${ROUTE_PATHS.USERS}`,
  AUDIT: `${ROUTE_PATHS.APP}/${ROUTE_PATHS.AUDIT}`,
  
  CASE_DETAIL: (id: string) => `${ROUTE_PATHS.APP}/cases/${id}`,
} as const