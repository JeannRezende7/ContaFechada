import { useEffect, useRef, useState } from 'react';
import CategoriaPicker from '../../categorias/components/CategoriaPicker.jsx';
import { useConfirm } from '../../../contexts/ConfirmContext.jsx';

const EMPTY = { descricao: '', valor: '', diaVencimento: '', categoriaId: '', observacoes: '' };

/** Edits a recorrência template. Already-generated months don't change retroactively. */
export default function RecorrenciaModal({ open, recorrencia, categorias = [], onClose, onSave, onDelete }) {
  const [form, setForm] = useState(EMPTY);
  const firstFieldRef = useRef(null);
  const confirm = useConfirm();

  const categoriasDoTipo = categorias.filter((c) => c.tipo === recorrencia?.tipo);

  useEffect(() => {
    if (open && recorrencia) {
      setForm({
        descricao: recorrencia.descricao ?? '',
        valor: recorrencia.valor ?? '',
        diaVencimento: recorrencia.diaVencimento ?? '',
        categoriaId: recorrencia.categoriaId ?? '',
        observacoes: recorrencia.observacoes ?? '',
      });
      setTimeout(() => firstFieldRef.current?.focus(), 0);
    }
  }, [open, recorrencia]);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open || !recorrencia) return null;

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave(recorrencia.id, {
      descricao: form.descricao,
      valor: Number(form.valor),
      diaVencimento: Number(form.diaVencimento),
      categoriaId: form.categoriaId || null,
      observacoes: form.observacoes || null,
    });
  }

  return (
    <div className="fixed inset-0 bg-ink-900/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center z-30 px-0 sm:px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-ink-700 w-full sm:max-w-md rounded-t-card sm:rounded-card p-5 sm:p-6 shadow-pop"
      >
        <div className="w-10 h-1.5 rounded-pill bg-ink-100 dark:bg-ink-900 mx-auto mb-4 sm:hidden" />

        <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-1">Editar recorrência</h2>
        <p className="text-xs text-ink-300 mb-4">
          Vale a partir do próximo mês gerado — meses já lançados não mudam.
        </p>

        <label className="block text-xs font-medium text-ink-300 mb-1">Descrição</label>
        <input
          ref={firstFieldRef}
          required
          value={form.descricao}
          onChange={(e) => update('descricao', e.target.value)}
          className="w-full rounded-xl border border-ink-100 bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-50 px-3.5 py-2.5 text-sm mb-3 focus:border-ledger-500 transition-colors"
        />

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-ink-300 mb-1">Valor</label>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              value={form.valor}
              onChange={(e) => update('valor', e.target.value)}
              className="money w-full rounded-xl border border-ink-100 bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-50 px-3.5 py-2.5 text-sm focus:border-ledger-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-300 mb-1">Dia do mês</label>
            <input
              required
              type="number"
              min="1"
              max="31"
              value={form.diaVencimento}
              onChange={(e) => update('diaVencimento', e.target.value)}
              className="w-full rounded-xl border border-ink-100 bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-50 px-3.5 py-2.5 text-sm focus:border-ledger-500 transition-colors"
            />
          </div>
        </div>

        <label className="block text-xs font-medium text-ink-300 mb-1">Categoria</label>
        <div className="mb-3">
          <CategoriaPicker
            categorias={categoriasDoTipo}
            value={form.categoriaId}
            onChange={(id) => update('categoriaId', id)}
          />
        </div>

        <label className="block text-xs font-medium text-ink-300 mb-1">Observações</label>
        <textarea
          value={form.observacoes}
          onChange={(e) => update('observacoes', e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-ink-100 bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-50 px-3.5 py-2.5 text-sm mb-4 focus:border-ledger-500 transition-colors"
        />

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

        <button
          type="button"
          onClick={async () => {
            if (await confirm('Encerrar esta recorrência? Os lançamentos já gerados continuam existindo.')) {
              onDelete(recorrencia.id);
            }
          }}
          className="w-full mt-2 rounded-xl py-2 text-xs font-medium text-signal-500 hover:bg-signal-50 transition-colors"
        >
          Encerrar recorrência
        </button>
      </form>
    </div>
  );
}
