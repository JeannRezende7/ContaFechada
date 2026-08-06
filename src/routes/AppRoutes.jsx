import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import RequirePremiumWeb from './RequirePremiumWeb.jsx';
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
const GestorFinanceiroPage = lazyWithRetry(() => import('../features/gestor/pages/GestorFinanceiroPage.jsx'));
const OpcoesPage = lazyWithRetry(() => import('../features/opcoes/pages/OpcoesPage.jsx'));
const MeuPlanoPage = lazyWithRetry(() => import('../features/premium/pages/MeuPlanoPage.jsx'));
const TermosPage = lazyWithRetry(() => import('../features/legal/pages/TermosPage.jsx'));
const PrivacidadePage = lazyWithRetry(() => import('../features/legal/pages/PrivacidadePage.jsx'));
const BuscaGlobalPage = lazyWithRetry(() => import('../features/busca/pages/BuscaGlobalPage.jsx'));
const ValorLivrePage = lazyWithRetry(() => import('../features/valor-livre/pages/ValorLivrePage.jsx'));
const AcessoWebPage = lazyWithRetry(() => import('../features/premium/pages/AcessoWebPage.jsx'));
const AdminSubscriptionsPage = __NATIVE_ANDROID_BUILD__
  ? null
  : lazyWithRetry(() => import('../features/admin/pages/AdminSubscriptionsPage.jsx'));
const SyncDiagnosticsRoute = lazyWithRetry(() => import('../features/sync/pages/SyncDiagnosticsRoute.jsx'));

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
          {/* Sempre acessíveis a quem está logado, mesmo sem Premium na
              Web (Fase 10) — é daqui que dá pra assinar/gerenciar. */}
          <Route path="/opcoes" element={<OpcoesPage />} />
          <Route path="/opcoes/meu-plano" element={<MeuPlanoPage />} />
          <Route path="/acesso-web" element={<AcessoWebPage />} />
          {!__NATIVE_ANDROID_BUILD__ && <Route path="/controle-assinaturas" element={<AdminSubscriptionsPage />} />}
          <Route path="/opcoes/diagnostico" element={<SyncDiagnosticsRoute />} />

          {/* Módulos financeiros — exclusivos do Premium na Web; o Android
              gratuito continua liberado (RequirePremiumWeb passa direto). */}
          <Route element={<RequirePremiumWeb />}>
            <Route path="/" element={<LancamentosPage />} />
            <Route path="/resumo" element={<DashboardPage />} />
            <Route path="/lancamentos" element={<Navigate to="/" replace />} />
            <Route path="/categorias" element={<CategoriasPage />} />
            <Route path="/relatorios" element={<RelatoriosPage />} />
            <Route path="/gestor" element={<GestorFinanceiroPage />} />
            <Route path="/planejamento" element={<ValorLivrePage />} />
            <Route path="/buscar" element={<BuscaGlobalPage />} />
            <Route path="/valor-livre" element={<Navigate to="/planejamento" replace />} />
            <Route path="/metas" element={<Navigate to="/planejamento" replace />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/entrar" replace />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
}
