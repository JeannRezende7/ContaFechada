import { useEffect, useMemo, useState, useCallback, lazy, Suspense } from 'react';
import { Plus, Sprout, Repeat, X, ArrowUpCircle, ArrowDownCircle, Wallet, FileUp, Trash2, Receipt } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import {
  listLancamentosByRange,
  createLancamento,
  updateLancamento,
  deleteLancamento,
  deleteLancamentosByIds,
  setLancamentoStatus,
  createParcelamento,
} from '../services/lancamentosService.js';
import {
  listRecorrencias,
  createRecorrencia,
  updateRecorrencia,
  deleteRecorrencia,
  ensureGeneratedForMonth,
} from '../../recorrencias/services/recorrenciasService.js';
import { listCategorias, ensureDefaultCategorias } from '../../categorias/services/categoriasService.js';
import { useConfirm } from '../../../contexts/ConfirmContext.jsx';
import { getTodayISODate } from '../../../utils/formatDate.js';
import { getRangeForPeriod, monthKeysInRange, formatPeriodLabel } from '../../../utils/periodRange.js';
import { formatCurrency } from '../../../utils/formatCurrency.js';
import LancamentoRow from '../components/LancamentoRow.jsx';
import LancamentoModal from '../components/LancamentoModal.jsx';
import RecorrenciaModal from '../components/RecorrenciaModal.jsx';
import PeriodNav from '../../../components/ui/PeriodNav.jsx';
import IndicatorCard from '../../../components/ui/IndicatorCard.jsx';
import Topbar from '../../../components/layout/Topbar.jsx';

// Pulls in pdfjs-dist (~500kB) — deferred so it's only fetched when the user
// actually opens the import flow, not on every visit to Lançamentos.
const ImportarFaturaModal = lazy(() => import('../components/ImportarFaturaModal.jsx'));

export default function LancamentosPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const confirm = useConfirm();
  const [tab, setTab] = useState('despesa');
  const [periodType, setPeriodType] = useState('mes');
  const [anchor, setAnchor] = useState(getTodayISODate());
  const [customRange, setCustomRange] = useState({ de: '', ate: '' });
  const [lancamentos, setLancamentos] = useState([]);
  const [recorrencias, setRecorrencias] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [recorrenciaModalOpen, setRecorrenciaModalOpen] = useState(false);
  const [editingRecorrencia, setEditingRecorrencia] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const { gte, lte } = getRangeForPeriod(periodType, anchor, customRange);

  const reload = useCallback(async () => {
    if (!uid) return;
    const meses = monthKeysInRange(gte, lte);
    await Promise.all(meses.map((mk) => ensureGeneratedForMonth(uid, mk)));
    const [items, todasRecorrencias] = await Promise.all([
      listLancamentosByRange(uid, gte, lte),
      listRecorrencias(uid),
    ]);
    setLancamentos(items);
    setRecorrencias(todasRecorrencias);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, gte, lte]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Categorias don't depend on the selected period — loaded once per user.
  useEffect(() => {
    if (!uid) return;
    (async () => {
      await ensureDefaultCategorias(uid);
      setCategorias(await listCategorias(uid));
    })();
  }, [uid]);

  const categoriasById = useMemo(
    () => Object.fromEntries(categorias.map((c) => [c.id, c])),
    [categorias]
  );

  const lancamentosDoTipo = useMemo(
    () => lancamentos.filter((l) => l.tipo === tab),
    [lancamentos, tab]
  );

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
        setModalOpen(true);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [modalOpen]);

  async function handleSave(data) {
    const { recorrente, parcelado, ...rest } = data;
    if (recorrente) {
      await createRecorrencia(uid, rest);
    } else if (parcelado) {
      await createParcelamento(uid, rest);
    } else if (editing) {
      await updateLancamento(uid, editing.id, rest);
    } else {
      await createLancamento(uid, rest);
    }
    setModalOpen(false);
    reload();
  }

  async function handleDeleteLancamento(id) {
    await deleteLancamento(uid, id);
    setModalOpen(false);
    reload();
  }

  async function handleDeleteEmMassa() {
    const label = formatPeriodLabel(periodType, anchor, customRange);
    const tipoLabel = tab === 'despesa' ? 'despesas' : 'receitas';
    if (!(await confirm(`Excluir ${lancamentosDoTipo.length} ${tipoLabel} de "${label}"? Essa ação não pode ser desfeita.`))) return;
    await deleteLancamentosByIds(uid, lancamentosDoTipo.map((l) => l.id));
    reload();
  }

  async function handleStatusChange(id, status) {
    await setLancamentoStatus(uid, id, status);
    reload();
  }

  async function handleSaveRecorrencia(id, data) {
    await updateRecorrencia(uid, id, data);
    setRecorrenciaModalOpen(false);
    reload();
  }

  async function handleDeleteRecorrencia(id) {
    await deleteRecorrencia(uid, id);
    setRecorrenciaModalOpen(false);
    reload();
  }

  const ativos = recorrencias.filter((r) => r.ativo && r.tipo === tab);

  return (
    <>
      <Topbar title="Lançamentos" icon={Receipt} />
      <div className="p-4 md:p-8 max-w-4xl">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('despesa')}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
              tab === 'despesa' ? 'bg-ink-900 text-white' : 'bg-ink-50 dark:bg-ink-900 text-ink-500'
            }`}
          >
            Despesas
          </button>
          <button
            onClick={() => setTab('receita')}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
              tab === 'receita' ? 'bg-ledger-500 text-white' : 'bg-ink-50 dark:bg-ink-900 text-ink-500'
            }`}
          >
            Renda
          </button>
        </div>

        <PeriodNav
          periodType={periodType}
          anchor={anchor}
          customRange={customRange}
          onChangePeriodType={(next) => {
            setPeriodType(next);
            setAnchor(getTodayISODate());
          }}
          onChangeAnchor={setAnchor}
          onChangeCustomRange={setCustomRange}
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

        <div className="flex justify-between items-center mb-4 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm text-ink-300 shrink-0">{lancamentosDoTipo.length} lançamento(s)</p>
            {lancamentosDoTipo.length > 0 && (
              <button
                onClick={handleDeleteEmMassa}
                aria-label="Excluir lançamentos deste período"
                className="text-ink-300 hover:text-signal-500 transition-colors shrink-0"
              >
                <Trash2 size={14} strokeWidth={2} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setImportModalOpen(true)}
              className="flex items-center gap-1.5 rounded-pill bg-ink-50 dark:bg-ink-900 text-ink-500 pl-3.5 pr-4 py-2.5 text-sm font-medium hover:bg-ink-100 transition-colors"
            >
              <FileUp size={16} strokeWidth={2.25} />
              <span className="hidden sm:inline">Importar PDF</span>
            </button>
            <button
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-pill bg-ledger-500 text-white pl-3.5 pr-4 py-2.5 text-sm font-medium hover:bg-ledger-600 hover:shadow-card-hover transition-all"
            >
              <Plus size={16} strokeWidth={2.25} />
              Novo <span className="hidden sm:inline text-ledger-200">(N)</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {lancamentosDoTipo.map((l) => (
            <LancamentoRow
              key={l.id}
              lancamento={l}
              categoria={categoriasById[l.categoriaId]}
              onStatusChange={handleStatusChange}
              onClick={(item) => {
                setEditing(item);
                setModalOpen(true);
              }}
            />
          ))}
          {lancamentosDoTipo.length === 0 && (
            <div className="flex flex-col items-center gap-3 text-center py-14 px-4">
              <span className="w-12 h-12 rounded-full bg-ledger-50 text-ledger-500 flex items-center justify-center">
                <Sprout size={22} strokeWidth={1.75} />
              </span>
              <p className="text-sm text-ink-300 max-w-[220px]">
                Nenhum lançamento neste período ainda. Que tal começar cadastrando um?
              </p>
              <button
                onClick={() => {
                  setEditing(null);
                  setModalOpen(true);
                }}
                className="text-sm font-medium text-ledger-600 hover:underline"
              >
                + Novo lançamento
              </button>
            </div>
          )}
        </div>

        {ativos.length > 0 && (
          <details className="mt-8 group">
            <summary className="flex items-center gap-1.5 text-sm text-ink-300 cursor-pointer select-none list-none">
              <Repeat size={14} strokeWidth={2} />
              Recorrências ativas ({ativos.length})
            </summary>
            <div className="flex flex-col gap-2 mt-3">
              {ativos.map((r) => (
                <div
                  key={r.id}
                  onClick={() => {
                    setEditingRecorrencia(r);
                    setRecorrenciaModalOpen(true);
                  }}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white dark:bg-ink-700 rounded-card shadow-card
                             cursor-pointer hover:shadow-card-hover hover:-translate-y-px transition-all"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900 dark:text-ink-50 truncate">{r.descricao}</p>
                    <p className="text-xs text-ink-300">Todo dia {r.diaVencimento}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`money text-sm font-semibold ${
                        r.tipo === 'receita' ? 'text-ledger-600' : 'text-ink-900 dark:text-ink-50'
                      }`}
                    >
                      {formatCurrency(r.valor)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRecorrencia(r.id);
                      }}
                      aria-label="Encerrar recorrência"
                      className="flex items-center gap-1 text-xs text-signal-500 hover:bg-signal-50 rounded-pill px-2 py-1 transition-colors"
                    >
                      <X size={13} strokeWidth={2.25} />
                      Encerrar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      <LancamentoModal
        open={modalOpen}
        initialData={editing}
        categorias={categorias}
        defaultTipo={tab}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDeleteLancamento}
      />

      <RecorrenciaModal
        open={recorrenciaModalOpen}
        recorrencia={editingRecorrencia}
        categorias={categorias}
        onClose={() => setRecorrenciaModalOpen(false)}
        onSave={handleSaveRecorrencia}
        onDelete={handleDeleteRecorrencia}
      />

      {importModalOpen && (
        <Suspense fallback={null}>
          <ImportarFaturaModal
            open={importModalOpen}
            uid={uid}
            categorias={categorias}
            onClose={() => setImportModalOpen(false)}
            onImported={reload}
          />
        </Suspense>
      )}
    </>
  );
}
