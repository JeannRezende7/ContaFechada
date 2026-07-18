import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import AuthLayout from '../layouts/AuthLayout.jsx';
import AppLayout from '../layouts/AppLayout.jsx';

import LoginPage from '../features/auth/pages/LoginPage.jsx';
import DashboardPage from '../features/dashboard/pages/DashboardPage.jsx';
import LancamentosPage from '../features/lancamentos/pages/LancamentosPage.jsx';
import CategoriasPage from '../features/categorias/pages/CategoriasPage.jsx';
import RelatoriosPage from '../features/relatorios/pages/RelatoriosPage.jsx';
import MetasPage from '../features/metas/pages/MetasPage.jsx';
import GestorFinanceiroPage from '../features/gestor/pages/GestorFinanceiroPage.jsx';
import OpcoesPage from '../features/opcoes/pages/OpcoesPage.jsx';
import MeuPlanoPage from '../features/premium/pages/MeuPlanoPage.jsx';
import TermosPage from '../features/legal/pages/TermosPage.jsx';
import PrivacidadePage from '../features/legal/pages/PrivacidadePage.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/entrar" element={<LoginPage />} />
      </Route>

      {/* Públicas — precisam ser legíveis por quem ainda nem tem conta. */}
      <Route path="/termos" element={<TermosPage />} />
      <Route path="/privacidade" element={<PrivacidadePage />} />

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
        <Route path="/metas" element={<MetasPage />} />
        <Route path="/gestor" element={<GestorFinanceiroPage />} />
        <Route path="/opcoes" element={<OpcoesPage />} />
        <Route path="/opcoes/meu-plano" element={<MeuPlanoPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/entrar" replace />} />
    </Routes>
  );
}
