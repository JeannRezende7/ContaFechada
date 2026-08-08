import { useEffect, useMemo, useRef, useState } from 'react';
import { Repeat, Layers, ShoppingCart } from 'lucide-react';
import CategoriaPicker from '../../categorias/components/CategoriaPicker.jsx';
import { formatCurrency } from '../../../utils/formatCurrency.js';
import { getTodayISODate, shiftISODate, isSaneISODate } from '../../../utils/formatDate.js';
import { useConfirm, useConfirmChoice } from '../../../contexts/ConfirmContext.jsx';
import { useModalHistory } from '../../../hooks/useModalHistory.js';

const EMPTY = {
  tipo: 'despesa',
  descricao: '',
  valor: '',
  dataVencimento: '',
  diaVencimento: '',
  mesInicio: '', // 'YYYY-MM' — first month a recorrente starts generating from
  modo: 'normal', // 'normal' | 'recorrente' | 'parcelado' — only meaningful for new entries
  numParcelas: '2',
  entrada: '0',
  status: 'pendente',
  observacoes: '',
  categoriaId: '',
};

const MODOS = [
  { key: 'normal', label: 'Única' },
  { key: 'recorrente', label: 'Recorrente' },
  { key: 'parcelado', label: 'Parcelado' },
  { key: 'simulacao', label: 'Simular compra' },
];

/**
 * Fast entry modal. Esc closes. New entries can toggle "Repete todo mês" to
 * create a recurring template instead of a one-off lançamento — an existing
 * instance (one-off or already generated from a recorrência) is always
 * edited as a single entry, the toggle only applies to brand new entries.
 */
export default function LancamentoModal({
  open,
  initialData,
  categorias = [],
  defaultTipo,
  defaultDate,
  defaultMonthKey,
  permitirRecorrente = true,
  onClose,
  onSave,
  onDelete,
  onDuplicate,
  copyMode = false,
  saving = false,
}) {
  useModalHistory(open, onClose);
  const [form, setForm] = useState(EMPTY);
  const firstFieldRef = useRef(null);
  const isNew = !initialData || copyMode;
  const confirm = useConfirm();
  const confirmChoice = useConfirmChoice();

  const categoriasDoTipo = useMemo(
    () => categorias.filter((c) => c.tipo === form.tipo),
    [categorias, form.tipo]
  );

  const modosDisponiveis = useMemo(
    () => (permitirRecorrente ? MODOS : MODOS.filter((m) => m.key !== 'recorrente')),
    [permitirRecorrente]
  );

  useEffect(() => {
    if (open) {
      setForm(
        initialData
          ? { ...EMPTY, ...initialData, observacoes: initialData.observacoes ?? '' }
          : {
              ...EMPTY,
              tipo: defaultTipo ?? EMPTY.tipo,
              dataVencimento: defaultDate ?? EMPTY.dataVencimento,
              mesInicio: defaultMonthKey ?? EMPTY.mesInicio,
            }
      );
      setTimeout(() => firstFieldRef.current?.focus(), 0);
    }
  }, [open, initialData, defaultTipo, defaultDate, defaultMonthKey]);

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
    } else if (initialData.origemRecorrenciaId) {
      const escolha = await confirmChoice(
        'Este lançamento foi gerado por uma recorrência. O que você quer excluir?',
        [
          { value: 'only', label: 'Excluir apenas este mês', tone: 'danger' },
          { value: 'future', label: 'Excluir este e os próximos gerados', tone: 'danger' },
          { value: 'all', label: 'Excluir todos os gerados e encerrar a recorrência', tone: 'danger' },
          { value: 'cancel', label: 'Cancelar', tone: 'neutral' },
        ]
      );
      if (escolha === 'only') onDelete(initialData, {});
      else if (escolha === 'future') onDelete(initialData, { futureRecorrencia: true });
      else if (escolha === 'all') onDelete(initialData, { allRecorrencia: true });
    } else if (await confirm('Excluir este lançamento?')) {
      onDelete(initialData, {});
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const valor = Number(form.valor);
    const dataVencimento = form.dataVencimento || getTodayISODate();
    if (isNew && form.modo === 'recorrente') {
      await onSave({
        recorrente: true,
        tipo: form.tipo,
        descricao: form.descricao,
        valor,
        diaVencimento: Number(form.diaVencimento),
        mesInicio: form.mesInicio,
        observacoes: form.observacoes || null,
        categoriaId: form.categoriaId || null,
      });
    } else if (isNew && form.modo === 'simulacao') {
      await onSave({
        simulacao: true,
        tipo: 'despesa',
        descricao: form.descricao,
        valorTotal: valor,
        entrada: Math.max(0, Number(form.entrada) || 0),
        numParcelas: Number(form.numParcelas),
        dataVencimento,
        observacoes: form.observacoes || null,
        categoriaId: form.categoriaId || null,
      });
    } else if (isNew && form.modo === 'parcelado') {
      await onSave({
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
      await onSave({
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
        className="max-h-[92vh] overflow-y-auto bg-white dark:bg-ink-700 w-full sm:max-w-lg rounded-t-card sm:rounded-card p-5 sm:p-6 shadow-pop"
      >
        <div className="w-10 h-1.5 rounded-pill bg-ink-100 dark:bg-ink-900 mx-auto mb-4 sm:hidden" />

        <h2 className="font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-4">
          {copyMode ? 'Duplicar lançamento' : isNew ? 'Novo lançamento' : 'Editar lançamento'}
        </h2>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => handleTipoChange('despesa')}
            aria-pressed={form.tipo === 'despesa'}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
              form.tipo === 'despesa' ? 'bg-ledger-500 text-white' : 'bg-ink-50 dark:bg-ink-900 text-ink-500'
            }`}
          >
            Despesa
          </button>
          <button
            type="button"
            onClick={() => handleTipoChange('receita')}
            aria-pressed={form.tipo === 'receita'}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
              form.tipo === 'receita' ? 'bg-ledger-500 text-white' : 'bg-ink-50 dark:bg-ink-900 text-ink-500'
            }`}
          >
            Receita
          </button>
        </div>

        {isNew && (
          <div className="flex gap-1 mb-4 bg-ink-50 dark:bg-ink-900 rounded-pill p-1">
            {modosDisponiveis.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  if (opt.key === 'simulacao') handleTipoChange('despesa');
                  update('modo', opt.key);
                }}
                className={`flex-1 rounded-pill py-1.5 text-xs font-medium transition-colors ${
                  form.modo === opt.key ? 'bg-white dark:bg-ledger-500 shadow-card text-ink-900 dark:text-white' : 'text-ink-500 dark:text-ink-100'
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
              {isNew && ['parcelado', 'simulacao'].includes(form.modo) ? 'Valor total' : 'Valor'}
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
                className="[color-scheme:light] dark:[color-scheme:dark] w-full bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-50 rounded-xl border border-ink-100 dark:border-ink-700 px-3.5 py-2.5 text-sm focus:border-ledger-500 transition-colors"
              />
            )}
          </div>
        </div>

        {isNew && form.modo === 'recorrente' && (
          <div className="mb-3">
            <label className="block text-xs font-medium text-ink-300 mb-1">A partir de</label>
            <input
              required
              type="month"
              value={form.mesInicio}
              onChange={(e) => update('mesInicio', e.target.value)}
              className="[color-scheme:light] dark:[color-scheme:dark] w-full bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-50 rounded-xl border border-ink-100 dark:border-ink-700 px-3.5 py-2.5 text-sm focus:border-ledger-500 transition-colors"
            />
          </div>
        )}

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
                  <span className="font-medium text-ink-700 dark:text-ink-50">
                    {formatCurrency(Number(form.valor) / Number(form.numParcelas))}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}

        {isNew && form.modo === 'simulacao' && (
          <div className="mb-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 dark:border-ink-900 dark:bg-ink-900">
            <p className="flex items-center gap-2 text-sm font-medium text-indigo-700 dark:text-indigo-200">
              <ShoppingCart size={16} /> Simulação da compra
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-xs text-ink-300">
                Entrada
                <input type="number" min="0" max={Number(form.valor) || undefined} step="0.01" value={form.entrada} onChange={(e) => update('entrada', e.target.value)} className="money mt-1 w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-700" />
              </label>
              <label className="text-xs text-ink-300">
                Parcelas
                <input type="number" min="1" max="60" value={form.numParcelas} onChange={(e) => update('numParcelas', e.target.value)} className="mt-1 w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-700" />
              </label>
            </div>
            {Number(form.valor) > 0 && (() => {
              const financiado = Math.max(0, Number(form.valor) - Math.min(Number(form.valor), Number(form.entrada) || 0));
              const parcelas = Math.max(1, Number(form.numParcelas) || 1);
              const opcoes = [...new Set([Math.max(1, parcelas - 2), parcelas, parcelas + 2])];
              return (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {opcoes.map((quantidade) => (
                    <button
                      key={quantidade}
                      type="button"
                      onClick={() => update('numParcelas', String(quantidade))}
                      className={`rounded-xl border px-2 py-2 text-center ${quantidade === parcelas ? 'border-ledger-500 bg-white dark:bg-ink-700' : 'border-ink-100 dark:border-ink-700'}`}
                    >
                      <span className="block text-xs font-medium">{quantidade}x</span>
                      <span className="money mt-0.5 block text-[11px] text-ink-300">{formatCurrency(financiado / quantidade)}</span>
                    </button>
                  ))}
                </div>
              );
            })()}
            <p className="mt-2 text-[11px] text-ink-300">Ao salvar, a entrada será lançada agora e o restante será criado nas parcelas escolhidas.</p>
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
            disabled={saving}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium text-ink-500 hover:bg-ink-50 dark:hover:bg-ink-900"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-ledger-500 text-white py-2.5 text-sm font-medium hover:bg-ledger-600 hover:shadow-card-hover transition-all disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>

        {!isNew && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onDuplicate(initialData)} className="rounded-xl py-2 text-xs font-medium text-ledger-600 hover:bg-ledger-50">
              Duplicar lançamento
            </button>
            <button type="button" onClick={handleDeleteClick} className="rounded-xl py-2 text-xs font-medium text-signal-500 hover:bg-signal-50 transition-colors">
              Excluir lançamento
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
