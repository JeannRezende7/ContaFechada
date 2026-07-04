import { useEffect, useMemo, useRef, useState } from 'react';
import { Repeat } from 'lucide-react';
import CategoriaPicker from '../../categorias/components/CategoriaPicker.jsx';

const EMPTY = {
  tipo: 'despesa',
  descricao: '',
  valor: '',
  dataVencimento: '',
  diaVencimento: '',
  recorrente: false,
  status: 'pendente',
  observacoes: '',
  categoriaId: '',
};

/**
 * Fast entry modal. Esc closes. New entries can toggle "Repete todo mês" to
 * create a recurring template instead of a one-off lançamento — an existing
 * instance (one-off or already generated from a recorrência) is always
 * edited as a single entry, the toggle only applies to brand new entries.
 */
export default function LancamentoModal({ open, initialData, categorias = [], onClose, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const firstFieldRef = useRef(null);
  const isNew = !initialData;

  const categoriasDoTipo = useMemo(
    () => categorias.filter((c) => c.tipo === form.tipo),
    [categorias, form.tipo]
  );

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

  function handleTipoChange(tipo) {
    setForm((prev) => {
      const aindaValida = categorias.some((c) => c.id === prev.categoriaId && c.tipo === tipo);
      return { ...prev, tipo, categoriaId: aindaValida ? prev.categoriaId : '' };
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const valor = Number(form.valor);
    if (isNew && form.recorrente) {
      onSave({
        recorrente: true,
        tipo: form.tipo,
        descricao: form.descricao,
        valor,
        diaVencimento: Number(form.diaVencimento),
        observacoes: form.observacoes || null,
        categoriaId: form.categoriaId || null,
      });
    } else {
      onSave({
        recorrente: false,
        tipo: form.tipo,
        descricao: form.descricao,
        valor,
        dataVencimento: form.dataVencimento,
        status: form.status,
        observacoes: form.observacoes || null,
        categoriaId: form.categoriaId || null,
      });
    }
  }

  return (
    <div className="fixed inset-0 bg-ink-900/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center z-30 px-0 sm:px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full sm:max-w-md rounded-t-card sm:rounded-card p-5 sm:p-6 shadow-pop"
      >
        <div className="w-10 h-1.5 rounded-pill bg-ink-100 mx-auto mb-4 sm:hidden" />

        <h2 className="font-display text-base font-semibold text-ink-900 mb-4">
          {isNew ? 'Novo lançamento' : 'Editar lançamento'}
        </h2>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => handleTipoChange('despesa')}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
              form.tipo === 'despesa' ? 'bg-ink-900 text-white' : 'bg-ink-50 text-ink-500'
            }`}
          >
            Despesa
          </button>
          <button
            type="button"
            onClick={() => handleTipoChange('receita')}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
              form.tipo === 'receita' ? 'bg-ledger-500 text-white' : 'bg-ink-50 text-ink-500'
            }`}
          >
            Receita
          </button>
        </div>

        {isNew && (
          <label className="flex items-center gap-2 mb-4 text-sm text-ink-700 bg-clay-50/60 rounded-xl px-3 py-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.recorrente}
              onChange={(e) => update('recorrente', e.target.checked)}
              className="rounded border-ink-100 text-clay-500 focus:ring-clay-500"
            />
            <Repeat size={15} strokeWidth={2} className="text-clay-500" />
            Repete todo mês
          </label>
        )}

        {initialData?.origemRecorrenciaId && (
          <p className="flex items-center gap-1.5 text-xs text-clay-600 bg-clay-50/60 rounded-xl px-3 py-2 mb-3">
            <Repeat size={13} strokeWidth={2.25} />
            Gerado de uma recorrência — a edição vale só para este mês.
          </p>
        )}

        <label className="block text-xs font-medium text-ink-300 mb-1">Descrição</label>
        <input
          ref={firstFieldRef}
          required
          value={form.descricao}
          onChange={(e) => update('descricao', e.target.value)}
          className="w-full rounded-xl border border-ink-100 px-3.5 py-2.5 text-sm mb-3 focus:border-ledger-500 transition-colors"
          placeholder="Ex: Aluguel"
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
              className="money w-full rounded-xl border border-ink-100 px-3.5 py-2.5 text-sm focus:border-ledger-500 transition-colors"
              placeholder="0,00"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-300 mb-1">
              {isNew && form.recorrente ? 'Dia do vencimento' : 'Vencimento'}
            </label>
            {isNew && form.recorrente ? (
              <input
                required
                type="number"
                min="1"
                max="31"
                value={form.diaVencimento}
                onChange={(e) => update('diaVencimento', e.target.value)}
                className="w-full rounded-xl border border-ink-100 px-3.5 py-2.5 text-sm focus:border-ledger-500 transition-colors"
                placeholder="Ex: 10"
              />
            ) : (
              <input
                required
                type="date"
                value={form.dataVencimento}
                onChange={(e) => update('dataVencimento', e.target.value)}
                className="w-full rounded-xl border border-ink-100 px-3.5 py-2.5 text-sm focus:border-ledger-500 transition-colors"
              />
            )}
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
          className="w-full rounded-xl border border-ink-100 px-3.5 py-2.5 text-sm mb-4 focus:border-ledger-500 transition-colors"
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
      </form>
    </div>
  );
}
