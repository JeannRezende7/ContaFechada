import { NavLink } from 'react-router-dom';
import { Home, Receipt, Tag, PieChart, Target, Landmark } from 'lucide-react';

const ITEMS = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/lancamentos', label: 'Lançamentos', icon: Receipt },
  { to: '/categorias', label: 'Categorias', icon: Tag },
  { to: '/relatorios', label: 'Relatórios', icon: PieChart },
  { to: '/metas', label: 'Metas', icon: Target },
  { to: '/gestor', label: 'Gestor', icon: Landmark },
];

/** Visible on mobile only (< md). Desktop uses <Sidebar /> instead. */
export default function BottomNav() {
  return (
    <nav
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
              `flex flex-col items-center gap-1 py-2.5 px-1 text-[10px] font-medium ${
                isActive ? 'text-ledger-600' : 'text-ink-300'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex items-center justify-center w-9 h-6 rounded-pill transition-colors ${
                    isActive ? 'bg-ledger-50' : ''
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
