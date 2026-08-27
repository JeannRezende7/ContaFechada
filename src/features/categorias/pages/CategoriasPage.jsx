import { useEffect, useMemo, useRef, useState } from 'react';
import { GripHorizontal, Pencil, Plus, X, Tag } from 'lucide-react';
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
  const [draggingId, setDraggingId] = useState(null);
  const pendingOrder = useRef([]);

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
    const maiorOrdem = categorias.reduce((maior, categoria) => Math.max(maior, Number(categoria.ordem) || 0), -1);
    await repositories.categorias.create(uid, { ...dados, ordem: maiorOrdem + 1 });
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

  function moveDraggedCategory(sourceId, targetId) {
    if (!sourceId || sourceId === targetId) return;
    setCategorias((items) => {
      const ordered = items.filter((item) => item.tipo === tab).sort((a, b) => a.ordem - b.ordem);
      const sourceIndex = ordered.findIndex((item) => item.id === sourceId);
      const targetIndex = ordered.findIndex((item) => item.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return items;
      const next = [...ordered];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      pendingOrder.current = next.map((item, ordem) => ({ id: item.id, ordem }));
      const orderById = new Map(pendingOrder.current.map((item) => [item.id, item.ordem]));
      return items.map((item) => orderById.has(item.id) ? { ...item, ordem: orderById.get(item.id) } : item);
    });
  }

  function handleDragMove(event, sourceId) {
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-category-id]');
    if (target) moveDraggedCategory(sourceId, target.dataset.categoryId);
  }

  async function finishDragging() {
    setDraggingId(null);
    const changes = pendingOrder.current;
    pendingOrder.current = [];
    if (!changes.length) return;
    try {
      await Promise.all(changes.map(({ id, ordem }) => repositories.categorias.update(uid, id, { ordem })));
    } catch {
      reload();
    }
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

        <section className="mb-5 rounded-card bg-white p-3 shadow-card dark:bg-ink-700">
          <div className="mb-3">
            <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">Suas categorias</h2>
            <p className="mt-0.5 text-xs text-ink-300">Toque para editar ou arraste pela alça para mudar a ordem.</p>
          </div>
          <div>
          <button
            onClick={openNew}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-ledger-500 px-3 py-2.5 text-sm font-medium text-white transition-all hover:bg-ledger-600 hover:shadow-card-hover"
          >
            <Plus size={16} strokeWidth={2.25} />
            Adicionar
          </button>
          </div>
        </section>

        <div className="grid grid-cols-4 sm:grid-cols-6 gap-x-2 gap-y-4">
          {doTipo.map((c) => {
            const color = getColor(c.corKey);
            const Icon = getIcon(c.icone);
            return (
              <div key={c.id} data-category-id={c.id} className={`flex flex-col items-center gap-1 rounded-xl transition ${draggingId === c.id ? 'scale-105 bg-ledger-50/70 dark:bg-ink-700' : ''}`}>
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
                    className="absolute -top-2 -left-2 h-9 w-9 rounded-full bg-white dark:bg-ledger-500 shadow-card flex items-center justify-center text-ink-500 dark:text-white hover:text-ledger-600 transition-colors"
                  >
                    <Pencil size={15} strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    aria-label={`Excluir ${c.nome}`}
                    className="absolute -top-2 -right-2 h-9 w-9 rounded-full bg-white dark:bg-ink-700 shadow-card flex items-center justify-center text-ink-300 hover:text-signal-500 transition-colors"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                </div>
                <span className="text-[11px] text-ink-500 text-center leading-tight line-clamp-2">{c.nome}</span>
                <button type="button" aria-label={`Arrastar ${c.nome} para mudar a ordem`} className="flex h-6 w-10 touch-none items-center justify-center rounded-pill text-ink-300 active:bg-ink-50 active:text-ledger-500 dark:active:bg-ink-700" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); pendingOrder.current = []; setDraggingId(c.id); }} onPointerMove={(event) => handleDragMove(event, c.id)} onPointerUp={finishDragging} onPointerCancel={finishDragging}>
                  <GripHorizontal size={17} />
                </button>
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
