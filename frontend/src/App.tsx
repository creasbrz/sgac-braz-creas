import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { queryClient } from "./lib/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import { ModalProvider } from "./contexts/ModalContext";
import { SidebarProvider } from "./contexts/SidebarContext";
import { ThemeProvider } from "./components/common/theme-provider";

import ErrorBoundary from "./components/ui/error-boundary";

import { ROUTE_PATHS } from "./constants/routes";
import { ProtectedRoute } from "./ProtectedRoute";
import { MainLayout } from "./components/layout/MainLayout";
import { Login } from "./pages/Login";

// Orquestradores
import { Dashboard } from "./pages/dashboard/Dashboard"; // Estratégico
import { Workspace } from "./pages/workspace/Workspace"; // Operacional

import { Cases } from "./pages/Cases";
import { ClosedCases } from "./pages/ClosedCases";
import { CaseDetail } from "./pages/CaseDetail";
import { Agenda } from "./pages/Agenda";
import { Reports } from "./pages/reports/Reports";
import { UserManagement } from "./pages/UserManagement";
import { TeamOverview } from "./pages/TeamOverview";
import { GlobalAudit } from "./pages/GlobalAudit";
import { NotFound } from "./pages/NotFound";
import { GroupManagement } from "./pages/GroupManagement";
import { WaitingList } from "./pages/WaitingList";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <ErrorBoundary>
          <BrowserRouter>
            <AuthProvider>
              <ModalProvider>
                <SidebarProvider>
                  <Routes>
                    <Route path={ROUTE_PATHS.LOGIN} element={<Login />} />

                    {/* REDIRECIONAMENTOS DE RAIZ */}
                    {/* Acessar '/' vai para '/app/workspace' */}
                    <Route path="/" element={<Navigate to={ROUTE_PATHS.WORKSPACE} replace />} />

                    {/* Layout Principal em '/app' */}
                    <Route path={ROUTE_PATHS.APP} element={<MainLayout />}>
                      
                      {/* '/app' também vai para '/app/workspace' */}
                      <Route index element={<Navigate to={ROUTE_PATHS.WORKSPACE} replace />} />

                      {/* 1. WORKSPACE (Mesa Operacional - Home Real) */}
                      <Route 
                        path={ROUTE_PATHS.WORKSPACE} 
                        element={
                          <ProtectedRoute allowedRoles={["Gerente", "Especialista", "Agente_Social"]}>
                            <Workspace />
                          </ProtectedRoute>
                        } 
                      />

                      {/* 2. DASHBOARD (Visão Estratégica) */}
                      <Route 
                        path={ROUTE_PATHS.DASHBOARD} 
                        element={
                          <ProtectedRoute allowedRoles={["Gerente", "Especialista", "Agente_Social", "Auditor"]}>
                            <Dashboard />
                          </ProtectedRoute>
                        } 
                      />

                      {/* --- ROTAS OPERACIONAIS --- */}
                      <Route element={<ProtectedRoute allowedRoles={["Gerente", "Especialista", "Agente_Social", "Auditor"]} />}>
                        <Route path={ROUTE_PATHS.CASES} element={<Cases />} />
                        <Route path={ROUTE_PATHS.CASE_DETAIL} element={<CaseDetail />} />
                        <Route path={ROUTE_PATHS.WAITING_LIST} element={<WaitingList />} />
                        <Route path={ROUTE_PATHS.CLOSED_CASES} element={<ClosedCases />} />
                        <Route path={ROUTE_PATHS.AGENDA} element={<Agenda />} />
                        <Route path={ROUTE_PATHS.GROUPS} element={<GroupManagement />} />
                        <Route path={ROUTE_PATHS.REPORTS} element={<Reports />} />
                      </Route>

                      {/* --- ROTAS DE GESTÃO E AUDITORIA --- */}
                      <Route element={<ProtectedRoute allowedRoles={["Gerente", "Auditor"]} />}>
                        <Route path={ROUTE_PATHS.TEAM} element={<TeamOverview />} />
                        <Route path="audit" element={<GlobalAudit />} />
                        {/* Se Analytics for acessado diretamente via URL antiga */}
                        <Route path="analytics" element={<Navigate to={ROUTE_PATHS.DASHBOARD} replace />} />
                      </Route>

                      {/* --- ROTAS ADMINISTRATIVAS --- */}
                      <Route element={<ProtectedRoute allowedRoles={["Gerente"]} />}>
                        <Route path={ROUTE_PATHS.USERS} element={<UserManagement />} />
                      </Route>

                    </Route>

                    <Route path={ROUTE_PATHS.NOT_FOUND} element={<NotFound />} />
                    <Route path="*" element={<Navigate to={ROUTE_PATHS.WORKSPACE} replace />} />
                  </Routes>
                </SidebarProvider>
              </ModalProvider>
            </AuthProvider>
          </BrowserRouter>
        </ErrorBoundary>

        <Toaster richColors />
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}