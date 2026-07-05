import { useEffect, useState } from 'react';
import { Target, Plus, PiggyBank } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { listMetas, createMeta, updateMeta, deleteMeta, aportarNaMeta } from '../services/metasService.js';
import { useConfirm } from '../../../contexts/ConfirmContext.jsx';
import { COLOR_MAP } from '../../categorias/colorMap.js';
import { formatCurrency } from '../../../utils/formatCurrency.js';
import Topbar from '../../../components/layout/Topbar.jsx';
import MetaModal from '../components/MetaModal.jsx';

export default function MetasPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const confirm = useConfirm();
  const [metas, setMetas] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [aportes, setAportes] = useState({});

  async function reload() {
    if (!uid) return;
    setMetas(await listMetas(uid));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  async function handleSave(id, data) {
    if (id) await updateMeta(uid, id, data);
    else await createMeta(uid, data);
    setModalOpen(false);
    reload();
  }

  async function handleDelete(id) {
    if (!(await confirm('Excluir esta meta? O progresso guardado será perdido.'))) return;
    await deleteMeta(uid, id);
    setModalOpen(false);
    reload();
  }

  async function handleAportar(meta) {
    const valor = Number(aportes[meta.id]);
    if (!valor) return;
    await aportarNaMeta(uid, meta, valor);
    setAportes((prev) => ({ ...prev, [meta.id]: '' }));
    reload();
  }

  return (
    <>
      <Topbar title="Metas" icon={Target} />
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-pill bg-ledger-500 text-white pl-3.5 pr-4 py-2.5 text-sm font-medium hover:bg-ledger-600 hover:shadow-card-hover transition-all"
          >
            <Plus size={16} strokeWidth={2.25} />
            Nova meta
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {metas.map((meta) => {
            const cor = COLOR_MAP[meta.corKey] ?? COLOR_MAP.azul;
            const alvo = Number(meta.valorAlvo) || 0;
            const atual = Number(meta.valorAtual) || 0;
            const pct = alvo > 0 ? Math.min(100, Math.round((atual / alvo) * 100)) : 0;
            const atingida = alvo > 0 && atual >= alvo;

            return (
              <div key={meta.id} className="bg-white dark:bg-ink-700 rounded-card shadow-card p-4 md:p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <button
                    onClick={() => {
                      setEditing(meta);
                      setModalOpen(true);
                    }}
                    className="flex items-center gap-2.5 min-w-0 text-left"
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cor.dot}`} />
                    <span className="font-medium text-sm md:text-base text-ink-900 dark:text-ink-50 truncate">
                      {meta.nome}
                    </span>
                  </button>
                  <span className="money text-xs md:text-sm text-ink-300 shrink-0">
                    {formatCurrency(atual)} / {formatCurrency(alvo)}
                  </span>
                </div>

                <div className="h-2.5 rounded-pill bg-ink-50 dark:bg-ink-900 overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-pill ${cor.dot} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className={`text-xs font-semibold ${atingida ? 'text-ledger-600' : 'text-ink-300'}`}>
                    {atingida ? 'Meta atingida! 🎉' : `${pct}%`}
                  </span>
                  {!atingida && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Aportar"
                        value={aportes[meta.id] ?? ''}
                        onChange={(e) => setAportes((prev) => ({ ...prev, [meta.id]: e.target.value }))}
                        className="w-24 rounded-xl border border-ink-100 bg-white dark:bg-ink-900 dark:border-ink-700 text-ink-900 dark:text-ink-50 px-2.5 py-1.5 text-xs focus:border-ledger-500 transition-colors"
                      />
                      <button
                        onClick={() => handleAportar(meta)}
                        className="rounded-pill bg-ledger-50 text-ledger-600 px-3 py-1.5 text-xs font-medium hover:bg-ledger-100 transition-colors"
                      >
                        + Guardar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {metas.length === 0 && (
            <div className="flex flex-col items-center gap-3 text-center py-14 px-4">
              <span className="w-12 h-12 rounded-full bg-ledger-50 text-ledger-500 flex items-center justify-center">
                <PiggyBank size={22} strokeWidth={1.75} />
              </span>
              <p className="text-sm text-ink-300 max-w-[240px]">
                Nenhuma meta ainda. Que tal criar uma para uma viagem ou reserva de emergência?
              </p>
              <button
                onClick={() => {
                  setEditing(null);
                  setModalOpen(true);
                }}
                className="text-sm font-medium text-ledger-600 hover:underline"
              >
                + Nova meta
              </button>
            </div>
          )}
        </div>
      </div>

      <MetaModal
        open={modalOpen}
        meta={editing}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </>
  );
}
