import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { getColor } from '../colorMap.js';
import { GROUP_ORDER } from '../data/defaultCategorias.js';

function groupOrderIndex(label) {
  const i = GROUP_ORDER.findIndex((g) => g.label === label);
  return i === -1 ? GROUP_ORDER.length : i;
}

/**
 * Trigger button + popover panel of grouped color chips, replacing a plain
 * <select multi-optgroup> — lets the color coding double as a visual index
 * while browsing, not just after picking.
 */
export default function CategoriaPicker({ categorias, value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const grupos = [...new Set(categorias.map((c) => c.grupo))].sort(
    (a, b) => groupOrderIndex(a) - groupOrderIndex(b)
  );
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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 rounded-xl border border-ink-100 px-3.5 py-2.5 text-sm bg-white focus:border-ledger-500 transition-colors"
      >
        {selecionada ? (
          <span className="flex items-center gap-2 min-w-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${getColor(selecionada.corKey).dot}`} />
            <span className="truncate">{selecionada.nome}</span>
          </span>
        ) : (
          <span className="text-ink-300">Sem categoria</span>
        )}
        <ChevronDown size={16} strokeWidth={2} className={`text-ink-300 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-40 mt-1.5 w-full max-h-56 overflow-y-auto rounded-xl border border-ink-100 bg-white shadow-card-hover p-3 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => pick('')}
            className={`self-start rounded-pill px-3 py-1.5 text-xs font-medium transition-colors ${
              !value ? 'bg-ink-900 text-white' : 'bg-ink-50 text-ink-500 hover:bg-ink-100'
            }`}
          >
            Sem categoria
          </button>

          {grupos.map((grupo) => (
            <div key={grupo}>
              <p className="text-[11px] font-medium text-ink-300 mb-1.5">{grupo}</p>
              <div className="flex flex-wrap gap-1.5">
                {categorias
                  .filter((c) => c.grupo === grupo)
                  .map((c) => {
                    const color = getColor(c.corKey);
                    const selected = value === c.id;
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => pick(c.id)}
                        className={`inline-flex items-center gap-1.5 rounded-pill pl-2.5 pr-3 py-1.5 text-xs font-medium transition-all ${color.chipBg} ${color.chipText} ${
                          selected ? 'ring-2 ring-offset-1 ring-ink-900' : 'opacity-80 hover:opacity-100'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color.dot}`} />
                        {c.nome}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
