import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, Tag, Crown, CalendarRange } from 'lucide-react';
import BrandIcon from '../ui/BrandIcon.jsx';
import { usePremium } from '../../contexts/PremiumContext.jsx';
import { track, EVENTS } from '../../utils/analytics.js';

const ITEMS = [
  { to: __NATIVE_ANDROID_BUILD__ ? '/' : '/lancamentos', label: 'Lançamentos', icon: Receipt },
  { to: '/resumo', label: 'Resumo', icon: LayoutDashboard },
  { to: '/planejamento', label: 'Planejamento', icon: CalendarRange },
  { to: '/categorias', label: 'Categorias', icon: Tag },
];

/** Visible on desktop only (>= md). Mobile uses <BottomNav /> instead. */
export default function Sidebar() {
  const { isPremium } = usePremium();
  const showPremiumCard = !isPremium;

  useEffect(() => {
    if (showPremiumCard) track(EVENTS.PREMIUM_CARD_VIEWED, { placement: 'sidebar' });
  }, [showPremiumCard]);

  return (
    <aside className="hidden min-h-screen border-r border-ink-100 bg-paper px-4 py-6 text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-paper md:flex md:w-64 md:shrink-0 md:flex-col lg:w-72 lg:px-5 lg:py-8">
      <div className="flex items-center gap-2.5 mb-8 px-2">
        <BrandIcon size={36} className="w-8 h-8 lg:w-9 lg:h-9 shrink-0" />
        <span className="font-display text-lg lg:text-xl font-semibold">Conta Fechada</span>
      </div>
      <nav className="flex flex-col gap-1 lg:gap-1.5">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/' || item.to === '/lancamentos'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-pill px-3.5 py-2.5 lg:py-3 text-sm lg:text-base font-medium transition-colors ${
                  isActive
                    ? 'bg-ledger-500 text-white'
                    : 'text-ink-500 hover:bg-ink-50 dark:text-ink-100 dark:hover:bg-ink-700'
                }`
              }
            >
              <Icon size={18} strokeWidth={1.75} className="lg:w-5 lg:h-5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {showPremiumCard && (
        <NavLink
          to="/opcoes/meu-plano"
          onClick={() => track(EVENTS.PREMIUM_CARD_CLICKED, { placement: 'sidebar' })}
          className="mt-auto flex items-center gap-2.5 rounded-pill bg-gold-50 px-3.5 py-2.5 text-sm font-medium text-gold-700 transition-colors hover:bg-gold-100 dark:bg-ink-700 dark:text-gold-50 dark:hover:bg-ink-700/70"
        >
          <Crown size={16} strokeWidth={1.75} />
          Remover anÃºncios
        </NavLink>
      )}
    </aside>
  );
}
