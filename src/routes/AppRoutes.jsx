import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import AuthLayout from '../layouts/AuthLayout.jsx';
import WorkspaceLayout from '../layouts/WorkspaceLayout.jsx';

import LoginPage from '../features/auth/pages/LoginPage.jsx';
import CreateWorkspacePage from '../features/onboarding/pages/CreateWorkspacePage.jsx';
import DashboardPage from '../features/dashboard/pages/DashboardPage.jsx';
import LancamentosPage from '../features/lancamentos/pages/LancamentosPage.jsx';
import CategoriasPage from '../features/categorias/pages/CategoriasPage.jsx';
import ContasBancariasPage from '../features/contas-bancarias/pages/ContasBancariasPage.jsx';
import RelatoriosPage from '../features/relatorios/pages/RelatoriosPage.jsx';
import SettingsPage from '../features/settings/pages/SettingsPage.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/entrar" replace />} />

      {/* Auth & onboarding — not tenant-scoped */}
      <Route element={<AuthLayout />}>
        <Route path="/entrar" element={<LoginPage />} />
        <Route
          path="/novo-workspace"
          element={
            <ProtectedRoute>
              <CreateWorkspacePage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Tenant-scoped app — everything lives under /:tenantSlug (REQ-02) */}
      <Route
        path="/:tenantSlug"
        element={
          <ProtectedRoute>
            <WorkspaceLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="lancamentos" element={<LancamentosPage />} />
        <Route path="categorias" element={<CategoriasPage />} />
        <Route path="contas-bancarias" element={<ContasBancariasPage />} />
        <Route path="relatorios" element={<RelatoriosPage />} />
        <Route path="config" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/entrar" replace />} />
    </Routes>
  );
}
