import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import Sidebar from '../components/layout/Sidebar.jsx';
import BottomNav from '../components/layout/BottomNav.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import OnboardingWizard from '../features/onboarding/components/OnboardingWizard.jsx';
import { repositories } from '../repositories/index.js';
import AdMobBannerController from '../features/ads/components/AdMobBannerController.jsx';
import { PREMIUM_ENFORCED } from '../config/premium.js';
import { usePremium } from '../contexts/PremiumContext.jsx';

/** Mobile-first: bottom nav + stacked content. From md breakpoint up: sidebar layout. */
export default function AppLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const { hasCloudAccess, loading: premiumLoading } = usePremium();
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!user?.uid) return;
    repositories.configuracoes.getOnboardingState(user.uid).then((state) => setOnboardingOpen(!state.completed && !state.skipped));
    const open = () => setOnboardingOpen(true);
    window.addEventListener('contafechada:open-onboarding', open);
    return () => window.removeEventListener('contafechada:open-onboarding', open);
  }, [user]);

  const isWeb = !Capacitor.isNativePlatform();
  const webAlwaysAllowed = ['/opcoes', '/opcoes/meu-plano', '/controle-assinaturas'];
  if (
    isWeb
    && PREMIUM_ENFORCED
    && !premiumLoading
    && !hasCloudAccess
    && !webAlwaysAllowed.includes(location.pathname)
  ) {
    return <Navigate to="/opcoes/meu-plano" replace />;
  }
  return (
    <div className="flex min-h-screen bg-paper text-ink-900 dark:bg-ink-900 dark:text-ink-50 selection:bg-ledger-200">
      <AdMobBannerController />
      <Sidebar />
      <div
        aria-hidden="true"
        className="pointer-events-none select-none fixed inset-0 md:left-64 -z-10 flex items-center justify-center overflow-hidden"
      >
        <span className="font-display text-[22vw] md:text-[13vw] font-bold text-ink-900/[0.025] dark:text-white/[0.04] whitespace-nowrap -rotate-12">
          Conta Fechada
        </span>
      </div>
      <div data-app-content className="min-w-0 flex-1 overflow-x-clip">
        <Outlet />
        <OnboardingWizard uid={user?.uid} open={onboardingOpen} onClose={() => setOnboardingOpen(false)} />
      </div>
      <BottomNav />
    </div>
  );
}
