import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  CalendarRange,
  Home,
  Landmark,
  PieChart,
  Receipt,
  Settings,
  Tag,
  Target,
  WalletCards,
  X,
} from 'lucide-react';
import BrandIcon from '../ui/BrandIcon.jsx';

const ITEMS = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/lancamentos', label: 'Movimento', icon: Receipt },
  { to: '/planejamento', label: 'Planejamento', icon: CalendarRange },
  { to: '/valor-livre', label: 'Valor livre', icon: WalletCards },
  { to: '/categorias', label: 'Categorias', icon: Tag },
  { to: '/relatorios', label: 'Relatórios', icon: PieChart },
  { to: '/metas', label: 'Metas', icon: Target },
  { to: '/gestor', label: 'Gestor financeiro', icon: Landmark },
  { to: '/opcoes', label: 'Opções', icon: Settings },
];

export default function MobileDrawer({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 md:hidden ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Fechar menu"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={`absolute inset-0 bg-ink-900/60 backdrop-blur-[2px] transition-opacity ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <aside
        aria-label="Menu principal"
        className={`absolute inset-y-0 left-0 flex w-[82vw] max-w-xs flex-col bg-ink-900 px-4 pb-[env(safe-area-inset-bottom)] pt-[max(1rem,env(safe-area-inset-top))] text-paper shadow-pop transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-5 flex items-center gap-2.5 px-2">
          <BrandIcon size={34} className="h-8 w-8 shrink-0" />
          <span className="font-display text-lg font-semibold">Conta Fechada</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            tabIndex={open ? 0 : -1}
            className="ml-auto rounded-full p-2 text-ink-100 hover:bg-ink-700"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pb-4">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                tabIndex={open ? 0 : -1}
                className={({ isActive }) => (
                  `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors ${
                    isActive ? 'bg-ledger-500 text-white' : 'text-ink-100 hover:bg-ink-700'
                  }`
                )}
              >
                <Icon size={19} strokeWidth={1.75} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <p className="border-t border-ink-700 px-3 py-4 text-[11px] text-ink-300">
          Seus módulos financeiros em um só lugar.
        </p>
      </aside>
    </div>
  );
}
