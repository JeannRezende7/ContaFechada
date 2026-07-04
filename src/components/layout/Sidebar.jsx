import { NavLink, useParams } from 'react-router-dom';

const ITEMS = [
  { to: '', label: 'Início' },
  { to: 'lancamentos', label: 'Lançamentos' },
  { to: 'categorias', label: 'Categorias' },
  { to: 'contas-bancarias', label: 'Contas bancárias' },
  { to: 'relatorios', label: 'Relatórios' },
  { to: 'config', label: 'Configurações' },
];

/** Visible on desktop only (>= md). Mobile uses <BottomNav /> instead. */
export default function Sidebar({ workspaceName }) {
  const { tenantSlug } = useParams();

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:shrink-0 bg-ink-900 text-paper min-h-screen px-4 py-6">
      <div className="font-display text-lg font-semibold mb-8 px-2">
        {workspaceName || 'Contas'}
      </div>
      <nav className="flex flex-col gap-1">
        {ITEMS.map((item) => (
          <NavLink
            key={item.label}
            to={`/${tenantSlug}/${item.to}`}
            end={item.to === ''}
            className={({ isActive }) =>
              `rounded-md px-3 py-2 text-sm transition-colors ${
                isActive ? 'bg-ledger-600 text-white' : 'text-ink-300 hover:bg-ink-700 hover:text-paper'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
