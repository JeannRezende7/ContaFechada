import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar.jsx';
import BottomNav from '../components/layout/BottomNav.jsx';

/** Mobile-first: bottom nav + stacked content. From md breakpoint up: sidebar layout. */
export default function AppLayout() {
  return (
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
      <div className="flex-1 min-w-0 pb-16 md:pb-0">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
