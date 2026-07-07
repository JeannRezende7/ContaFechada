import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { Landmark, Sparkles, FileUp, ListPlus, Trash2, Repeat, Plus } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { useConfirm } from '../../../contexts/ConfirmContext.jsx';
import {
  listAllLancamentos,
  createLancamento,
  updateLancamento,
  deleteLancamento,
  deleteLancamentosByIds,
  createParcelamento,
} from '../../lancamentos/services/lancamentosService.js';
import { listCategorias } from '../../categorias/services/categoriasService.js';
import {
  getGestorUsaMovimento,
  listGestorLancamentos,
  deleteAllGestorLancamentos,
  importarFaturaParaGestor,
  createGestorLancamento,
  updateGestorLancamento,
  deleteGestorLancamento,
  deleteGestorLancamentosByIds,
  createParcelamentoGestor,
} from '../services/gestorService.js';
import { analisarFinancas } from '../utils/analiseFinanceira.js';
import MonthNav from '../../../components/ui/MonthNav.jsx';
import IndicatorCard from '../../../components/ui/IndicatorCard.jsx';
import LoadingScreen from '../../../components/ui/LoadingScreen.jsx';
import Topbar from '../../../components/layout/Topbar.jsx';
import { getCurrentMonthKey } from '../../../utils/monthKey.js';
import { formatCurrency } from '../../../utils/formatCurrency.js';
import ImportarDoMovimentoModal from '../components/ImportarDoMovimentoModal.jsx';
import ImportarRecorrenciasModal from '../components/ImportarRecorrenciasModal.jsx';
import LancamentoRow from '../../lancamentos/components/LancamentoRow.jsx';
import LancamentoModal from '../../lancamentos/components/LancamentoModal.jsx';

// Pulls in pdfjs-dist (~500kB) — deferred like on the Lançamentos page, only
// fetched when the user actually opens the import flow.
const ImportarFaturaModal = lazy(() => import('../../lancamentos/components/ImportarFaturaModal.jsx'));

export default function GestorFinanceiroPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const confirm = useConfirm();
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey());
  const [usaMovimento, setUsaMovimento] = useState(null);
  const [lancamentos, setLancamentos] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [importarMovimentoOpen, setImportarMovimentoOpen] = useState(false);
  const [importarPdfOpen, setImportarPdfOpen] = useState(false);
  const [importarRecorrenciasOpen, setImportarRecorrenciasOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [abaDetalhe, setAbaDetalhe] = useState('compromissos'); // 'compromissos' | 'lancamentos'

  const reload = useCallback(async () => {
    if (!uid) return;
    const usa = await getGestorUsaMovimento(uid);
    setUsaMovimento(usa);
    const lista = usa ? await listAllLancamentos(uid) : await listGestorLancamentos(uid);
    setLancamentos(lista);
  }, [uid]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!uid) return;
    listCategorias(uid).then(setCategorias);
  }, [uid]);

  const categoriasById = useMemo(
    () => Object.fromEntries(categorias.map((c) => [c.id, c])),
    [categorias]
  );

  const analise = useMemo(() => {
    if (!lancamentos) return null;
    return analisarFinancas(lancamentos, monthKey);
  }, [lancamentos, monthKey]);

  async function handleLimparGestor() {
    if (!(await confirm('Limpar todos os lançamentos do Gestor Financeiro? Essa ação não pode ser desfeita.'))) return;
    await deleteAllGestorLancamentos(uid);
    reload();
  }

  /**
   * Manual entry works in both modes: when the Gestor uses the Movimento
   * directly, "lançar manualmente" here is exactly the same as adding one
   * from the Lançamentos page; when separado, it writes into the Gestor's
   * own collection instead.
   */
  async function handleSave(data) {
    const { recorrente: _recorrente, parcelado, ...rest } = data;
    if (usaMovimento) {
      if (parcelado) await createParcelamento(uid, rest);
      else if (editing) await updateLancamento(uid, editing.id, rest);
      else await createLancamento(uid, rest);
    } else if (parcelado) {
      await createParcelamentoGestor(uid, rest);
    } else if (editing) {
      await updateGestorLancamento(uid, editing.id, rest);
    } else {
      await createGestorLancamento(uid, rest);
    }
    setModalOpen(false);
    reload();
  }

  async function handleDelete(item, { futureInstallments = false } = {}) {
    if (futureInstallments && item.parcelamentoId && item.totalParcelas) {
      const ids = [];
      for (let n = item.parcelaAtual; n <= item.totalParcelas; n++) ids.push(`${item.parcelamentoId}_${n}`);
      if (usaMovimento) await deleteLancamentosByIds(uid, ids);
      else await deleteGestorLancamentosByIds(uid, ids);
    } else if (usaMovimento) {
      await deleteLancamento(uid, item.id);
    } else {
      await deleteGestorLancamento(uid, item.id);
    }
    setModalOpen(false);
    reload();
  }

  async function handleStatusChange(id, status) {
    if (usaMovimento) await updateLancamento(uid, id, { status });
    else await updateGestorLancamento(uid, id, { status });
    reload();
  }

  if (!lancamentos || !analise) {
    return (
      <>
        <Topbar title="Gestor Financeiro" icon={Landmark} />
        <LoadingScreen />
      </>
    );
  }

  const lancamentosDoMes = lancamentos.filter((l) => l.dataVencimento?.startsWith(monthKey));

  const tonePercent =
    analise.percentualComprometido == null
      ? 'neutral'
      : analise.percentualComprometido >= 50
        ? 'negative'
        : analise.percentualComprometido >= 30
          ? 'pending'
          : 'positive';

  return (
    <>
      <Topbar title="Gestor Financeiro" icon={Landmark} />
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <MonthNav monthKey={monthKey} onChange={setMonthKey} />

        <div className="flex justify-end mb-4">
          <button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-pill bg-ledger-500 text-white pl-3.5 pr-4 py-2.5 text-sm font-medium hover:bg-ledger-600 hover:shadow-card-hover transition-all"
          >
            <Plus size={16} strokeWidth={2.25} />
            Novo
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4">
          <IndicatorCard label="Renda do mês" value={analise.rendaMes} tone="positive" />
          <IndicatorCard
            label="Renda comprometida"
            value={analise.despesaComprometida}
            tone={tonePercent}
            hint={
              analise.percentualComprometido != null
                ? `${Math.round(analise.percentualComprometido)}% da renda`
                : 'Sem renda registrada no mês'
            }
          />
        </div>

        <div className="bg-white dark:bg-ink-700 rounded-card shadow-card p-4 mb-4">
          <div className="flex gap-1 mb-3 bg-ink-50 dark:bg-ink-900 rounded-pill p-1">
            <button
              onClick={() => setAbaDetalhe('compromissos')}
              className={`flex-1 rounded-pill py-1.5 text-xs font-medium transition-colors ${
                abaDetalhe === 'compromissos'
                  ? 'bg-white dark:bg-ink-700 shadow-card text-ink-900 dark:text-ink-50'
                  : 'text-ink-500'
              }`}
            >
              Compromissos ({analise.parcelamentosAtivos.length})
            </button>
            <button
              onClick={() => setAbaDetalhe('lancamentos')}
              className={`flex-1 rounded-pill py-1.5 text-xs font-medium transition-colors ${
                abaDetalhe === 'lancamentos'
                  ? 'bg-white dark:bg-ink-700 shadow-card text-ink-900 dark:text-ink-50'
                  : 'text-ink-500'
              }`}
            >
              Lançamentos do mês ({lancamentosDoMes.length})
            </button>
          </div>

          {abaDetalhe === 'compromissos' ? (
            analise.parcelamentosAtivos.length === 0 ? (
              <p className="text-sm text-ink-300">Nenhum compromisso ativo neste mês.</p>
            ) : (
              <div className="flex flex-col divide-y divide-ink-100 dark:divide-ink-900 -mx-4">
                {analise.parcelamentosAtivos.map((p, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm text-ink-900 dark:text-ink-50 truncate">{p.descricao}</p>
                      <p className="text-xs text-ink-300">
                        {p.tipo === 'recorrente'
                          ? `Recorrente · ${formatCurrency(p.valorParcela)}/mês`
                          : `Parcela ${p.parcelaAtual}/${p.totalParcelas} · ${formatCurrency(p.valorParcela)}/mês`}
                      </p>
                    </div>
                    {p.tipo === 'recorrente' ? (
                      <span className="text-xs text-ink-300 shrink-0">contínuo</span>
                    ) : (
                      <span className="money text-sm font-semibold text-ink-900 dark:text-ink-50 shrink-0">
                        {formatCurrency(p.valorRestante)} restante
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : lancamentosDoMes.length === 0 ? (
            <p className="text-sm text-ink-300">Nenhum lançamento neste mês.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {lancamentosDoMes.map((l) => (
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
            </div>
          )}
        </div>

        {analise.sugestoes.length > 0 && (
          <div className="bg-white dark:bg-ink-700 rounded-card shadow-card p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0">
                <Sparkles size={15} strokeWidth={1.75} />
              </span>
              <p className="text-sm font-medium text-ink-900 dark:text-ink-50">Sugestões</p>
            </div>
            <ul className="flex flex-col gap-1.5">
              {analise.sugestoes.map((s, i) => (
                <li key={i} className="text-sm text-ink-500 pl-2">
                  • {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {usaMovimento ? (
          <p className="text-xs text-ink-300 text-center">
            Analisando os lançamentos do Movimento automaticamente. Para importar manualmente, desative isso em Opções.
          </p>
        ) : (
          <div className="bg-white dark:bg-ink-700 rounded-card shadow-card p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-sm font-medium text-ink-900 dark:text-ink-50">Importar mais lançamentos</p>
              {lancamentos.length > 0 && (
                <button
                  onClick={handleLimparGestor}
                  aria-label="Limpar lançamentos do Gestor Financeiro"
                  className="text-ink-300 hover:text-signal-500 transition-colors"
                >
                  <Trash2 size={14} strokeWidth={2} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setImportarMovimentoOpen(true)}
                className="flex-1 min-w-[45%] flex items-center justify-center gap-1.5 rounded-pill bg-ink-50 dark:bg-ink-900 text-ink-500 px-3 py-2.5 text-sm font-medium hover:bg-ink-100 transition-colors"
              >
                <ListPlus size={16} strokeWidth={2.25} />
                Movimento
              </button>
              <button
                onClick={() => setImportarRecorrenciasOpen(true)}
                className="flex-1 min-w-[45%] flex items-center justify-center gap-1.5 rounded-pill bg-ink-50 dark:bg-ink-900 text-ink-500 px-3 py-2.5 text-sm font-medium hover:bg-ink-100 transition-colors"
              >
                <Repeat size={16} strokeWidth={2.25} />
                Recorrências
              </button>
              <button
                onClick={() => setImportarPdfOpen(true)}
                className="flex-1 min-w-[45%] flex items-center justify-center gap-1.5 rounded-pill bg-ink-50 dark:bg-ink-900 text-ink-500 px-3 py-2.5 text-sm font-medium hover:bg-ink-100 transition-colors"
              >
                <FileUp size={16} strokeWidth={2.25} />
                Importar PDF
              </button>
            </div>
          </div>
        )}
      </div>

      <LancamentoModal
        open={modalOpen}
        initialData={editing}
        categorias={categorias}
        defaultTipo="despesa"
        permitirRecorrente={false}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <ImportarDoMovimentoModal
        open={importarMovimentoOpen}
        uid={uid}
        categoriasById={categoriasById}
        onClose={() => setImportarMovimentoOpen(false)}
        onImported={reload}
      />

      <ImportarRecorrenciasModal
        open={importarRecorrenciasOpen}
        uid={uid}
        onClose={() => setImportarRecorrenciasOpen(false)}
        onImported={reload}
      />

      {importarPdfOpen && (
        <Suspense fallback={null}>
          <ImportarFaturaModal
            open={importarPdfOpen}
            uid={uid}
            categorias={categorias}
            onImport={importarFaturaParaGestor}
            onClose={() => setImportarPdfOpen(false)}
            onImported={reload}
          />
        </Suspense>
      )}
    </>
  );
}
