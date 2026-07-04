import { useEffect, useRef, useState } from 'react';

const EMPTY = {
  tipo: 'despesa',
  descricao: '',
  valor: '',
  dataVencimento: '',
  status: 'pendente',
  observacoes: '',
};

/** Fast entry modal (REQ "Lançamentos Rápidos"). Esc closes, Enter on the last field saves. */
export default function LancamentoModal({ open, initialData, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const firstFieldRef = useRef(null);

  useEffect(() => {
    if (open) {
      setForm(initialData ? { ...EMPTY, ...initialData } : EMPTY);
      setTimeout(() => firstFieldRef.current?.focus(), 0);
    }
  }, [open, initialData]);

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
    onSave({ ...form, valor: Number(form.valor) });
  }

  return (
    <div className="fixed inset-0 bg-ink-900/50 flex items-end sm:items-center justify-center z-30 px-0 sm:px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full sm:max-w-md rounded-t-card sm:rounded-card p-5 sm:p-6"
      >
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => update('tipo', 'despesa')}
            className={`flex-1 rounded-md py-2 text-sm font-medium ${
              form.tipo === 'despesa' ? 'bg-ink-900 text-white' : 'bg-ink-50 text-ink-500'
            }`}
          >
            Despesa
          </button>
          <button
            type="button"
            onClick={() => update('tipo', 'receita')}
            className={`flex-1 rounded-md py-2 text-sm font-medium ${
              form.tipo === 'receita' ? 'bg-ledger-500 text-white' : 'bg-ink-50 text-ink-500'
            }`}
          >
            Receita
          </button>
        </div>

        <label className="block text-xs font-medium text-ink-300 mb-1">Descrição</label>
        <input
          ref={firstFieldRef}
          required
          value={form.descricao}
          onChange={(e) => update('descricao', e.target.value)}
          className="w-full rounded-md border border-ink-100 px-3 py-2 text-sm mb-3 focus:border-ledger-500"
          placeholder="Ex: Aluguel do galpão"
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
              className="money w-full rounded-md border border-ink-100 px-3 py-2 text-sm focus:border-ledger-500"
              placeholder="0,00"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-300 mb-1">Vencimento</label>
            <input
              required
              type="date"
              value={form.dataVencimento}
              onChange={(e) => update('dataVencimento', e.target.value)}
              className="w-full rounded-md border border-ink-100 px-3 py-2 text-sm focus:border-ledger-500"
            />
          </div>
        </div>

        <label className="block text-xs font-medium text-ink-300 mb-1">Observações</label>
        <textarea
          value={form.observacoes}
          onChange={(e) => update('observacoes', e.target.value)}
          rows={2}
          className="w-full rounded-md border border-ink-100 px-3 py-2 text-sm mb-4 focus:border-ledger-500"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md py-2.5 text-sm font-medium text-ink-500 hover:bg-ink-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 rounded-md bg-ledger-500 text-white py-2.5 text-sm font-medium hover:bg-ledger-600"
          >
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}
