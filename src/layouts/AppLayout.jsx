import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar.jsx';
import MobileDrawer from '../components/layout/MobileDrawer.jsx';
import TrialBanner from '../features/premium/components/TrialBanner.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import OnboardingWizard from '../features/onboarding/components/OnboardingWizard.jsx';
import { getOnboardingState } from '../features/onboarding/services/onboardingService.js';
import { MobileMenuProvider } from '../contexts/MobileMenuContext.jsx';

/** Mobile-first: bottom nav + stacked content. From md breakpoint up: sidebar layout. */
export default function AppLayout() {
  const { user } = useAuth();
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    getOnboardingState(user.uid).then((state) => setOnboardingOpen(!state.completed && !state.skipped));
    const open = () => setOnboardingOpen(true);
    window.addEventListener('contafechada:open-onboarding', open);
    return () => window.removeEventListener('contafechada:open-onboarding', open);
  }, [user]);
  return (
    <MobileMenuProvider openMenu={() => setMobileMenuOpen(true)}>
    <div className="flex min-h-screen bg-paper dark:bg-ink-900">
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
        <Outlet />
      </div>
      <MobileDrawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <OnboardingWizard uid={user?.uid} open={onboardingOpen} onClose={() => setOnboardingOpen(false)} />
    </div>
    </MobileMenuProvider>
  );
}
