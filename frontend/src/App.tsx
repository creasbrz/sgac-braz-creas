import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { queryClient } from "./lib/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import { ModalProvider } from "./contexts/ModalContext";
import { SidebarProvider } from "./contexts/SidebarContext";
import { ThemeProvider } from "./components/theme-provider";

// Importação do Error Boundary (criado no passo anterior)
import ErrorBoundary from "./components/ui/error-boundary";

import { ROUTE_PATHS } from "./constants/routes";
import { ProtectedRoute } from "./ProtectedRoute";
import { MainLayout } from "./components/layout/MainLayout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Cases } from "./pages/Cases";
import { ClosedCases } from "./pages/ClosedCases";
import { CaseDetail } from "./pages/CaseDetail";
import { Agenda } from "./pages/Agenda";
import { Reports } from "./pages/Reports";
import { UserManagement } from "./pages/UserManagement";
import { TeamOverview } from "./pages/TeamOverview";
import { GlobalAudit } from "./pages/GlobalAudit";
import { NotFound } from "./pages/NotFound";
import { AdvancedAnalytics } from "./pages/AdvancedAnalytics";
import { GroupManagement } from "./pages/GroupManagement";
import { WaitingList } from "./pages/WaitingList";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        {/* ErrorBoundary protege a aplicação de telas brancas em caso de falha */}
        <ErrorBoundary>
          <BrowserRouter>
            <AuthProvider>
              <ModalProvider>
                <SidebarProvider>
                  <Routes>
                    <Route path={ROUTE_PATHS.LOGIN} element={<Login />} />

                    <Route path={ROUTE_PATHS.DASHBOARD} element={<MainLayout />}>
                      <Route
                        index
                        element={
                          <ProtectedRoute allowedRoles={["Gerente", "Especialista", "Agente_Social"]}>
                            <Dashboard />
                          </ProtectedRoute>
                        }
                      />

                      <Route element={<ProtectedRoute allowedRoles={["Gerente", "Especialista", "Agente_Social"]} />}>
                        <Route path={ROUTE_PATHS.CASES} element={<Cases />} />
                        <Route path={ROUTE_PATHS.CLOSED_CASES} element={<ClosedCases />} />
                        <Route path={ROUTE_PATHS.AGENDA} element={<Agenda />} />
                        {/* [NOVO] Grupos liberados para todos */}
                        <Route path={ROUTE_PATHS.GROUPS} element={<GroupManagement />} />
                      </Route>

                      <Route element={<ProtectedRoute allowedRoles={["Gerente", "Especialista", "Agente_Social"]} />}>
                        <Route path={ROUTE_PATHS.CASE_DETAIL} element={<CaseDetail />} />
                      </Route>

                      <Route element={<ProtectedRoute allowedRoles={["Gerente"]} />}>
                        <Route path={ROUTE_PATHS.REPORTS} element={<Reports />} />
                        <Route path={ROUTE_PATHS.USERS} element={<UserManagement />} />
                        <Route path={ROUTE_PATHS.TEAM} element={<TeamOverview />} />
                        <Route path={ROUTE_PATHS.WAITING_LIST} element={<WaitingList />} />
                        <Route path="audit" element={<GlobalAudit />} />
                        <Route path="analytics" element={<AdvancedAnalytics />} />
                      </Route>
                    </Route>

                    <Route path={ROUTE_PATHS.NOT_FOUND} element={<NotFound />} />
                    <Route path="*" element={<Navigate to={ROUTE_PATHS.DASHBOARD} replace />} />
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