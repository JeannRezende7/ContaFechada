import { useEffect, useMemo, useRef, useState } from 'react';
import { Repeat, Layers } from 'lucide-react';
import CategoriaPicker from '../../categorias/components/CategoriaPicker.jsx';
import { formatCurrency } from '../../../utils/formatCurrency.js';
import { getTodayISODate, shiftISODate, isSaneISODate } from '../../../utils/formatDate.js';
import { useConfirm, useConfirmChoice } from '../../../contexts/ConfirmContext.jsx';

const EMPTY = {
  tipo: 'despesa',
  descricao: '',
  valor: '',
  dataVencimento: '',
  diaVencimento: '',
  modo: 'normal', // 'normal' | 'recorrente' | 'parcelado' — only meaningful for new entries
  numParcelas: '2',
  status: 'pendente',
  observacoes: '',
  categoriaId: '',
};

const MODOS = [
  { key: 'normal', label: 'Única' },
  { key: 'recorrente', label: 'Recorrente' },
  { key: 'parcelado', label: 'Parcelado' },
];

/**
 * Fast entry modal. Esc closes. New entries can toggle "Repete todo mês" to
 * create a recurring template instead of a one-off lançamento — an existing
 * instance (one-off or already generated from a recorrência) is always
 * edited as a single entry, the toggle only applies to brand new entries.
 */
export default function LancamentoModal({ open, initialData, categorias = [], defaultTipo, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(EMPTY);
  const firstFieldRef = useRef(null);
  const isNew = !initialData;
  const confirm = useConfirm();
  const confirmChoice = useConfirmChoice();

  const categoriasDoTipo = useMemo(
    () => categorias.filter((c) => c.tipo === form.tipo),
    [categorias, form.tipo]
  );

  useEffect(() => {
    if (open) {
      setForm(
        initialData
          ? { ...EMPTY, ...initialData, observacoes: initialData.observacoes ?? '' }
          : { ...EMPTY, tipo: defaultTipo ?? EMPTY.tipo }
      );
      setTimeout(() => firstFieldRef.current?.focus(), 0);
    }
  }, [open, initialData, defaultTipo]);

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

  async function handleDeleteClick() {
    if (initialData.parcelamentoId && initialData.parcelaAtual < initialData.totalParcelas) {
      const escolha = await confirmChoice(
        `Esta é a parcela ${initialData.parcelaAtual}/${initialData.totalParcelas}. O que você quer excluir?`,
        [
          { value: 'only', label: 'Excluir apenas esta parcela', tone: 'danger' },
          { value: 'future', label: 'Excluir esta e as próximas parcelas', tone: 'danger' },
          { value: 'cancel', label: 'Cancelar', tone: 'neutral' },
        ]
      );
      if (escolha === 'only') onDelete(initialData, { futureInstallments: false });
      else if (escolha === 'future') onDelete(initialData, { futureInstallments: true });
    } else if (await confirm('Excluir este lançamento?')) {
      onDelete(initialData, {});
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const valor = Number(form.valor);
    const dataVencimento = form.dataVencimento || getTodayISODate();
    if (isNew && form.modo === 'recorrente') {
      onSave({
        recorrente: true,
        tipo: form.tipo,
        descricao: form.descricao,
        valor,
        diaVencimento: Number(form.diaVencimento),
        observacoes: form.observacoes || null,
        categoriaId: form.categoriaId || null,
      });
    } else if (isNew && form.modo === 'parcelado') {
      onSave({
        parcelado: true,
        tipo: form.tipo,
        descricao: form.descricao,
        valorTotal: valor,
        numParcelas: Number(form.numParcelas),
        dataVencimento,
        observacoes: form.observacoes || null,
        categoriaId: form.categoriaId || null,
      });
    } else {
      onSave({
        recorrente: false,
        tipo: form.tipo,
        descricao: form.descricao,
        valor,
        dataVencimento,
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
        className="bg-white dark:bg-ink-700 w-full sm:max-w-md rounded-t-card sm:rounded-card p-5 sm:p-6 shadow-pop"
      >
        <div className="w-10 h-1.5 rounded-pill bg-ink-100 dark:bg-ink-900 mx-auto mb-4 sm:hidden" />

        <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-4">
          {isNew ? 'Novo lançamento' : 'Editar lançamento'}
        </h2>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => handleTipoChange('despesa')}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
              form.tipo === 'despesa' ? 'bg-ink-900 text-white' : 'bg-ink-50 dark:bg-ink-900 text-ink-500'
            }`}
          >
            Despesa
          </button>
          <button
            type="button"
            onClick={() => handleTipoChange('receita')}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
              form.tipo === 'receita' ? 'bg-ledger-500 text-white' : 'bg-ink-50 dark:bg-ink-900 text-ink-500'
            }`}
          >
            Receita
          </button>
        </div>

        {isNew && (
          <div className="flex gap-1 mb-4 bg-ink-50 dark:bg-ink-900 rounded-pill p-1">
            {MODOS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => update('modo', opt.key)}
                className={`flex-1 rounded-pill py-1.5 text-xs font-medium transition-colors ${
                  form.modo === opt.key ? 'bg-white dark:bg-ink-700 shadow-card text-ink-900 dark:text-ink-50' : 'text-ink-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {initialData?.origemRecorrenciaId && (
          <p className="flex items-center gap-1.5 text-xs text-clay-600 bg-clay-50/60 rounded-xl px-3 py-2 mb-3">
            <Repeat size={13} strokeWidth={2.25} />
            Gerado de uma recorrência — a edição vale só para este mês.
          </p>
        )}

        {initialData?.parcelamentoId && (
          <p className="flex items-center gap-1.5 text-xs text-clay-600 bg-clay-50/60 rounded-xl px-3 py-2 mb-3">
            <Layers size={13} strokeWidth={2.25} />
            Parcela {initialData.parcelaAtual}/{initialData.totalParcelas} — a edição vale só para esta parcela.
          </p>
        )}

        <label className="block text-xs font-medium text-ink-300 mb-1">Descrição</label>
        <input
          ref={firstFieldRef}
          required
          value={form.descricao}
          onChange={(e) => update('descricao', e.target.value)}
          className="w-full rounded-xl border border-ink-100 bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-50 px-3.5 py-2.5 text-sm mb-3 focus:border-ledger-500 transition-colors"
          placeholder="Ex: Aluguel"
        />

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-ink-300 mb-1">
              {isNew && form.modo === 'parcelado' ? 'Valor total' : 'Valor'}
            </label>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              value={form.valor}
              onChange={(e) => update('valor', e.target.value)}
              className="money w-full rounded-xl border border-ink-100 bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-50 px-3.5 py-2.5 text-sm focus:border-ledger-500 transition-colors"
              placeholder="0,00"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-300 mb-1">
              {isNew && form.modo === 'recorrente' ? 'Dia do mês' : 'Data'}
            </label>
            {isNew && form.modo === 'recorrente' ? (
              <input
                required
                type="number"
                min="1"
                max="31"
                value={form.diaVencimento}
                onChange={(e) => update('diaVencimento', e.target.value)}
                className="w-full rounded-xl border border-ink-100 bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-50 px-3.5 py-2.5 text-sm focus:border-ledger-500 transition-colors"
                placeholder="Ex: 10"
              />
            ) : (
              <input
                type="date"
                min="1900-01-01"
                max="2100-12-31"
                value={form.dataVencimento}
                onChange={(e) => isSaneISODate(e.target.value) && update('dataVencimento', e.target.value)}
                placeholder="Hoje"
                className="[color-scheme:light] w-full bg-white text-ink-900 rounded-xl border border-ink-100 px-3.5 py-2.5 text-sm focus:border-ledger-500 transition-colors"
              />
            )}
          </div>
        </div>

        {!(isNew && form.modo === 'recorrente') && (
          <div className="flex gap-1.5 mb-3 -mt-1.5">
            {[
              { label: 'Hoje', dias: 0 },
              { label: 'Ontem', dias: -1 },
              { label: 'Anteontem', dias: -2 },
            ].map((opt) => {
              const alvo = shiftISODate(getTodayISODate(), opt.dias);
              const selecionado = form.dataVencimento === alvo;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => update('dataVencimento', alvo)}
                  className={`rounded-pill px-3 py-1 text-xs font-medium transition-colors ${
                    selecionado ? 'bg-ink-900 text-white' : 'bg-ink-50 dark:bg-ink-900 text-ink-500 hover:bg-ink-100'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}

        {isNew && form.modo === 'parcelado' && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-ink-300 mb-1">Número de parcelas</label>
              <input
                required
                type="number"
                min="2"
                max="60"
                value={form.numParcelas}
                onChange={(e) => update('numParcelas', e.target.value)}
                className="w-full rounded-xl border border-ink-100 bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-50 px-3.5 py-2.5 text-sm focus:border-ledger-500 transition-colors"
              />
            </div>
            <div className="flex items-end pb-2.5">
              {Number(form.valor) > 0 && Number(form.numParcelas) > 1 && (
                <p className="text-xs text-ink-300">
                  {form.numParcelas}x de{' '}
                  <span className="font-medium text-ink-700">
                    {formatCurrency(Number(form.valor) / Number(form.numParcelas))}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}

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

        {!isNew && (
          <button
            type="button"
            onClick={handleDeleteClick}
            className="w-full mt-2 rounded-xl py-2 text-xs font-medium text-signal-500 hover:bg-signal-50 transition-colors"
          >
            Excluir lançamento
          </button>
        )}
      </form>
    </div>
  );
}
