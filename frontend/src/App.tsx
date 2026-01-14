import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { queryClient } from "./lib/react-query";
import { AuthProvider, useAuthContext } from "./contexts/AuthContext";
import { ModalProvider } from "./contexts/ModalContext";
import { SidebarProvider } from "./contexts/SidebarContext";
import { PrivacyProvider } from "./contexts/PrivacyContext";
import { ThemeProvider } from "./components/common/theme-provider";
import ErrorBoundary from "./components/ui/error-boundary";

// [CORREÇÃO] Importando do novo arquivo app-routes.ts
import { ROUTE_PATHS, ROUTES } from "./constants/app-routes"; 
import { ProtectedRoute } from "./ProtectedRoute";
import { MainLayout } from "./components/layout/MainLayout";
import { Login } from "./pages/Login";

// Orquestradores
import { Dashboard } from "./pages/dashboard/Dashboard";
import { Workspace } from "./pages/workspace/Workspace";

import { Cases } from "./pages/Cases";
import { ClosedCases } from "./pages/ClosedCases";
import { CaseDetail } from "./pages/CaseDetail";
import { Agenda } from "./pages/Agenda";
import { Reports } from "./pages/reports/Reports";
import { UserManagement } from "./pages/UserManagement";
import { TeamOverview } from "./pages/TeamOverview";
import { GlobalAudit } from "./pages/GlobalAudit";
import { NotFound } from "./pages/NotFound";
import { AdvancedAnalytics } from "./pages/AdvancedAnalytics";
import { GroupManagement } from "./pages/GroupManagement";
import { WaitingList } from "./pages/WaitingList";

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isSessionLoading } = useAuthContext()

  if (isSessionLoading) return null
  if (isAuthenticated) {
    return <Navigate to={ROUTES.WORKSPACE} replace />
  }
  return <>{children}</>
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <ErrorBoundary>
          <BrowserRouter>
            <AuthProvider>
              <PrivacyProvider>
                <ModalProvider>
                  <SidebarProvider>
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

                        <Route element={<ProtectedRoute allowedRoles={["Gerente", "Especialista", "Agente_Social", "Auditor"]} />}>
                          <Route path={ROUTE_PATHS.CASES} element={<Cases />} />
                          <Route path={ROUTE_PATHS.CASE_DETAIL} element={<CaseDetail />} />
                          <Route path={ROUTE_PATHS.WAITING_LIST} element={<WaitingList />} />
                          <Route path={ROUTE_PATHS.CLOSED_CASES} element={<ClosedCases />} />
                          <Route path={ROUTE_PATHS.AGENDA} element={<Agenda />} />
                          <Route path={ROUTE_PATHS.GROUPS} element={<GroupManagement />} />
                          <Route path={ROUTE_PATHS.REPORTS} element={<Reports />} />
                        </Route>

                        <Route element={<ProtectedRoute allowedRoles={["Gerente", "Auditor"]} />}>
                          <Route path={ROUTE_PATHS.TEAM} element={<TeamOverview />} />
                          <Route path="audit" element={<GlobalAudit />} />
                          <Route path="analytics" element={<AdvancedAnalytics />} />
                        </Route>

                        <Route element={<ProtectedRoute allowedRoles={["Gerente"]} />}>
                          <Route path={ROUTE_PATHS.USERS} element={<UserManagement />} />
                        </Route>

                      </Route>

                      <Route path={ROUTE_PATHS.NOT_FOUND} element={<NotFound />} />
                      <Route path="*" element={<Navigate to={ROUTE_PATHS.LOGIN} replace />} />
                    </Routes>
                  </SidebarProvider>
                </ModalProvider>
              </PrivacyProvider>
            </AuthProvider>
          </BrowserRouter>
        </ErrorBoundary>
        <Toaster richColors />
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}