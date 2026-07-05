import { NavLink } from 'react-router-dom';
import { Home, Receipt, Tag, PieChart, PiggyBank } from 'lucide-react';

const ITEMS = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/lancamentos', label: 'Lançamentos', icon: Receipt },
  { to: '/categorias', label: 'Categorias', icon: Tag },
  { to: '/relatorios', label: 'Relatórios', icon: PieChart },
];

/** Visible on desktop only (>= md). Mobile uses <BottomNav /> instead. */
export default function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-64 lg:w-72 md:flex-col md:shrink-0 bg-ink-900 text-paper min-h-screen px-4 lg:px-5 py-6 lg:py-8">
      <div className="flex items-center gap-2.5 mb-8 px-2">
        <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg bg-ledger-500 flex items-center justify-center shrink-0">
          <PiggyBank size={18} className="text-white lg:w-5 lg:h-5" strokeWidth={1.75} />
        </div>
        <span className="font-display text-lg lg:text-xl font-semibold">Conta Fechada</span>
      </div>
      <nav className="flex flex-col gap-1 lg:gap-1.5">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-pill px-3.5 py-2.5 lg:py-3 text-sm lg:text-base font-medium transition-colors ${
                  isActive ? 'bg-ledger-500 text-white' : 'text-ink-100 hover:bg-ink-700'
                }`
              }
            >
              <Icon size={18} strokeWidth={1.75} className="lg:w-5 lg:h-5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
