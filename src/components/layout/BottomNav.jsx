import { NavLink } from 'react-router-dom';
import { Home, Receipt, Tag, PieChart } from 'lucide-react';

const ITEMS = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/lancamentos', label: 'Lançamentos', icon: Receipt },
  { to: '/categorias', label: 'Categorias', icon: Tag },
  { to: '/relatorios', label: 'Relatórios', icon: PieChart },
];

/** Visible on mobile only (< md). Desktop uses <Sidebar /> instead. */
export default function BottomNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-paper/95 backdrop-blur border-t border-ink-100
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
              `flex flex-col items-center gap-1 py-2.5 px-4 text-[11px] font-medium ${
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
