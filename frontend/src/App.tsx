// frontend/src/App.tsx
import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react"; // Ícone de carregamento

// Configurações e Contextos (Mantidos Eager/Imediatos)
import { queryClient } from "./lib/react-query";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ModalProvider } from "./contexts/ModalContext";
import { SidebarProvider } from "./contexts/SidebarContext";
import { PrivacyProvider } from "./contexts/PrivacyContext";
import { ThemeProvider } from "./components/common/theme-provider"; 
import ErrorBoundary from "./components/ui/error-boundary";
import { SessionExpiryDialog } from "./components/common/SessionExpiryDialog"; 
import { ROUTE_PATHS, ROUTES } from "./constants/app-routes"; 
import { ProtectedRoute } from "./ProtectedRoute";

// Layouts e Páginas Leves (Carregamento Imediato)
import { MainLayout } from "./components/layout/MainLayout";
import { Login } from "./pages/Login";
import { NotFound } from "./pages/NotFound";

// --- LAZY IMPORTS (CORREÇÃO DE CRASH / PERFORMANCE) ---
// Usamos .then(module => ({ default: module.NomeComponente })) para suportar exportações nomeadas
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard").then(m => ({ default: m.Dashboard })));
const Workspace = lazy(() => import("./pages/workspace/Workspace").then(m => ({ default: m.Workspace })));
const Cases = lazy(() => import("./pages/Cases").then(m => ({ default: m.Cases })));
const ClosedCases = lazy(() => import("./pages/ClosedCases").then(m => ({ default: m.ClosedCases })));
const CaseDetail = lazy(() => import("./pages/CaseDetail").then(m => ({ default: m.CaseDetail })));
const Agenda = lazy(() => import("./pages/Agenda").then(m => ({ default: m.Agenda })));
const Reports = lazy(() => import("./pages/reports/Reports").then(m => ({ default: m.Reports })));
const UserManagement = lazy(() => import("./pages/UserManagement").then(m => ({ default: m.UserManagement })));
const TeamOverview = lazy(() => import("./pages/TeamOverview").then(m => ({ default: m.TeamOverview })));
const GlobalAudit = lazy(() => import("./pages/GlobalAudit").then(m => ({ default: m.GlobalAudit })));
const AdvancedAnalytics = lazy(() => import("./pages/AdvancedAnalytics").then(m => ({ default: m.AdvancedAnalytics })));
const GroupManagement = lazy(() => import("./pages/GroupManagement").then(m => ({ default: m.GroupManagement })));
const WaitingList = lazy(() => import("./pages/WaitingList").then(m => ({ default: m.WaitingList })));

// --- COMPONENTE DE LOADING ---
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Carregando...</p>
    </div>
  </div>
)

// --- ROTA PÚBLICA ---
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isSessionLoading } = useAuth()

  if (isSessionLoading) return <PageLoader />
  if (isAuthenticated) {
    return <Navigate to={ROUTES.WORKSPACE} replace />
  }
  return <>{children}</>
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider 
        attribute="class" 
        defaultTheme="system" 
        enableSystem
        disableTransitionOnChange
        storageKey="vite-ui-theme"
      >
        <ErrorBoundary>
          <BrowserRouter>
            <AuthProvider>
              <PrivacyProvider>
                <ModalProvider>
                  <SidebarProvider>
                    {/* Monitor global de sessão */}
                    <SessionExpiryDialog />
                    
                    {/* Suspense envolve as rotas para permitir o carregamento assíncrono */}
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<Navigate to={ROUTE_PATHS.LOGIN} replace />} />

                        <Route 
                          path={ROUTE_PATHS.LOGIN} 
                          element={
                            <PublicOnlyRoute>
                              <Login />
                            </PublicOnlyRoute>
                          } 
                        />

                        <Route path={ROUTE_PATHS.APP} element={<MainLayout />}>
                          <Route index element={<Navigate to={ROUTES.WORKSPACE} replace />} />

                          <Route 
                            path={ROUTE_PATHS.WORKSPACE} 
                            element={
                              <ProtectedRoute allowedRoles={["Gerente", "Especialista", "Agente_Social"]}>
                                <Workspace />
                              </ProtectedRoute>
                            } 
                          />

                          <Route 
                            path={ROUTE_PATHS.DASHBOARD} 
                            element={
                              <ProtectedRoute allowedRoles={["Gerente", "Especialista", "Agente_Social", "Auditor"]}>
                                <Dashboard />
                              </ProtectedRoute>
                            } 
                          />

                          {/* Rotas Gerais Protegidas */}
                          <Route element={<ProtectedRoute allowedRoles={["Gerente", "Especialista", "Agente_Social", "Auditor"]} />}>
                            <Route path={ROUTE_PATHS.CASES} element={<Cases />} />
                            <Route path={ROUTE_PATHS.CASE_DETAIL} element={<CaseDetail />} />
                            <Route path={ROUTE_PATHS.WAITING_LIST} element={<WaitingList />} />
                            <Route path={ROUTE_PATHS.CLOSED_CASES} element={<ClosedCases />} />
                            <Route path={ROUTE_PATHS.AGENDA} element={<Agenda />} />
                            <Route path={ROUTE_PATHS.GROUPS} element={<GroupManagement />} />
                            <Route path={ROUTE_PATHS.REPORTS} element={<Reports />} />
                          </Route>

                          {/* Rotas de Gerente/Auditor */}
                          <Route element={<ProtectedRoute allowedRoles={["Gerente", "Auditor"]} />}>
                            <Route path={ROUTE_PATHS.TEAM} element={<TeamOverview />} />
                            <Route path="audit" element={<GlobalAudit />} />
                            <Route path="analytics" element={<AdvancedAnalytics />} />
                          </Route>

                          {/* Rotas Apenas Gerente */}
                          <Route element={<ProtectedRoute allowedRoles={["Gerente"]} />}>
                            <Route path={ROUTE_PATHS.USERS} element={<UserManagement />} />
                          </Route>

                        </Route>

                        <Route path={ROUTE_PATHS.NOT_FOUND} element={<NotFound />} />
                        <Route path="*" element={<Navigate to={ROUTE_PATHS.LOGIN} replace />} />
                      </Routes>
                    </Suspense>

                  </SidebarProvider>
                </ModalProvider>
              </PrivacyProvider>
            </AuthProvider>
          </BrowserRouter>
        </ErrorBoundary>
        
        <Toaster richColors closeButton />
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}