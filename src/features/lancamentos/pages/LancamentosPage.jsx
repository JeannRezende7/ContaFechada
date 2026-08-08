import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowUpCircle, ArrowDownCircle, Wallet, Receipt } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { repositories } from '../../../repositories/index.js';
import { useConfirm, useConfirmChoice } from '../../../contexts/ConfirmContext.jsx';
import { usePremium } from '../../../contexts/PremiumContext.jsx';
import { FEATURES, getOldestAllowedMonthKey } from '../../../config/premium.js';
import UsageIndicator from '../../premium/components/UsageIndicator.jsx';
import { getTodayISODate, isSaneISODate } from '../../../utils/formatDate.js';
import { getCurrentMonthKey, shiftMonthKey, daysInMonth } from '../../../utils/monthKey.js';
import { PERIOD_TYPES, getRangeForPeriod, monthKeysInRange, formatPeriodLabel } from '../../../utils/periodRange.js';
import { buildLancamentoMatcher } from '../utils/searchLancamentos.js';
import { getStatusEfetivo } from '../utils/statusLancamento.js';
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
import IndicatorCard from '../../../components/ui/IndicatorCard.jsx';
import LoadingScreen from '../../../components/ui/LoadingScreen.jsx';
import Topbar from '../../../components/layout/Topbar.jsx';

// A importação de fatura em PDF foi desativada (ROADMAP_MONETIZACAO.txt,
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
  const { guardFeature, isPremium, openPaywall, getLimit } = usePremium();
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

  // Histórico (ROADMAP_MONETIZACAO.txt, Fase 6): free vê só o mês atual e os
  // 2 anteriores. `oldestAllowedDate` vira o piso mínimo de qualquer
  // navegação de período — funciona igual para dia/semana/mês/ano porque
  // comparamos direto a data inicial do intervalo resultante, sem precisar
  // de lógica separada por granularidade.
  const oldestAllowedMonthKey = getOldestAllowedMonthKey({
    isPremium,
    currentMonthKey: getCurrentMonthKey(),
    shiftMonthKey,
  });
  const oldestAllowedDate = oldestAllowedMonthKey ? `${oldestAllowedMonthKey}-01` : null;

  function tryChangeAnchor(nextAnchor) {
    if (oldestAllowedDate) {
      const { gte } = getRangeForPeriod(periodType, nextAnchor, customRange);
      if (gte < oldestAllowedDate) {
        openPaywall({ feature: FEATURES.HISTORICO, reason: 'limit_reached', limit: getLimit(FEATURES.HISTORICO) });
        return;
      }
    }
    setAnchor(nextAnchor);
  }

  // 'Período' (customRange) não passa pelo anchor — validamos direto a data
  // "De" contra o piso do histórico gratuito, sem travar edição do "Até".
  function tryChangeCustomRange(next) {
    if (oldestAllowedDate && next?.de && next.de < oldestAllowedDate) {
      openPaywall({ feature: FEATURES.HISTORICO, reason: 'limit_reached', limit: getLimit(FEATURES.HISTORICO) });
      return;
    }
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

  // Novo lançamento nasce no mês que o usuário está navegando, não sempre em
  // "hoje" — se ele está vendo agosto, o padrão é um dia de agosto (mesmo dia
  // do mês de hoje, ajustado para caber no mês), preservando "hoje" quando o
  // mês navegado é o mês corrente.
  const defaultMonthKeyForNovo = periodType === 'mes' ? anchor.slice(0, 7) : getCurrentMonthKey();
  const defaultDateForNovo =
    defaultMonthKeyForNovo === getCurrentMonthKey()
      ? getTodayISODate()
      : `${defaultMonthKeyForNovo}-${String(Math.min(Number(getTodayISODate().slice(8, 10)), daysInMonth(defaultMonthKeyForNovo))).padStart(2, '0')}`;

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
      const statusEfetivo = getStatusEfetivo(item);
      if (quickFilter === 'pendente' && statusEfetivo !== 'pendente') return false;
      if (quickFilter === 'atrasado' && statusEfetivo !== 'atrasado') return false;
      if (quickFilter === 'concluido' && statusEfetivo !== (tab === 'receita' ? 'recebido' : 'pago')) return false;
      if (quickFilter === 'sem_categoria' && item.categoriaId) return false;
      return true;
    });
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
        const ativasCount = recorrencias.filter((r) => r.ativo).length;
        if (!guardFeature(FEATURES.RECORRENCIAS, { count: ativasCount })) return;
        await repositories.recorrencias.create(uid, rest);
      } else if (simulacao) {
      const total = Math.max(0, Number(rest.valorTotal) || 0);
      const entrada = Math.min(total, Math.max(0, Number(rest.entrada) || 0));
      if (entrada > 0) {
        await repositories.lancamentos.create(uid, {
          tipo: 'despesa',
          descricao: `${rest.descricao} (entrada)`,
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

  function handleExportCsv() {
    // Exportação (Fase 6): grátis só exporta o mês atual — qualquer outro
    // período/granularidade (dia, semana, ano, período customizado, ou um
    // mês diferente do atual) é "exportação avançada".
    const isExportacaoDoMesAtual = periodType === 'mes' && anchor.slice(0, 7) === getCurrentMonthKey();
    if (!isExportacaoDoMesAtual && !guardFeature(FEATURES.EXPORTACAO_AVANCADA)) return;

    const label = formatPeriodLabel(periodType, anchor, customRange);
    exportItems(lancamentosFiltrados, label);
  }

  function exportItems(items, label) {
    const csv = buildCsv(items, [
      { label: 'Data', value: (l) => l.dataVencimento },
      { label: 'Descrição', value: (l) => l.descricao },
      { label: 'Categoria', value: (l) => categoriasById[l.categoriaId]?.nome ?? '' },
      { label: 'Valor', value: (l) => Number(l.valor).toFixed(2).replace('.', ',') },
      { label: 'Status', value: (l) => l.status },
      { label: 'Observações', value: (l) => l.observacoes ?? '' },
    ]);
    downloadCsv(`lancamentos-${tab}-${label.replace(/\s+/g, '-')}.csv`, csv);
  }

  function exportSelected() {
    const isExportacaoDoMesAtual = periodType === 'mes' && anchor.slice(0, 7) === getCurrentMonthKey();
    if (!isExportacaoDoMesAtual && !guardFeature(FEATURES.EXPORTACAO_AVANCADA)) return;
    exportItems(lancamentosFiltrados.filter((item) => selectedIds.has(item.id)), 'selecionados');
  }

  function toggleSelected(id) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function applyBulk(action, value) {
    const count = selectedIds.size;
    setSaving(true);
    setFeedback('');
    const byId = Object.fromEntries(lancamentos.map((item) => [item.id, item]));
    const updates = Object.fromEntries([...selectedIds].map((id) => {
      const nextValue = action === 'observacoes'
        ? [byId[id]?.observacoes, value].filter(Boolean).join('\n')
        : value || null;
      return [id, { [action]: nextValue }];
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

  async function setSelectedStatus(status) {
    if (!status) return;
    await applyBulk('status', status);
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
  const recorrenciasAtivasCount = recorrencias.filter((r) => r.ativo).length;

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
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <LancamentoTabs tab={tab} onChange={setTab} />

        <PeriodNav
          periodType={periodType}
          anchor={anchor}
          customRange={customRange}
          onChangePeriodType={(next) => {
            setPeriodType(next);
            setAnchor(getTodayISODate());
          }}
          onChangeAnchor={tryChangeAnchor}
          onChangeCustomRange={tryChangeCustomRange}
        />

        <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4">
          <IndicatorCard label="Receita" value={totais.receita} tone="positive" icon={ArrowUpCircle} />
          <IndicatorCard label="Despesa" value={totais.despesa} tone="negative" icon={ArrowDownCircle} />
          <IndicatorCard
            label="Saldo"
            value={totais.saldo}
            tone={totais.saldo < 0 ? 'negative' : 'positive'}
            icon={Wallet}
          />
        </div>

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
            if (!selecting && !guardFeature(FEATURES.ACOES_EM_MASSA)) return;
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
          <div className="mb-3 rounded-card bg-white p-3 shadow-card dark:bg-ink-700">
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={() => setSelectedIds(new Set(lancamentosFiltrados.map((item) => item.id)))} className="text-xs font-medium text-ledger-600">Marcar todos</button>
              <span className="text-xs text-ink-300">{selectedIds.size} selecionado(s)</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3 dark:border-ink-700">
              <button type="button" disabled={!selectedIds.size} onClick={exportSelected} className="rounded-pill px-2.5 py-1.5 text-xs text-ink-500 hover:bg-ink-50 disabled:opacity-40 dark:hover:bg-ink-900">Exportar</button>
              <select
                value=""
                disabled={saving || !selectedIds.size}
                onChange={(event) => setSelectedStatus(event.target.value)}
                aria-label="Alterar status dos selecionados"
                className="min-w-36 flex-1 rounded-pill border border-ink-100 bg-white px-3 py-1.5 text-xs text-ink-500 disabled:opacity-40 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
              >
                <option value="">Alterar status...</option>
                <option value="pendente">Pendente</option>
                <option value="agendado">Agendado</option>
                <option value={tab === 'receita' ? 'recebido' : 'pago'}>{tab === 'receita' ? 'Recebido' : 'Pago'}</option>
              </select>
              <button type="button" disabled={saving || !selectedIds.size} onClick={() => setBulkModalOpen(true)} className="rounded-pill bg-ledger-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40">Editar</button>
              <button type="button" disabled={saving || !selectedIds.size} onClick={deleteSelected} className="rounded-pill px-2.5 py-1.5 text-xs text-signal-500 hover:bg-signal-50 disabled:opacity-40">Excluir</button>
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

        <UsageIndicator feature={FEATURES.RECORRENCIAS} count={recorrenciasAtivasCount} label="recorrências ativas" />

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
            descricao: `${item.descricao} (cópia)`,
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
