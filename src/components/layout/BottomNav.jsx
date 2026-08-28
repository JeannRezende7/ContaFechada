import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, Tag, CalendarRange } from 'lucide-react';

const ITEMS = [
  { to: '/', label: 'Lançamentos', icon: Receipt },
  { to: '/resumo', label: 'Resumo', icon: LayoutDashboard },
  { to: '/planejamento', label: 'Planejar', icon: CalendarRange },
  { to: '/categorias', label: 'Categorias', icon: Tag },
];

/** Visible on mobile only (< md). Desktop uses <Sidebar /> instead. */
export default function BottomNav() {
  return (
    <nav
      data-bottom-navigation
      className="md:hidden fixed bottom-0 left-0 right-0 bg-paper/95 dark:bg-ink-900/95 backdrop-blur border-t border-ink-100 dark:border-ink-700
                 flex justify-around pb-[env(safe-area-inset-bottom)] z-20"
    >
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-1 min-w-0 flex-col items-center gap-1 py-2.5 px-0.5 text-[10px] font-medium ${
                isActive ? 'text-ledger-600 dark:text-ledger-400' : 'text-ink-500 dark:text-ink-300'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex items-center justify-center w-9 h-6 rounded-pill transition-colors ${
                    isActive ? 'bg-ledger-50 dark:bg-ledger-500/10' : ''
                  }`}
                >
                  <Icon size={19} strokeWidth={isActive ? 2.25 : 1.75} />
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
