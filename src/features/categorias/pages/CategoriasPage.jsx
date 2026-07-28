import { useEffect, useMemo, useState } from 'react';
import { Plus, X, Tag } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { listCategorias, createCategoria, deleteCategoria, ensureDefaultCategorias } from '../services/categoriasService.js';
import { getColor } from '../colorMap.js';
import { getIcon } from '../iconMap.js';
import { usePremium } from '../../../contexts/PremiumContext.jsx';
import { FEATURES } from '../../../config/premium.js';
import CategoriaModal from '../components/CategoriaModal.jsx';
import Topbar from '../../../components/layout/Topbar.jsx';
import RegrasCategorizacao from '../components/RegrasCategorizacao.jsx';

export default function CategoriasPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const { guardFeature } = usePremium();
  const [categorias, setCategorias] = useState([]);
  const [tab, setTab] = useState('despesa');
  const [modalOpen, setModalOpen] = useState(false);

  const reload = async () => {
    if (!uid) return;
    setCategorias(await listCategorias(uid));
  };

  useEffect(() => {
    if (!uid) return;
    (async () => {
      await ensureDefaultCategorias(uid);
      await reload();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const doTipo = useMemo(
    () => categorias.filter((c) => c.tipo === tab).sort((a, b) => a.ordem - b.ordem),
    [categorias, tab]
  );

  const customCount = useMemo(() => categorias.filter((c) => !c.padrao).length, [categorias]);

  async function handleAdd(dados) {
    if (!guardFeature(FEATURES.CATEGORIAS_CUSTOM, { count: customCount })) return;
    await createCategoria(uid, { ...dados, ordem: Date.now() });
    setModalOpen(false);
    reload();
  }

  async function handleDelete(id) {
    await deleteCategoria(uid, id);
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
            Receitas
          </button>
        </div>

        <div className="flex justify-end mb-4">
          <button
            onClick={() => setModalOpen(true)}
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
                  <span className={`w-14 h-14 rounded-full flex items-center justify-center ${color.dot}`}>
                    <Icon size={22} strokeWidth={2} className="text-white" />
                  </span>
                  <button
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
        tipo={tab}
        customCount={customCount}
        onClose={() => setModalOpen(false)}
        onSave={handleAdd}
      />
    </>
  );
}
