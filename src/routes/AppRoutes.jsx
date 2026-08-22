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
const GestorFinanceiroPage = lazyWithRetry(() => import('../features/gestor/pages/GestorFinanceiroPage.jsx'));
const OpcoesPage = lazyWithRetry(() => import('../features/opcoes/pages/OpcoesPage.jsx'));
const MeuPlanoPage = lazyWithRetry(() => import('../features/premium/pages/MeuPlanoPage.jsx'));
const TermosPage = lazyWithRetry(() => import('../features/legal/pages/TermosPage.jsx'));
const PrivacidadePage = lazyWithRetry(() => import('../features/legal/pages/PrivacidadePage.jsx'));
const ExclusaoContaPage = lazyWithRetry(() => import('../features/legal/pages/ExclusaoContaPage.jsx'));
const BuscaGlobalPage = lazyWithRetry(() => import('../features/busca/pages/BuscaGlobalPage.jsx'));
const ValorLivrePage = lazyWithRetry(() => import('../features/valor-livre/pages/ValorLivrePage.jsx'));
const AdminSubscriptionsPage = __NATIVE_ANDROID_BUILD__
  ? null
  : lazyWithRetry(() => import('../features/admin/pages/AdminSubscriptionsPage.jsx'));
const DownloadAppPage = __NATIVE_ANDROID_BUILD__
  ? null
  : lazyWithRetry(() => import('../features/download/pages/DownloadAppPage.jsx'));

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
        <Route path="/excluir-conta" element={<ExclusaoContaPage />} />
        {!__NATIVE_ANDROID_BUILD__ && <Route path="/" element={<DownloadAppPage />} />}
        {!__NATIVE_ANDROID_BUILD__ && <Route path="/baixar-app" element={<DownloadAppPage />} />}

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
          {!__NATIVE_ANDROID_BUILD__ && <Route path="/controle-assinaturas" element={<AdminSubscriptionsPage />} />}

          {/* Módulos financeiros — exclusivos do Premium na Web; o Android
              gratuito continua liberado (RequirePremiumWeb passa direto). */}
          {__NATIVE_ANDROID_BUILD__ && <Route path="/" element={<LancamentosPage />} />}
          <Route path="/resumo" element={<DashboardPage />} />
          <Route path="/lancamentos" element={<Navigate to="/" replace />} />
          <Route path="/categorias" element={<CategoriasPage />} />
          <Route path="/resumo/relatorios" element={<RelatoriosPage />} />
          <Route path="/relatorios" element={<Navigate to="/resumo/relatorios" replace />} />
          <Route path="/planejamento/gestor" element={<GestorFinanceiroPage />} />
          <Route path="/gestor" element={<Navigate to="/planejamento/gestor" replace />} />
          <Route path="/planejamento" element={<ValorLivrePage />} />
          <Route path="/buscar" element={<BuscaGlobalPage />} />
          <Route path="/valor-livre" element={<Navigate to="/planejamento" replace />} />
          <Route path="/metas" element={<Navigate to="/planejamento" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/entrar" replace />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
}
