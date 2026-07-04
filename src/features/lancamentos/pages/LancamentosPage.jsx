import { useEffect, useMemo, useState, useCallback } from 'react';
import { Plus, Sprout, Repeat, X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import {
  listLancamentosByMonth,
  createLancamento,
  updateLancamento,
  setLancamentoStatus,
} from '../services/lancamentosService.js';
import {
  listRecorrencias,
  createRecorrencia,
  deleteRecorrencia,
  ensureGeneratedForMonth,
} from '../../recorrencias/services/recorrenciasService.js';
import { listCategorias, ensureDefaultCategorias } from '../../categorias/services/categoriasService.js';
import { getCurrentMonthKey } from '../../../utils/monthKey.js';
import { formatCurrency } from '../../../utils/formatCurrency.js';
import LancamentoRow from '../components/LancamentoRow.jsx';
import LancamentoModal from '../components/LancamentoModal.jsx';
import MonthNav from '../../../components/ui/MonthNav.jsx';
import Topbar from '../../../components/layout/Topbar.jsx';

export default function LancamentosPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey());
  const [lancamentos, setLancamentos] = useState([]);
  const [recorrencias, setRecorrencias] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const reload = useCallback(async () => {
    if (!uid) return;
    await ensureGeneratedForMonth(uid, monthKey);
    const [items, ativos] = await Promise.all([
      listLancamentosByMonth(uid, monthKey),
      listRecorrencias(uid),
    ]);
    setLancamentos(items);
    setRecorrencias(ativos);
  }, [uid, monthKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Categorias don't depend on the selected month — loaded once per user.
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
    const { recorrente, ...rest } = data;
    if (recorrente) {
      await createRecorrencia(uid, rest);
      await ensureGeneratedForMonth(uid, monthKey);
    } else if (editing) {
      await updateLancamento(uid, editing.id, rest);
    } else {
      await createLancamento(uid, rest);
    }
    setModalOpen(false);
    reload();
  }

  async function handleStatusChange(id, status) {
    await setLancamentoStatus(uid, id, status);
    reload();
  }

  async function handleDeleteRecorrencia(id) {
    await deleteRecorrencia(uid, id);
    reload();
  }

  const ativos = recorrencias.filter((r) => r.ativo);

  return (
    <>
      <Topbar title="Lançamentos" />
      <div className="p-4 md:p-8 max-w-4xl">
        <MonthNav monthKey={monthKey} onChange={setMonthKey} />

        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-ink-300">{lancamentos.length} lançamento(s)</p>
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

        <div className="flex flex-col gap-2">
          {lancamentos.map((l) => (
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
          {lancamentos.length === 0 && (
            <div className="flex flex-col items-center gap-3 text-center py-14 px-4">
              <span className="w-12 h-12 rounded-full bg-ledger-50 text-ledger-500 flex items-center justify-center">
                <Sprout size={22} strokeWidth={1.75} />
              </span>
              <p className="text-sm text-ink-300 max-w-[220px]">
                Nenhum lançamento neste mês ainda. Que tal começar cadastrando um?
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
                  className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white rounded-card shadow-card"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900 truncate">{r.descricao}</p>
                    <p className="text-xs text-ink-300">Todo dia {r.diaVencimento}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`money text-sm font-semibold ${
                        r.tipo === 'receita' ? 'text-ledger-600' : 'text-ink-900'
                      }`}
                    >
                      {formatCurrency(r.valor)}
                    </span>
                    <button
                      onClick={() => handleDeleteRecorrencia(r.id)}
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
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}
