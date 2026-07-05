import { useEffect, useRef, useState } from 'react';
import { COLOR_MAP } from '../../categorias/colorMap.js';

const EMPTY = { nome: '', valorAlvo: '', valorAtual: '', corKey: 'azul' };

/** Create/edit modal for a Meta Financeira (named savings goal with a progress bar). */
export default function MetaModal({ open, meta, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(EMPTY);
  const firstFieldRef = useRef(null);

  useEffect(() => {
    if (open) {
      setForm(
        meta
          ? {
              nome: meta.nome ?? '',
              valorAlvo: meta.valorAlvo ?? '',
              valorAtual: meta.valorAtual ?? 0,
              corKey: meta.corKey ?? 'azul',
            }
          : EMPTY
      );
      setTimeout(() => firstFieldRef.current?.focus(), 0);
    }
  }, [open, meta]);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave(meta?.id ?? null, {
      nome: form.nome,
      valorAlvo: Number(form.valorAlvo),
      valorAtual: Number(form.valorAtual) || 0,
      corKey: form.corKey,
    });
  }

  return (
    <div className="fixed inset-0 bg-ink-900/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center z-30 px-0 sm:px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-ink-700 w-full sm:max-w-md rounded-t-card sm:rounded-card p-5 sm:p-6 shadow-pop"
      >
        <div className="w-10 h-1.5 rounded-pill bg-ink-100 dark:bg-ink-900 mx-auto mb-4 sm:hidden" />

        <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-4">
          {meta ? 'Editar meta' : 'Nova meta financeira'}
        </h2>

        <label className="block text-xs font-medium text-ink-300 mb-1">Nome</label>
        <input
          ref={firstFieldRef}
          required
          value={form.nome}
          onChange={(e) => update('nome', e.target.value)}
          placeholder="Ex: Viagem, Reserva de emergência..."
          className="w-full rounded-xl border border-ink-100 bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-50 px-3.5 py-2.5 text-sm mb-3 focus:border-ledger-500 transition-colors"
        />

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-ink-300 mb-1">Valor alvo</label>
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              value={form.valorAlvo}
              onChange={(e) => update('valorAlvo', e.target.value)}
              className="money w-full rounded-xl border border-ink-100 bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-50 px-3.5 py-2.5 text-sm focus:border-ledger-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-300 mb-1">Já guardado</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.valorAtual}
              onChange={(e) => update('valorAtual', e.target.value)}
              className="money w-full rounded-xl border border-ink-100 bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-50 px-3.5 py-2.5 text-sm focus:border-ledger-500 transition-colors"
            />
          </div>
        </div>

        <p className="text-xs font-medium text-ink-300 mb-1">Cor</p>
        <div className="grid grid-cols-8 sm:grid-cols-10 gap-3 p-1 mb-4">
          {Object.keys(COLOR_MAP).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => update('corKey', key)}
              aria-label={`Cor ${key}`}
              className={`w-7 h-7 rounded-full mx-auto ${COLOR_MAP[key].dot} transition-all ${
                form.corKey === key ? 'ring-2 ring-offset-2 dark:ring-offset-ink-700 ring-ink-900 dark:ring-ink-50' : ''
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium text-ink-500 hover:bg-ink-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 rounded-xl bg-ledger-500 text-white py-2.5 text-sm font-medium hover:bg-ledger-600 hover:shadow-card-hover transition-all"
          >
            Salvar
          </button>
        </div>

        {meta && (
          <button
            type="button"
            onClick={() => onDelete(meta.id)}
            className="w-full mt-2 rounded-xl py-2 text-xs font-medium text-signal-500 hover:bg-signal-50 transition-colors"
          >
            Excluir meta
          </button>
        )}
      </form>
    </div>
  );
}
