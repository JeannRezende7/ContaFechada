import { NavLink } from 'react-router-dom';

const AREAS = {
  resumo: [
    { to: '/resumo', label: 'Visão geral', end: true },
    { to: '/resumo/relatorios', label: 'Relatórios' },
  ],
  planejamento: [
    { to: '/planejamento', label: 'Planejamento', end: true },
    { to: '/planejamento/gestor', label: 'Gestor financeiro' },
  ],
};

export default function SectionTabs({ area }) {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-4 md:px-8 md:pt-6">
      <nav aria-label="Seções" className="grid grid-cols-2 gap-1 rounded-pill bg-ink-50 p-1 dark:bg-ink-900">
        {AREAS[area].map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `rounded-pill px-3 py-2 text-center text-xs font-semibold transition-colors md:text-sm ${isActive ? 'bg-white text-ink-900 shadow-card dark:bg-ledger-500 dark:text-white' : 'text-ink-300 hover:text-ink-700 dark:text-ink-100'}`}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
