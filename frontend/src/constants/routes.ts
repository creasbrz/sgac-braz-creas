// frontend/src/constants/routes.ts

export const ROUTES = {
  LOGIN: '/',
  DASHBOARD: '/dashboard',
  CASES: '/cases',
  REPORTS: '/reports',
  AGENDA: '/agenda',
  USER_MANAGEMENT: '/users',
  CASE_DETAIL: '/cases/:id',
} as const

// Tipos inferidos automaticamente a partir do objeto ROUTES
export type RouteKey = keyof typeof ROUTES
export type RoutePath = (typeof ROUTES)[RouteKey]

/**
 * Constrói uma rota dinâmica substituindo os parâmetros.
 * Exemplo: buildRoute(ROUTES.CASE_DETAIL, { id: '123' }) -> '/cases/123'
 * @param route O caminho da rota a partir do objeto ROUTES.
 * @param params Um objeto com os parâmetros a serem substituídos.
 * @returns A rota final com os parâmetros preenchidos.
 */
export const buildRoute = (
  route: RoutePath,
  params?: Record<string, string | number>,
) => {
  let path = String(route)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      path = path.replace(`:${key}`, String(value))
    })
  }
  return path
}

