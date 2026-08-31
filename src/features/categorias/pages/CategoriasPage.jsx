import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X, Tag } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { repositories } from '../../../repositories/index.js';
import { getColor } from '../colorMap.js';
import { getIcon } from '../iconMap.js';
import CategoriaModal from '../components/CategoriaModal.jsx';
import Topbar from '../../../components/layout/Topbar.jsx';
import RegrasCategorizacao from '../components/RegrasCategorizacao.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import { useSyncRevision } from '../../sync/hooks/useSyncRevision.js';

export default function CategoriasPage() {
  const syncRevision = useSyncRevision();
  const { user } = useAuth();
  const uid = user?.uid;
  const [categorias, setCategorias] = useState([]);
  const [tab, setTab] = useState('despesa');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const pendingOrder = useRef([]);
  const dragStart = useRef(null);

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
  }, [uid, syncRevision]);

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

  function handleCategoryPointerDown(event, sourceId) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { sourceId, x: event.clientX, y: event.clientY, moved: false };
    pendingOrder.current = [];
  }

  function handleDragMove(event) {
    const drag = dragStart.current;
    if (!drag) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 8) return;
    drag.moved = true;
    setDraggingId(drag.sourceId);
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-category-id]');
    if (target) moveDraggedCategory(drag.sourceId, target.dataset.categoryId);
  }

  async function finishDragging(categoria) {
    const wasDragging = dragStart.current?.moved;
    dragStart.current = null;
    setDraggingId(null);
    const changes = pendingOrder.current;
    pendingOrder.current = [];
    if (!wasDragging) {
      openEdit(categoria);
      return;
    }
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
              tab === 'despesa' ? 'bg-expense-500 text-white shadow-card' : 'bg-ink-50 text-ink-500 dark:bg-ink-700 dark:text-ink-100'
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
            <p className="mt-0.5 text-xs text-ink-300">Toque para editar. Segure o ícone e arraste para mudar a ordem.</p>
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
              <div
                key={c.id}
                data-category-id={c.id}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openEdit(c); }}
                className={`flex select-none flex-col items-center gap-1 rounded-xl px-1 py-1 transition ${draggingId === c.id ? 'z-10 scale-105 bg-ledger-50/70 shadow-card dark:bg-ink-700' : ''}`}
              >
                <div
                  className="relative touch-none"
                  onPointerDown={(event) => handleCategoryPointerDown(event, c.id)}
                  onPointerMove={handleDragMove}
                  onPointerUp={() => finishDragging(c)}
                  onPointerCancel={() => { dragStart.current = null; setDraggingId(null); }}
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${color.dot}`}>
                    <Icon size={22} strokeWidth={2} className="text-white" />
                  </div>
                  <button
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onPointerUp={(event) => event.stopPropagation()}
                    onClick={(event) => { event.stopPropagation(); handleDelete(c.id); }}
                    aria-label={`Excluir ${c.nome}`}
                    className="absolute -right-3 -top-3 flex h-11 w-11 items-center justify-center rounded-full text-ink-300 transition-colors hover:text-signal-500"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-card dark:bg-ink-700"><X size={13} strokeWidth={2.5} /></span>
                  </button>
                </div>
                <span className="text-[11px] text-ink-500 text-center leading-tight line-clamp-2">{c.nome}</span>
              </div>
            );
          })}
          {doTipo.length === 0 && (
            <EmptyState compact className="col-span-full" title={`Nenhuma categoria de ${tab === 'despesa' ? 'despesa' : 'receita'}`} description="Crie uma categoria para organizar seus lançamentos." actionLabel="Adicionar categoria" onAction={() => { setEditing(null); setModalOpen(true); }} />
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
