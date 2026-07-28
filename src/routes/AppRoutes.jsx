import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import AuthLayout from '../layouts/AuthLayout.jsx';
import AppLayout from '../layouts/AppLayout.jsx';
import LoadingScreen from '../components/ui/LoadingScreen.jsx';
import RouteErrorBoundary from '../components/ui/RouteErrorBoundary.jsx';
import { lazyWithRetry } from '../utils/lazyWithRetry.js';

const LoginPage = lazyWithRetry(() => import('../features/auth/pages/LoginPage.jsx'));
const DashboardPage = lazyWithRetry(() => import('../features/dashboard/pages/DashboardPage.jsx'));
const LancamentosPage = lazyWithRetry(() => import('../features/lancamentos/pages/LancamentosPage.jsx'));
const CategoriasPage = lazyWithRetry(() => import('../features/categorias/pages/CategoriasPage.jsx'));
const RelatoriosPage = lazyWithRetry(() => import('../features/relatorios/pages/RelatoriosPage.jsx'));
const MetasPage = lazyWithRetry(() => import('../features/metas/pages/MetasPage.jsx'));
const GestorFinanceiroPage = lazyWithRetry(() => import('../features/gestor/pages/GestorFinanceiroPage.jsx'));
const PlanejamentoPage = lazyWithRetry(() => import('../features/planejamento/pages/PlanejamentoPage.jsx'));
const OpcoesPage = lazyWithRetry(() => import('../features/opcoes/pages/OpcoesPage.jsx'));
const MeuPlanoPage = lazyWithRetry(() => import('../features/premium/pages/MeuPlanoPage.jsx'));
const TermosPage = lazyWithRetry(() => import('../features/legal/pages/TermosPage.jsx'));
const PrivacidadePage = lazyWithRetry(() => import('../features/legal/pages/PrivacidadePage.jsx'));
const BuscaGlobalPage = lazyWithRetry(() => import('../features/busca/pages/BuscaGlobalPage.jsx'));

export default function AppRoutes() {
  return (
    <RouteErrorBoundary>
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
          <Route path="/planejamento" element={<PlanejamentoPage />} />
          <Route path="/opcoes" element={<OpcoesPage />} />
          <Route path="/opcoes/meu-plano" element={<MeuPlanoPage />} />
          <Route path="/buscar" element={<BuscaGlobalPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/entrar" replace />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
}
