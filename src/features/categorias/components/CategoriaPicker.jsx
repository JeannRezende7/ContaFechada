import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Ban } from 'lucide-react';
import { getColor } from '../colorMap.js';
import { getIcon } from '../iconMap.js';

/**
 * Trigger button + popover panel of icon tiles, replacing a plain
 * <select> — the colored icon doubles as a visual index while browsing,
 * not just after picking.
 */
export default function CategoriaPicker({ categorias, value, onChange, compact = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const ordenadas = [...categorias].sort((a, b) => a.ordem - b.ordem);
  const selecionada = categorias.find((c) => c.id === value);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function handleKeyDown(e) {
    if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
    }
  }

  function pick(id) {
    onChange(id);
    setOpen(false);
  }

  return (
    <div ref={rootRef} onKeyDown={handleKeyDown} className="relative">
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title={selecionada ? selecionada.nome : 'Sem categoria'}
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
            selecionada ? getColor(selecionada.corKey).dot : 'border-2 border-dashed border-ink-200 hover:border-ink-300'
          }`}
        >
          {selecionada ? (
            (() => {
              const Icon = getIcon(selecionada.icone);
              return <Icon size={14} strokeWidth={2.25} className="text-white" />;
            })()
          ) : (
            <Ban size={13} strokeWidth={1.75} className="text-ink-300" />
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-2 rounded-xl border border-ink-100 px-3.5 py-2.5 text-sm bg-white dark:bg-ink-700 focus:border-ledger-500 transition-colors"
        >
          {selecionada ? (
            <span className="flex items-center gap-2 min-w-0">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${getColor(selecionada.corKey).dot}`}
              >
                {(() => {
                  const Icon = getIcon(selecionada.icone);
                  return <Icon size={13} strokeWidth={2.25} className="text-white" />;
                })()}
              </span>
              <span className="truncate">{selecionada.nome}</span>
            </span>
          ) : (
            <span className="text-ink-300">Sem categoria</span>
          )}
          <ChevronDown size={16} strokeWidth={2} className={`text-ink-300 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      )}

      {open && (
        <div
          className={`absolute z-40 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-ink-100 bg-white dark:bg-ink-700 shadow-card-hover p-3 ${
            compact ? 'w-64 right-0' : 'w-full'
          }`}
        >
          <div className="grid grid-cols-4 gap-x-2 gap-y-3">
            <button type="button" onClick={() => pick('')} className="flex flex-col items-center gap-1">
              <span
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 border-dashed transition-colors ${
                  !value ? 'border-ink-900 bg-ink-50 dark:bg-ink-900' : 'border-ink-100 text-ink-300 hover:border-ink-300'
                }`}
              >
                <Ban size={18} strokeWidth={1.75} className={!value ? 'text-ink-900 dark:text-ink-50' : 'text-ink-300'} />
              </span>
              <span className="text-[11px] text-ink-500 text-center leading-tight">Sem categoria</span>
            </button>

            {ordenadas.map((c) => {
              const color = getColor(c.corKey);
              const Icon = getIcon(c.icone);
              const selected = value === c.id;
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => pick(c.id)}
                  className="flex flex-col items-center gap-1"
                >
                  <span
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${color.dot} ${
                      selected ? 'ring-2 ring-offset-2 ring-ink-900' : 'opacity-90 hover:opacity-100'
                    }`}
                  >
                    <Icon size={19} strokeWidth={2} className="text-white" />
                  </span>
                  <span className="text-[11px] text-ink-500 text-center leading-tight line-clamp-2">
                    {c.nome}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
