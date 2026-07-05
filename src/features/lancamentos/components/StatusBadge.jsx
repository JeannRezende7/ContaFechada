import { useEffect, useRef, useState } from 'react';
import { Clock, CalendarClock, AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react';

const STATUS_CONFIG = {
  pendente: { label: 'Pendente', icon: Clock, className: 'bg-ink-100 dark:bg-ink-900 text-ink-500' },
  agendado: { label: 'Agendado', icon: CalendarClock, className: 'bg-pending-400/15 text-pending-500' },
  atrasado: { label: 'Atrasado', icon: AlertTriangle, className: 'bg-signal-50 text-signal-500' },
  pago: { label: 'Pago', icon: CheckCircle2, className: 'bg-ledger-50 text-ledger-600' },
  recebido: { label: 'Recebido', icon: CheckCircle2, className: 'bg-ledger-50 text-ledger-600' },
};

/** A despesa settles as "Pago", a receita as "Recebido" — never both on the same item. */
function optionsFor(tipo) {
  return ['pendente', 'agendado', 'atrasado', tipo === 'receita' ? 'recebido' : 'pago'];
}

/** Tap to open a small popover and pick a status — no native <select> chrome. */
export default function StatusBadge({ status, tipo, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pendente;
  const Icon = config.icon;
  const options = optionsFor(tipo);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function pick(key) {
    onChange(key);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 text-xs md:text-sm font-medium rounded-pill pl-2.5 pr-2 py-1.5 md:py-2 transition-colors ${config.className}`}
      >
        <Icon size={12} strokeWidth={2.25} className="md:w-3.5 md:h-3.5" />
        {config.label}
        <ChevronDown size={12} strokeWidth={2.25} className={`md:w-3.5 md:h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-1.5 w-36 rounded-xl border border-ink-100 bg-white dark:bg-ink-700 shadow-card-hover p-1.5 flex flex-col gap-0.5">
          {options.map((key) => {
            const opt = STATUS_CONFIG[key];
            const OptIcon = opt.icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => pick(key)}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-left transition-colors ${
                  key === status ? opt.className : 'text-ink-500 hover:bg-ink-50'
                }`}
              >
                <OptIcon size={13} strokeWidth={2.25} />
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
