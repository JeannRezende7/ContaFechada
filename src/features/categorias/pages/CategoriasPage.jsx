import { useEffect, useMemo, useState } from 'react';
import { Plus, X, Tag } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { listCategorias, createCategoria, deleteCategoria, ensureDefaultCategorias } from '../services/categoriasService.js';
import { COLOR_MAP, getColor } from '../colorMap.js';
import { ICON_MAP, getIcon } from '../iconMap.js';
import Topbar from '../../../components/layout/Topbar.jsx';

export default function CategoriasPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [categorias, setCategorias] = useState([]);
  const [tab, setTab] = useState('despesa');
  const [nome, setNome] = useState('');
  const [corKey, setCorKey] = useState('cinza');
  const [icone, setIcone] = useState('tag');

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

  useEffect(() => {
    setNome('');
  }, [tab]);

  const doTipo = useMemo(
    () => categorias.filter((c) => c.tipo === tab).sort((a, b) => a.ordem - b.ordem),
    [categorias, tab]
  );

  async function handleAdd(e) {
    e.preventDefault();
    if (!nome.trim()) return;
    await createCategoria(uid, { nome: nome.trim(), tipo: tab, corKey, icone, ordem: Date.now() });
    setNome('');
    reload();
  }

  async function handleDelete(id) {
    await deleteCategoria(uid, id);
    reload();
  }

  return (
    <>
      <Topbar title="Categorias" icon={Tag} />
      <div className="p-4 md:p-8 max-w-4xl">
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

        <form onSubmit={handleAdd} className="mt-8 bg-white dark:bg-ink-700 rounded-card shadow-card p-4 flex flex-col gap-3">
          <p className="text-sm font-medium text-ink-900 dark:text-ink-50">Nova categoria de {tab === 'despesa' ? 'despesa' : 'receita'}</p>

          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Papelaria"
            className="w-full rounded-xl border border-ink-100 px-3.5 py-2.5 text-sm focus:border-ledger-500 transition-colors"
          />

          <p className="text-xs font-medium text-ink-300 -mb-1">Cor</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(COLOR_MAP).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setCorKey(key)}
                aria-label={`Cor ${key}`}
                className={`w-7 h-7 rounded-full ${COLOR_MAP[key].dot} transition-all ${
                  corKey === key ? 'ring-2 ring-offset-2 ring-ink-900' : ''
                }`}
              />
            ))}
          </div>

          <p className="text-xs font-medium text-ink-300 -mb-1">Ícone</p>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {Object.entries(ICON_MAP).map(([key, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setIcone(key)}
                aria-label={`Ícone ${key}`}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${COLOR_MAP[corKey].dot} ${
                  icone === key ? 'ring-2 ring-offset-2 ring-ink-900' : 'opacity-60 hover:opacity-100'
                }`}
              >
                <Icon size={15} strokeWidth={2.25} className="text-white" />
              </button>
            ))}
          </div>

          <button
            type="submit"
            className="self-start flex items-center gap-1.5 rounded-pill bg-ledger-500 text-white pl-3.5 pr-4 py-2.5 text-sm font-medium hover:bg-ledger-600 hover:shadow-card-hover transition-all"
          >
            <Plus size={16} strokeWidth={2.25} />
            Adicionar
          </button>
        </form>
      </div>
    </>
  );
}
