import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import AuthLayout from '../layouts/AuthLayout.jsx';
import AppLayout from '../layouts/AppLayout.jsx';
import LoadingScreen from '../components/ui/LoadingScreen.jsx';

const LoginPage = lazy(() => import('../features/auth/pages/LoginPage.jsx'));
const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage.jsx'));
const LancamentosPage = lazy(() => import('../features/lancamentos/pages/LancamentosPage.jsx'));
const CategoriasPage = lazy(() => import('../features/categorias/pages/CategoriasPage.jsx'));
const RelatoriosPage = lazy(() => import('../features/relatorios/pages/RelatoriosPage.jsx'));
const MetasPage = lazy(() => import('../features/metas/pages/MetasPage.jsx'));
const GestorFinanceiroPage = lazy(() => import('../features/gestor/pages/GestorFinanceiroPage.jsx'));
const OpcoesPage = lazy(() => import('../features/opcoes/pages/OpcoesPage.jsx'));
const MeuPlanoPage = lazy(() => import('../features/premium/pages/MeuPlanoPage.jsx'));
const TermosPage = lazy(() => import('../features/legal/pages/TermosPage.jsx'));
const PrivacidadePage = lazy(() => import('../features/legal/pages/PrivacidadePage.jsx'));

export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
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
    </Suspense>
  );
}
