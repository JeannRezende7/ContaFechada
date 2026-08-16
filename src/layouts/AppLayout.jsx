import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import Sidebar from '../components/layout/Sidebar.jsx';
import MobileDrawer from '../components/layout/MobileDrawer.jsx';
import TrialBanner from '../features/premium/components/TrialBanner.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import OnboardingWizard from '../features/onboarding/components/OnboardingWizard.jsx';
import { repositories } from '../repositories/index.js';
import SyncManager from '../features/sync/components/SyncManager.jsx';
import { MobileMenuProvider } from '../contexts/MobileMenuContext.jsx';
import { WEB_ACCESS_ENABLED } from '../config/premium.js';
import InitialCloudRestoreGate from '../features/backup/components/InitialCloudRestoreGate.jsx';

/** Mobile-first: bottom nav + stacked content. From md breakpoint up: sidebar layout. */
export default function AppLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() && !WEB_ACCESS_ENABLED) return;
    if (!user?.uid) return;
    repositories.configuracoes.getOnboardingState(user.uid).then((state) => setOnboardingOpen(!state.completed && !state.skipped));
    const open = () => setOnboardingOpen(true);
    window.addEventListener('contafechada:open-onboarding', open);
    return () => window.removeEventListener('contafechada:open-onboarding', open);
  }, [user]);

  if (!Capacitor.isNativePlatform() && !WEB_ACCESS_ENABLED && !['/acesso-web', '/controle-assinaturas'].includes(location.pathname)) {
    return <Navigate to="/baixar-app" replace />;
  }
  return (
    <MobileMenuProvider openMenu={() => setMobileMenuOpen(true)}>
    <div className="flex min-h-screen bg-paper text-ink-900 dark:bg-ink-900 dark:text-ink-50">
      <SyncManager />
      <Sidebar />
      <div
        aria-hidden="true"
        className="pointer-events-none select-none fixed inset-0 md:left-64 -z-10 flex items-center justify-center overflow-hidden"
      >
        <span className="font-display text-[22vw] md:text-[13vw] font-bold text-ink-900/[0.025] dark:text-white/[0.04] whitespace-nowrap -rotate-12">
          Conta Fechada
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <TrialBanner />
        <InitialCloudRestoreGate><Outlet /></InitialCloudRestoreGate>
      </div>
      <MobileDrawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <OnboardingWizard uid={user?.uid} open={onboardingOpen} onClose={() => setOnboardingOpen(false)} />
    </div>
    </MobileMenuProvider>
  );
}
