import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import AuthLayout from '../layouts/AuthLayout.jsx';
import AppLayout from '../layouts/AppLayout.jsx';

import LoginPage from '../features/auth/pages/LoginPage.jsx';
import DashboardPage from '../features/dashboard/pages/DashboardPage.jsx';
import LancamentosPage from '../features/lancamentos/pages/LancamentosPage.jsx';
import CategoriasPage from '../features/categorias/pages/CategoriasPage.jsx';
import RelatoriosPage from '../features/relatorios/pages/RelatoriosPage.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/entrar" element={<LoginPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/lancamentos" element={<LancamentosPage />} />
        <Route path="/categorias" element={<CategoriasPage />} />
        <Route path="/relatorios" element={<RelatoriosPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/entrar" replace />} />
    </Routes>
  );
}
