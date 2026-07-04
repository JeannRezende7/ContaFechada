import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar.jsx';
import BottomNav from '../components/layout/BottomNav.jsx';

/** Mobile-first: bottom nav + stacked content. From md breakpoint up: sidebar layout. */
export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <div className="flex-1 min-w-0 pb-16 md:pb-0">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
