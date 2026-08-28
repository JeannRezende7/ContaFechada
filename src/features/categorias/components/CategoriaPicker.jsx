import { useEffect, useRef, useState } from 'react';
import { Ban, ChevronDown, Plus, X } from 'lucide-react';
import { getColor } from '../colorMap.js';
import { getIcon } from '../iconMap.js';
import { useModalHistory } from '../../../hooks/useModalHistory.js';

/**
 * Trigger button + popover panel of icon tiles, replacing a plain
 * <select> — the colored icon doubles as a visual index while browsing,
 * not just after picking.
 */
export default function CategoriaPicker({ categorias, value, onChange, compact = false, emptyLabel = 'Sem categoria', EmptyIcon = Ban }) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const rootRef = useRef(null);
  useModalHistory(showAll, () => setShowAll(false));

  const ordenadas = [...categorias].sort((a, b) => a.ordem - b.ordem);
  const selecionada = categorias.find((c) => c.id === value);
  const principais = ordenadas.slice(0, 7);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function handleKeyDown(e) {
    if (e.key === 'Escape' && showAll) {
      e.stopPropagation();
      setShowAll(false);
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
    }
  }

  function pick(id) {
    onChange(id);
    setOpen(false);
    setShowAll(false);
  }

  return (
    <div ref={rootRef} onKeyDown={handleKeyDown} className="relative">
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title={selecionada ? selecionada.nome : emptyLabel}
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
            <EmptyIcon size={13} strokeWidth={1.75} className="text-ink-300" />
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
            <span className="text-ink-300">{emptyLabel}</span>
          )}
          <ChevronDown size={16} strokeWidth={2} className={`text-ink-300 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      )}

      {open && (
        <div
          className={`absolute z-40 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-ink-100 bg-white dark:bg-ink-700 shadow-card-hover p-3 ${
            compact ? 'w-64 right-0' : 'w-full sm:w-72 sm:right-0'
          }`}
        >
          <div className="grid grid-cols-4 gap-x-2 gap-y-3">
            {principais.map((c) => {
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
                      selected ? 'ring-2 ring-offset-2 dark:ring-offset-ink-700 ring-ink-900 dark:ring-ink-50' : 'opacity-90 hover:opacity-100'
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
            <button type="button" onClick={() => setShowAll(true)} className="flex flex-col items-center gap-1">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-500 transition-colors hover:bg-ledger-50 hover:text-ledger-600 dark:bg-ink-900">
                <Plus size={22} strokeWidth={2} />
              </span>
              <span className="text-center text-[11px] leading-tight text-ink-500">Mais</span>
            </button>
          </div>
        </div>
      )}

      {showAll && <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-900/55 px-0 backdrop-blur-[2px] sm:items-center sm:px-4" onClick={() => setShowAll(false)}>
        <div role="dialog" aria-modal="true" aria-label="Todas as categorias" className="app-modal-sheet w-full overflow-y-auto rounded-t-card bg-white p-5 shadow-pop dark:bg-ink-700 sm:max-w-lg sm:rounded-card" onClick={(event) => event.stopPropagation()}>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div><h2 className="font-display text-lg font-semibold">Todas as categorias</h2><p className="mt-0.5 text-xs text-ink-300">Escolha uma categoria para o lançamento.</p></div>
            <button type="button" onClick={() => setShowAll(false)} aria-label="Fechar categorias" className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-50 text-ink-500 dark:bg-ink-900"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-5">
            <button type="button" onClick={() => pick('')} className="flex flex-col items-center gap-1">
              <span className={`flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed ${!value ? 'border-ledger-500 bg-ledger-50 text-ledger-600 dark:bg-ledger-500/10 dark:text-ledger-400' : 'border-ink-100 text-ink-300'}`}><EmptyIcon size={18} /></span>
              <span className="text-center text-[11px] leading-tight text-ink-500">{emptyLabel}</span>
            </button>
            {ordenadas.map((c) => {
              const Icon = getIcon(c.icone);
              const selected = value === c.id;
              return <button type="button" key={c.id} onClick={() => pick(c.id)} className="flex flex-col items-center gap-1">
                <span className={`flex h-12 w-12 items-center justify-center rounded-full ${getColor(c.corKey).dot} ${selected ? 'ring-2 ring-ink-900 ring-offset-2 dark:ring-ink-50 dark:ring-offset-ink-700' : ''}`}><Icon size={19} strokeWidth={2} className="text-white" /></span>
                <span className="line-clamp-2 text-center text-[11px] leading-tight text-ink-500">{c.nome}</span>
              </button>;
            })}
          </div>
        </div>
      </div>}
    </div>
  );
}
