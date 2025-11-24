// frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";

import { queryClient } from "./lib/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import { ModalProvider } from "./contexts/ModalContext";
import { ThemeProvider } from "./components/theme-provider";

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
import { NotFound } from "./pages/NotFound";
import { GlobalAudit } from "./pages/GlobalAudit";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <BrowserRouter>
          <AuthProvider>
            <ModalProvider>
              <Routes>
                <Route path={ROUTE_PATHS.LOGIN} element={<Login />} />

                <Route path={ROUTE_PATHS.DASHBOARD} element={<MainLayout />}>
                  <Route
                    index
                    element={
                      <ProtectedRoute allowedRoles={["Gerente", "Especialista", "Agente Social"]}>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Rotas gerais */}
                  <Route element={<ProtectedRoute allowedRoles={["Gerente", "Especialista", "Agente Social"]} />}>
                    <Route path={ROUTE_PATHS.CASES} element={<Cases />} />
                    <Route path={ROUTE_PATHS.CLOSED_CASES} element={<ClosedCases />} />
                    <Route path={ROUTE_PATHS.AGENDA} element={<Agenda />} />
                  </Route>

                  {/* Rotas técnicas */}
                  <Route element={<ProtectedRoute allowedRoles={["Gerente", "Especialista"]} />}>
                    <Route path={ROUTE_PATHS.CASE_DETAIL} element={<CaseDetail />} />
                  </Route>

                  {/* Rotas de gerência */}
                  <Route element={<ProtectedRoute allowedRoles={["Gerente"]} />}>
                    <Route path={ROUTE_PATHS.REPORTS} element={<Reports />} />
                    <Route path={ROUTE_PATHS.USERS} element={<UserManagement />} />
                    <Route path={ROUTE_PATHS.TEAM} element={<TeamOverview />} />
                    <Route path="audit" element={<GlobalAudit />} />
                  </Route>
                </Route>

                <Route path={ROUTE_PATHS.NOT_FOUND} element={<NotFound />} />
                <Route path="*" element={<Navigate to={ROUTE_PATHS.DASHBOARD} replace />} />
              </Routes>

              <Toaster richColors />
              <ReactQueryDevtools initialIsOpen={false} />
            </ModalProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
