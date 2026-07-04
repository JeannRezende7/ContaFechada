import { NavLink, useParams } from 'react-router-dom';

const ITEMS = [
  { to: '', label: 'Início', icon: '⌂' },
  { to: 'lancamentos', label: 'Lançamentos', icon: '≡' },
  { to: 'relatorios', label: 'Relatórios', icon: '◧' },
  { to: 'config', label: 'Config', icon: '⚙' },
];

/** Visible on mobile only (< md). Desktop uses <Sidebar /> instead. */
export default function BottomNav() {
  const { tenantSlug } = useParams();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-paper border-t border-ink-100 flex justify-around
                 pb-[env(safe-area-inset-bottom)] z-20"
    >
      {ITEMS.map((item) => (
        <NavLink
          key={item.label}
          to={`/${tenantSlug}/${item.to}`}
          end={item.to === ''}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 py-2 px-3 text-xs ${
              isActive ? 'text-ledger-600' : 'text-ink-300'
            }`
          }
        >
          <span className="text-lg leading-none">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
