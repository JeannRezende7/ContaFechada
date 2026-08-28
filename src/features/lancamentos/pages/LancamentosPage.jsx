import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Receipt, CheckSquare, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { repositories } from '../../../repositories/index.js';
import { useConfirm, useConfirmChoice } from '../../../contexts/ConfirmContext.jsx';
import { usePremium } from '../../../contexts/PremiumContext.jsx';
import { FEATURES } from '../../../config/premium.js';
import { getTodayISODate, isSaneISODate } from '../../../utils/formatDate.js';
import { getCurrentMonthKey } from '../../../utils/monthKey.js';
import { PERIOD_TYPES, getRangeForPeriod, monthKeysInRange, formatPeriodLabel } from '../../../utils/periodRange.js';
import { buildLancamentoMatcher } from '../utils/searchLancamentos.js';
import { buildCsv, downloadCsv } from '../../../utils/exportCsv.js';
import LancamentoModal from '../components/LancamentoModal.jsx';
import RecorrenciaModal from '../components/RecorrenciaModal.jsx';
import ImportarExtratoModal from '../components/ImportarExtratoModal.jsx';
import AcoesEmMassaModal from '../components/AcoesEmMassaModal.jsx';
import {
  ActiveRecurrences,
  LancamentosActions,
  LancamentosList,
  LancamentosFilters,
  LancamentosSearch,
  LancamentoTabs,
} from '../components/LancamentosSections.jsx';
import PeriodNav from '../../../components/ui/PeriodNav.jsx';
import FinancialTotalsGrid from '../../../components/ui/FinancialTotalsGrid.jsx';
import LoadingScreen from '../../../components/ui/LoadingScreen.jsx';
import Topbar from '../../../components/layout/Topbar.jsx';

// A importação de fatura em PDF foi desativada (docs/ROADMAP_MONETIZACAO.txt,
// item 2) — o componente, o parser e o pdf.worker continuam no repositório
// para retomada futura, só não são mais referenciados por nenhuma página, o
// que já basta para o Rollup excluí-los do build de produção.

const PERIOD_SESSION_KEY = 'contafechada:lancamentos-period';
const VALID_PERIOD_TYPES = new Set(PERIOD_TYPES.map((item) => item.key));

function readPeriodSession() {
  const fallback = {
    periodType: 'mes',
    anchor: getTodayISODate(),
    customRange: { de: '', ate: '' },
  };

  try {
    const stored = JSON.parse(sessionStorage.getItem(PERIOD_SESSION_KEY));
    if (!stored || !VALID_PERIOD_TYPES.has(stored.periodType) || !isSaneISODate(stored.anchor) || !stored.anchor) {
      return fallback;
    }
    return {
      periodType: stored.periodType,
      anchor: stored.anchor,
      customRange: {
        de: isSaneISODate(stored.customRange?.de) ? stored.customRange?.de ?? '' : '',
        ate: isSaneISODate(stored.customRange?.ate) ? stored.customRange?.ate ?? '' : '',
      },
    };
  } catch {
    return fallback;
  }
}

export default function LancamentosPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const uid = user?.uid;
  const confirm = useConfirm();
  const confirmChoice = useConfirmChoice();
  const { guardFeature } = usePremium();
  const initialPeriod = useMemo(readPeriodSession, []);
  const [tab, setTab] = useState('despesa');
  const [periodType, setPeriodType] = useState(initialPeriod.periodType);
  const [anchor, setAnchor] = useState(initialPeriod.anchor);
  const [customRange, setCustomRange] = useState(initialPeriod.customRange);

  useEffect(() => {
    try {
      sessionStorage.setItem(PERIOD_SESSION_KEY, JSON.stringify({ periodType, anchor, customRange }));
    } catch {
      // A tela continua funcional quando o armazenamento do navegador estiver indisponível.
    }
  }, [periodType, anchor, customRange]);

  function tryChangeAnchor(nextAnchor) {
    setAnchor(nextAnchor);
  }

  function tryChangeCustomRange(next) {
    setCustomRange(next);
  }
  const [lancamentos, setLancamentos] = useState([]);
  const [recorrencias, setRecorrencias] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [duplicating, setDuplicating] = useState(false);
  const [recorrenciaModalOpen, setRecorrenciaModalOpen] = useState(false);
  const [editingRecorrencia, setEditingRecorrencia] = useState(null);
  const [busca, setBusca] = useState(() => searchParams.get('q') || '');
  const [quickFilter, setQuickFilter] = useState('todos');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [carregado, setCarregado] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  const { gte, lte } = getRangeForPeriod(periodType, anchor, customRange);

  // Novo lançamento nasce no mês que o usuário está navegando. No mês atual,
  // preserva hoje; em outro mês, começa pelo primeiro dia.
  const defaultMonthKeyForNovo = periodType === 'mes' ? anchor.slice(0, 7) : getCurrentMonthKey();
  const defaultDateForNovo =
    defaultMonthKeyForNovo === getCurrentMonthKey()
      ? getTodayISODate()
      : `${defaultMonthKeyForNovo}-01`;

  const reload = useCallback(async () => {
    if (!uid) return;
    const meses = monthKeysInRange(gte, lte);

    // listLancamentosByRange doesn't depend on recorrencias, so fire it in
    // true parallel instead of waiting on recurrence generation first —
    // that only matters on the rare visit where a recorrência's instance for
    // this month hasn't been generated yet (first visit of the month), in
    // which case we re-fetch once more below.
    const [todasRecorrencias, items] = await Promise.all([
      repositories.recorrencias.list(uid),
      repositories.lancamentos.listByRange(uid, gte, lte),
    ]);
    const gerouAlgo = await repositories.recorrencias.ensureGeneratedForMonths(uid, meses, todasRecorrencias);

    setLancamentos(gerouAlgo ? await repositories.lancamentos.listByRange(uid, gte, lte) : items);
    setRecorrencias(todasRecorrencias);
    setCarregado(true);
  }, [uid, gte, lte]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(''), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Categorias don't depend on the selected period — loaded once per user.
  useEffect(() => {
    if (!uid) return;
    repositories.categorias.ensureDefaults(uid).then(setCategorias);
  }, [uid]);

  const categoriasById = useMemo(
    () => Object.fromEntries(categorias.map((c) => [c.id, c])),
    [categorias]
  );

  const lancamentosDoTipo = useMemo(
    () => lancamentos.filter((l) => l.tipo === tab),
    [lancamentos, tab]
  );

  const lancamentosFiltrados = useMemo(() => {
    const matcher = buildLancamentoMatcher(busca, categoriasById);
    return lancamentosDoTipo.filter((item) => {
      if (!matcher(item)) return false;
      if (categoryFilter && item.categoriaId !== categoryFilter) return false;
      if (quickFilter === 'pendente' && item.status !== 'pendente') return false;
      if (quickFilter === 'atrasado' && item.status !== 'atrasado') return false;
      if (quickFilter === 'concluido' && item.status !== (tab === 'receita' ? 'recebido' : 'pago')) return false;
      if (quickFilter === 'sem_categoria' && item.categoriaId) return false;
      return true;
    }).sort((a, b) => b.dataVencimento.localeCompare(a.dataVencimento));
  }, [lancamentosDoTipo, busca, categoriasById, categoryFilter, quickFilter, tab]);

  const categoriasDoTipo = useMemo(
    () => categorias.filter((categoria) => categoria.tipo === tab),
    [categorias, tab]
  );

  useEffect(() => {
    setSelectedIds(new Set());
    setSelecting(false);
    setQuickFilter('todos');
    setCategoryFilter('');
  }, [tab, gte, lte]);

  // Totals reflect the whole period regardless of the despesa/receita tab —
  // the tab only filters which rows are listed below.
  const totais = useMemo(() => {
    let receita = 0;
    let despesa = 0;
    for (const l of lancamentos) {
      const valor = Number(l.valor) || 0;
      if (l.tipo === 'receita') receita += valor;
      else despesa += valor;
    }
    return { receita, despesa, saldo: receita - despesa };
  }, [lancamentos]);

  // Keyboard shortcut for quick entry: press "n".
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'n' && !modalOpen && document.activeElement.tagName !== 'INPUT') {
        setEditing(null);
        setDuplicating(false);
        setModalOpen(true);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [modalOpen]);

  async function handleSave(data) {
    setSaving(true);
    setFeedback('');
    const { recorrente, parcelado, simulacao, ...rest } = data;
    try {
      if (recorrente) {
        await repositories.recorrencias.create(uid, rest);
      } else if (simulacao) {
      const total = Math.max(0, Number(rest.valorTotal) || 0);
      const entrada = Math.min(total, Math.max(0, Number(rest.entrada) || 0));
      if (entrada > 0) {
        await repositories.lancamentos.create(uid, {
          tipo: 'despesa',
          descricao: rest.descricao?.trim() ? `${rest.descricao.trim()} (entrada)` : 'Entrada',
          valor: entrada,
          dataVencimento: rest.dataVencimento,
          dataPagamento: rest.dataVencimento,
          status: 'pago',
          observacoes: rest.observacoes || 'Criado pelo simulador de compra.',
          categoriaId: rest.categoriaId,
        });
      }
      if (total - entrada > 0) {
        await repositories.lancamentos.createParcelamento(uid, {
          tipo: 'despesa',
          descricao: rest.descricao,
          valorTotal: total - entrada,
          numParcelas: Math.max(1, Number(rest.numParcelas) || 1),
          dataVencimento: rest.dataVencimento,
          observacoes: rest.observacoes || 'Criado pelo simulador de compra.',
          categoriaId: rest.categoriaId,
        });
      }
      } else if (parcelado) {
        await repositories.lancamentos.createParcelamento(uid, rest);
      } else if (editing && !duplicating) {
        await repositories.lancamentos.update(uid, editing.id, rest);
      } else {
        await repositories.lancamentos.create(uid, rest);
      }
      setModalOpen(false);
      setDuplicating(false);
      await reload();
      setFeedback(editing && !duplicating ? 'Lançamento atualizado.' : 'Lançamento criado.');
    } catch {
      setFeedback('Não foi possível salvar o lançamento. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteLancamento(item, { futureInstallments = false, futureRecorrencia = false, allRecorrencia = false } = {}) {
    setSaving(true);
    try {
      if (futureInstallments && item.parcelamentoId && item.totalParcelas) {
        const ids = [];
        for (let n = item.parcelaAtual; n <= item.totalParcelas; n++) ids.push(`${item.parcelamentoId}_${n}`);
        await repositories.lancamentos.removeByIds(uid, ids);
      } else if ((futureRecorrencia || allRecorrencia) && item.origemRecorrenciaId) {
        await repositories.lancamentos.removeGeneratedFromRecorrencia(
          uid,
          item.origemRecorrenciaId,
          futureRecorrencia ? { fromMonthKey: item.mesReferencia } : {}
        );
        if (allRecorrencia) await repositories.recorrencias.remove(uid, item.origemRecorrenciaId);
      } else {
        await repositories.lancamentos.remove(uid, item.id);
      }
      setModalOpen(false);
      await reload();
      setFeedback('Lançamento(s) excluído(s).');
    } catch {
      setFeedback('Não foi possível excluir o lançamento. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleExportCsv() {
    const label = formatPeriodLabel(periodType, anchor, customRange);
    await exportItems(lancamentosFiltrados, label);
  }

  async function exportItems(items, label) {
    const csv = buildCsv(items, [
      { label: 'Data', value: (l) => l.dataVencimento },
      { label: 'Descrição', value: (l) => l.descricao },
      { label: 'Categoria', value: (l) => categoriasById[l.categoriaId]?.nome ?? '' },
      { label: 'Valor', value: (l) => Number(l.valor).toFixed(2).replace('.', ',') },
      { label: 'Status', value: (l) => l.status },
      { label: 'Observações', value: (l) => l.observacoes ?? '' },
    ]);
    try {
      await downloadCsv(`lancamentos-${tab}-${label.replace(/\s+/g, '-')}.csv`, csv);
      setFeedback('Arquivo de lançamentos preparado para exportação.');
    } catch {
      setFeedback('Não foi possível exportar os lançamentos. Tente novamente.');
    }
  }

  function toggleSelected(id) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function applyBulk(changes) {
    const count = selectedIds.size;
    setSaving(true);
    setFeedback('');
    const updates = Object.fromEntries([...selectedIds].map((id) => {
      const next = Object.fromEntries(Object.entries(changes).map(([field, nextValue]) => [
        field,
        nextValue === '' ? null : nextValue,
      ]));
      return [id, next];
    }));
    try {
      await repositories.lancamentos.updateEmMassa(uid, updates);
      setBulkModalOpen(false);
      setSelectedIds(new Set());
      setSelecting(false);
      await reload();
      setFeedback(`${count} lançamento(s) atualizado(s).`);
    } catch {
      setFeedback('Não foi possível atualizar os lançamentos. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteSelected() {
    if (!await confirm(`Excluir ${selectedIds.size} lançamento(s) selecionado(s)?`)) return;
    const count = selectedIds.size;
    setSaving(true);
    try {
      await repositories.lancamentos.removeByIds(uid, [...selectedIds]);
      setSelectedIds(new Set());
      setSelecting(false);
      await reload();
      setFeedback(`${count} lançamento(s) excluído(s).`);
    } catch {
      setFeedback('Não foi possível excluir os lançamentos. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id, status) {
    setSaving(true);
    try {
      await repositories.lancamentos.setStatus(uid, id, status);
      await reload();
      setFeedback('Status atualizado.');
    } catch {
      setFeedback('Não foi possível atualizar o status. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRecorrencia(id, data, { updateGeneratedFromMonth = null } = {}) {
    await repositories.recorrencias.update(uid, id, data);
    if (updateGeneratedFromMonth) {
      await repositories.lancamentos.updateGeneratedFromRecorrencia(uid, id, data, updateGeneratedFromMonth);
    }
    setRecorrenciaModalOpen(false);
    reload();
  }

  async function handleDeleteRecorrencia(id, { deleteGerados = false } = {}) {
    if (deleteGerados) await repositories.lancamentos.removeGeneratedFromRecorrencia(uid, id);
    await repositories.recorrencias.remove(uid, id);
    setRecorrenciaModalOpen(false);
    reload();
  }

  async function handleEncerrarRecorrenciaInline(r) {
    const escolha = await confirmChoice(
      `Encerrar a recorrência "${r.descricao}"?`,
      [
        { value: 'keep', label: 'Encerrar e manter os já gerados', tone: 'primary' },
        { value: 'delete', label: 'Encerrar e excluir os já gerados', tone: 'danger' },
        { value: 'cancel', label: 'Cancelar', tone: 'neutral' },
      ]
    );
    if (escolha === 'keep') handleDeleteRecorrencia(r.id);
    else if (escolha === 'delete') handleDeleteRecorrencia(r.id, { deleteGerados: true });
  }

  const ativos = recorrencias.filter((r) => r.ativo && r.tipo === tab);

  if (!carregado) {
    return (
      <>
        <Topbar title="Lançamentos" icon={Receipt} />
        <LoadingScreen />
      </>
    );
  }

  return (
    <>
      <Topbar title="Lançamentos" icon={Receipt} />
      <div className="mx-auto max-w-4xl p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-8">
        <LancamentoTabs tab={tab} onChange={setTab} />

        <PeriodNav
          periodType={periodType}
          anchor={anchor}
          customRange={customRange}
          onChangePeriodType={(next) => {
            setPeriodType(next);
            const today = getTodayISODate();
            setAnchor(today);
            if (next === 'periodo') setCustomRange({ de: today, ate: today });
          }}
          onChangeAnchor={tryChangeAnchor}
          onChangeCustomRange={tryChangeCustomRange}
        />

        <FinancialTotalsGrid
          className="mb-4"
          incomeLabel="Receitas"
          incomeValue={totais.receita}
          expenseLabel="Despesas"
          expenseValue={totais.despesa}
          balanceLabel="Saldo"
          balanceValue={totais.saldo}
        />

        <LancamentosSearch
          busca={busca}
          onChange={setBusca}
          filtersOpen={filtersOpen}
          filtersActive={Boolean(categoryFilter || quickFilter !== 'todos')}
          onToggleFilters={() => setFiltersOpen((current) => !current)}
        />
        <LancamentosFilters
          open={filtersOpen}
          quickFilter={quickFilter}
          categoryFilter={categoryFilter}
          categorias={categoriasDoTipo}
          onQuickChange={(filter) => {
            setQuickFilter(filter);
            if (filter === 'sem_categoria') setCategoryFilter('');
          }}
          onCategoryChange={(categoriaId) => {
            setCategoryFilter(categoriaId);
            if (categoriaId && quickFilter === 'sem_categoria') setQuickFilter('todos');
          }}
          onClear={() => {
            setQuickFilter('todos');
            setCategoryFilter('');
          }}
        />
        {feedback && (
          <p role="status" aria-live="polite" className={`mb-3 rounded-xl px-3 py-2 text-sm ${feedback.startsWith('Não foi') ? 'bg-signal-50 text-signal-500' : 'bg-ledger-50 text-ledger-600'}`}>
            {feedback}
          </p>
        )}
        <LancamentosActions
          filteredCount={lancamentosFiltrados.length}
          totalCount={lancamentosDoTipo.length}
          onExport={handleExportCsv}
          onImport={() => {
            if (!guardFeature(FEATURES.IMPORTACAO_EXTRATO)) return;
            setImportModalOpen(true);
          }}
          selecting={selecting}
          onToggleSelecting={() => {
            setSelecting((current) => !current);
            setSelectedIds(new Set());
          }}
          onNew={() => {
            setEditing(null);
            setDuplicating(false);
            setModalOpen(true);
          }}
        />
        {selecting && (
          <div className="mb-3 overflow-hidden rounded-2xl border border-ledger-500/25 bg-gradient-to-br from-white to-ledger-50/50 shadow-card dark:border-ledger-500/20 dark:from-ink-700 dark:to-ink-900/70">
            <div className="flex items-center justify-between gap-3 px-3.5 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ledger-50 text-ledger-600 dark:bg-ledger-500/15 dark:text-ledger-500">
                  <CheckSquare size={16} strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink-700 dark:text-ink-50">Seleção em massa</p>
                  <p className="truncate text-[11px] text-ink-300">{selectedIds.size ? 'Escolha uma ação' : 'Toque nos itens abaixo para selecionar'}</p>
                </div>
              </div>
              <span className={`shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-semibold ${selectedIds.size ? 'bg-ledger-500 text-white' : 'bg-ink-50 text-ink-300 dark:bg-ink-700'}`}>
                {selectedIds.size} {selectedIds.size === 1 ? 'selecionado' : 'selecionados'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-ink-100/80 px-3.5 py-2.5 dark:border-ink-700">
              <button
                type="button"
                onClick={() => setSelectedIds(selectedIds.size > 0 && selectedIds.size === lancamentosFiltrados.length ? new Set() : new Set(lancamentosFiltrados.map((item) => item.id)))}
                className="rounded-pill px-2 py-1.5 text-xs font-medium text-ledger-600 transition-colors hover:bg-ledger-50 dark:hover:bg-ledger-500/10"
              >
                {selectedIds.size > 0 && selectedIds.size === lancamentosFiltrados.length ? 'Desmarcar todos' : 'Marcar todos'}
              </button>
              <div className="flex items-center gap-1.5">
                <button type="button" disabled={saving || !selectedIds.size} onClick={() => setBulkModalOpen(true)} className="flex items-center gap-1.5 rounded-pill bg-ledger-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-ledger-600 disabled:shadow-none disabled:opacity-35"><Pencil size={12} />Editar</button>
                <button type="button" disabled={saving || !selectedIds.size} onClick={deleteSelected} aria-label="Excluir selecionados" className="flex h-7 w-7 items-center justify-center rounded-full text-signal-500 transition-colors hover:bg-signal-50 disabled:opacity-30"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        )}
        <LancamentosList
          items={lancamentosFiltrados}
          totalCount={lancamentosDoTipo.length}
          busca={busca}
          categoriasById={categoriasById}
          onStatusChange={handleStatusChange}
          onSelect={(item) => {
            setEditing(item);
            setModalOpen(true);
          }}
          onNew={() => {
            setEditing(null);
            setDuplicating(false);
            setModalOpen(true);
          }}
          selecting={selecting}
          selectedIds={selectedIds}
          onToggle={toggleSelected}
          filtersActive={Boolean(busca || categoryFilter || quickFilter !== 'todos')}
        />


        <ActiveRecurrences
          items={ativos}
          onSelect={(item) => {
            setEditingRecorrencia(item);
            setRecorrenciaModalOpen(true);
          }}
          onEnd={handleEncerrarRecorrenciaInline}
        />
      </div>

      <LancamentoModal
        open={modalOpen}
        initialData={editing}
        categorias={categorias}
        defaultTipo={tab}
        defaultDate={defaultDateForNovo}
        defaultMonthKey={defaultMonthKeyForNovo}
        onClose={() => {
          setModalOpen(false);
          setDuplicating(false);
        }}
        onSave={handleSave}
        saving={saving}
        onDelete={handleDeleteLancamento}
        copyMode={duplicating}
        onDuplicate={(item) => {
          const copy = {
            ...item,
            descricao: item.descricao?.trim() ? `${item.descricao.trim()} (cópia)` : '',
            origemRecorrenciaId: null,
            parcelamentoId: null,
            parcelaAtual: null,
            totalParcelas: null,
          };
          setEditing(copy);
          setDuplicating(true);
        }}
      />

      <RecorrenciaModal
        open={recorrenciaModalOpen}
        recorrencia={editingRecorrencia}
        categorias={categorias}
        onClose={() => setRecorrenciaModalOpen(false)}
        onSave={handleSaveRecorrencia}
        onDelete={handleDeleteRecorrencia}
      />
      <ImportarExtratoModal
        open={importModalOpen}
        uid={uid}
        categorias={categorias}
        onClose={() => setImportModalOpen(false)}
        onImported={reload}
      />
      <AcoesEmMassaModal
        open={bulkModalOpen}
        count={selectedIds.size}
        tipo={tab}
        categorias={categorias}
        onClose={() => setBulkModalOpen(false)}
        onApply={applyBulk}
        applying={saving}
      />
    </>
  );
}
