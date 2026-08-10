import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, X, Tag } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { repositories } from '../../../repositories/index.js';
import { getColor } from '../colorMap.js';
import { getIcon } from '../iconMap.js';
import CategoriaModal from '../components/CategoriaModal.jsx';
import Topbar from '../../../components/layout/Topbar.jsx';
import RegrasCategorizacao from '../components/RegrasCategorizacao.jsx';

export default function CategoriasPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [categorias, setCategorias] = useState([]);
  const [tab, setTab] = useState('despesa');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const reload = async () => {
    if (!uid) return;
    setCategorias(await repositories.categorias.list(uid));
  };

  useEffect(() => {
    if (!uid) return;
    (async () => {
      await repositories.categorias.ensureDefaults(uid);
      await reload();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const doTipo = useMemo(
    () => categorias.filter((c) => c.tipo === tab).sort((a, b) => a.ordem - b.ordem),
    [categorias, tab]
  );

  async function handleAdd(dados) {
    await repositories.categorias.create(uid, { ...dados, ordem: Date.now() });
    setModalOpen(false);
    reload();
  }

  async function handleSave(dados) {
    if (!editing) return handleAdd(dados);
    await repositories.categorias.update(uid, editing.id, dados);
    setModalOpen(false);
    setEditing(null);
    reload();
  }

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(categoria) {
    setEditing(categoria);
    setModalOpen(true);
  }

  async function handleDelete(id) {
    await repositories.categorias.remove(uid, id);
    reload();
  }

  return (
    <>
      <Topbar title="Categorias" icon={Tag} />
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('despesa')}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
              tab === 'despesa' ? 'bg-ink-900 text-white dark:bg-ledger-500' : 'bg-ink-50 text-ink-500 dark:bg-ink-700 dark:text-ink-100'
            }`}
          >
            Despesas
          </button>
          <button
            onClick={() => setTab('receita')}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
              tab === 'receita' ? 'bg-ledger-500 text-white' : 'bg-ink-50 text-ink-500 dark:bg-ink-700 dark:text-ink-100'
            }`}
          >
            Receitas
          </button>
        </div>

        <div className="flex justify-end mb-4">
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 rounded-pill bg-ledger-500 text-white pl-3.5 pr-4 py-2.5 text-sm font-medium hover:bg-ledger-600 hover:shadow-card-hover transition-all"
          >
            <Plus size={16} strokeWidth={2.25} />
            Nova categoria
          </button>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 gap-x-2 gap-y-4">
          {doTipo.map((c) => {
            const color = getColor(c.corKey);
            const Icon = getIcon(c.icone);
            return (
              <div key={c.id} className="flex flex-col items-center gap-1">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    aria-label={`Editar ${c.nome}`}
                    className={`w-14 h-14 rounded-full flex items-center justify-center ${color.dot} hover:scale-105 focus-visible:ring-2 focus-visible:ring-ledger-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-ink-900 transition-transform`}
                  >
                    <Icon size={22} strokeWidth={2} className="text-white" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    aria-label={`Editar ${c.nome}`}
                    className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-white dark:bg-ledger-500 shadow-card flex items-center justify-center text-ink-500 dark:text-white hover:text-ledger-600 transition-colors"
                  >
                    <Pencil size={11} strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    aria-label={`Excluir ${c.nome}`}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-ink-700 shadow-card flex items-center justify-center text-ink-300 hover:text-signal-500 transition-colors"
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </div>
                <span className="text-[11px] text-ink-500 text-center leading-tight line-clamp-2">{c.nome}</span>
              </div>
            );
          })}
          {doTipo.length === 0 && (
            <p className="col-span-full text-sm text-ink-300 text-center py-6">Nenhuma categoria ainda.</p>
          )}
        </div>
        <RegrasCategorizacao uid={uid} categorias={categorias} />
      </div>

      <CategoriaModal
        open={modalOpen}
        tipo={editing?.tipo ?? tab}
        initialData={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
      />
    </>
  );
}
