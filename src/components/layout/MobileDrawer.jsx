import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { CalendarRange, LayoutDashboard, Receipt, Tag, X } from 'lucide-react';
import BrandIcon from '../ui/BrandIcon.jsx';

const GROUPS = [
  { label: 'Dia a dia', items: [
    { to: '/', label: 'Lançamentos', icon: Receipt },
    { to: '/resumo', label: 'Resumo', icon: LayoutDashboard },
  ] },
  { label: 'Organização', items: [
    { to: '/planejamento', label: 'Planejamento', icon: CalendarRange },
    { to: '/categorias', label: 'Categorias', icon: Tag },
  ] },
];

export default function MobileDrawer({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event) => { if (event.key === 'Escape') onClose(); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  return (
    <div className={`fixed inset-0 z-50 md:hidden ${open ? 'pointer-events-auto' : 'pointer-events-none'}`} aria-hidden={!open}>
      <button type="button" aria-label="Fechar menu" tabIndex={open ? 0 : -1} onClick={onClose} className={`absolute inset-0 bg-ink-900/60 backdrop-blur-[2px] transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} />
      <aside
        aria-label="Menu principal"
        className={`absolute inset-y-0 left-0 flex w-[78vw] max-w-[19rem] flex-col border-r border-white/5 bg-ink-900 px-4 pb-[env(safe-area-inset-bottom)] pt-[max(1rem,env(safe-area-inset-top))] text-paper shadow-pop transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="mb-6 flex items-center gap-2.5 px-1.5">
          <BrandIcon size={34} className="h-8 w-8 shrink-0" />
          <span className="font-display text-lg font-semibold">Conta Fechada</span>
          <button type="button" onClick={onClose} aria-label="Fechar menu" tabIndex={open ? 0 : -1} className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-ink-300 transition-colors hover:bg-ink-700 hover:text-white"><X size={19} /></button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pb-4">
          {GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-300/80">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={onClose} tabIndex={open ? 0 : -1} className={({ isActive }) => `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-ledger-500/15 text-ledger-50' : 'text-ink-100 hover:bg-ink-700'}`}>
                      {({ isActive }) => (
                        <>
                          {isActive && <span className="absolute inset-y-2 left-0 w-1 rounded-r-pill bg-ledger-500" />}
                          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${isActive ? 'bg-ledger-500 text-white' : 'bg-ink-700/60 text-ink-100'}`}><Icon size={17} strokeWidth={1.8} /></span>
                          <span>{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <p className="border-t border-ink-700 px-3 py-4 text-[11px] text-ink-300">Configurações ficam na engrenagem do topo.</p>
      </aside>
    </div>
  );
}
