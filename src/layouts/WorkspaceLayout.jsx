import { Outlet } from 'react-router-dom';
import { TenantProvider, useTenant } from '../contexts/TenantContext.jsx';
import Sidebar from '../components/layout/Sidebar.jsx';
import BottomNav from '../components/layout/BottomNav.jsx';

function WorkspaceShell() {
  const { workspace, loading, error } = useTenant();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-ink-300">Carregando workspace…</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-signal-500 font-medium">{error}</p>
        <p className="text-ink-300 text-sm">Confira o endereço ou peça um novo convite para o administrador.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar workspaceName={workspace?.name} />
      <div className="flex-1 min-w-0 pb-16 md:pb-0">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}

/** Mobile-first: bottom nav + stacked content. From md breakpoint up: sidebar layout. */
export default function WorkspaceLayout() {
  return (
    <TenantProvider>
      <WorkspaceShell />
    </TenantProvider>
  );
}
