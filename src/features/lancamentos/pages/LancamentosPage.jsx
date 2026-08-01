import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowUpCircle, ArrowDownCircle, Wallet, Receipt } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { repositories } from '../../../repositories/index.js';
import { useConfirm, useConfirmChoice } from '../../../contexts/ConfirmContext.jsx';
import { usePremium } from '../../../contexts/PremiumContext.jsx';
import { FEATURES, getOldestAllowedMonthKey } from '../../../config/premium.js';
import UsageIndicator from '../../premium/components/UsageIndicator.jsx';
import { getTodayISODate } from '../../../utils/formatDate.js';
import { getCurrentMonthKey, shiftMonthKey, daysInMonth } from '../../../utils/monthKey.js';
import { getRangeForPeriod, monthKeysInRange, formatPeriodLabel } from '../../../utils/periodRange.js';
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

export default function LancamentosPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const uid = user?.uid;
  const confirm = useConfirm();
  const confirmChoice = useConfirmChoice();
  const { guardFeature, isPremium, openPaywall, getLimit } = usePremium();
  const [tab, setTab] = useState('despesa');
  const [periodType, setPeriodType] = useState('mes');
  const [anchor, setAnchor] = useState(getTodayISODate());
  const [customRange, setCustomRange] = useState({ de: '', ate: '' });

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
  const [carregado, setCarregado] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

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
    return lancamentosDoTipo.filter(matcher);
  }, [lancamentosDoTipo, busca, categoriasById]);

  useEffect(() => {
    setSelectedIds(new Set());
    setSelecting(false);
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
    const { recorrente, parcelado, simulacao, ...rest } = data;
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
      if (rest.categoriaId && rest.categoriaId !== editing.categoriaId) {
        const createRule = await confirm(`Criar uma regra para categorizar descrições contendo “${rest.descricao}” desta mesma forma nas próximas vezes?`);
        if (createRule) {
          await repositories.regrasCategorizacao.create(uid, {
            termo: rest.descricao.trim(),
            tipo: rest.tipo,
            categoriaId: rest.categoriaId,
            prioridade: 0,
          });
        }
      }
    } else {
      await repositories.lancamentos.create(uid, rest);
    }
    setModalOpen(false);
    setDuplicating(false);
    reload();
  }

  async function handleDeleteLancamento(item, { futureInstallments = false, futureRecorrencia = false, allRecorrencia = false } = {}) {
    if (futureInstallments && item.parcelamentoId && item.totalParcelas) {
      const ids = [];
      for (let n = item.parcelaAtual; n <= item.totalParcelas; n++) {
        ids.push(`${item.parcelamentoId}_${n}`);
      }
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
    reload();
  }

  async function handleDeleteEmMassa() {
    const label = formatPeriodLabel(periodType, anchor, customRange);
    const tipoLabel = tab === 'despesa' ? 'despesas' : 'receitas';
    if (!(await confirm(`Excluir ${lancamentosDoTipo.length} ${tipoLabel} de "${label}"? Essa ação não pode ser desfeita.`))) return;
    await repositories.lancamentos.removeByIds(uid, lancamentosDoTipo.map((l) => l.id));
    reload();
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
    const byId = Object.fromEntries(lancamentos.map((item) => [item.id, item]));
    const updates = Object.fromEntries([...selectedIds].map((id) => {
      const nextValue = action === 'observacoes'
        ? [byId[id]?.observacoes, value].filter(Boolean).join('\n')
        : value || null;
      return [id, { [action]: nextValue }];
    }));
    await repositories.lancamentos.updateEmMassa(uid, updates);
    setBulkModalOpen(false);
    setSelectedIds(new Set());
    setSelecting(false);
    reload();
  }

  async function deleteSelected() {
    if (!await confirm(`Excluir ${selectedIds.size} lançamento(s) selecionado(s)?`)) return;
    await repositories.lancamentos.removeByIds(uid, [...selectedIds]);
    setSelectedIds(new Set());
    setSelecting(false);
    reload();
  }

  async function handleStatusChange(id, status) {
    await repositories.lancamentos.setStatus(uid, id, status);
    reload();
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

        <LancamentosSearch busca={busca} onChange={setBusca} />
        <LancamentosActions
          filteredCount={lancamentosFiltrados.length}
          totalCount={lancamentosDoTipo.length}
          onDeleteAll={handleDeleteEmMassa}
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
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-card bg-white p-3 shadow-card dark:bg-ink-700">
            <button type="button" onClick={() => setSelectedIds(new Set(lancamentosFiltrados.map((item) => item.id)))} className="text-xs font-medium text-ledger-600">Selecionar todos</button>
            <span className="flex-1 text-center text-xs text-ink-300">{selectedIds.size} selecionado(s)</span>
            <button type="button" disabled={!selectedIds.size} onClick={exportSelected} className="text-xs text-ink-500 disabled:opacity-40">Exportar</button>
            <button type="button" disabled={!selectedIds.size} onClick={() => setBulkModalOpen(true)} className="rounded-pill bg-ledger-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40">Editar</button>
            <button type="button" disabled={!selectedIds.size} onClick={deleteSelected} className="text-xs text-signal-500 disabled:opacity-40">Excluir</button>
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
      />
    </>
  );
}
