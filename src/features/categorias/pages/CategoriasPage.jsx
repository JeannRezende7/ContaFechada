import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { listCategorias, createCategoria, deleteCategoria, ensureDefaultCategorias } from '../services/categoriasService.js';
import { GROUP_ORDER } from '../data/defaultCategorias.js';
import { COLOR_MAP, getColor } from '../colorMap.js';
import Topbar from '../../../components/layout/Topbar.jsx';

const NOVO_GRUPO = '__novo__';

function groupOrderIndex(label) {
  const i = GROUP_ORDER.findIndex((g) => g.label === label);
  return i === -1 ? GROUP_ORDER.length : i;
}

function groupEmoji(label) {
  return GROUP_ORDER.find((g) => g.label === label)?.emoji ?? '🏷️';
}

export default function CategoriasPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [categorias, setCategorias] = useState([]);
  const [tab, setTab] = useState('despesa');
  const [nome, setNome] = useState('');
  const [grupoSel, setGrupoSel] = useState('');
  const [novoGrupo, setNovoGrupo] = useState('');
  const [corKey, setCorKey] = useState('cinza');

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
    setGrupoSel('');
    setNovoGrupo('');
  }, [tab]);

  const doTipo = useMemo(() => categorias.filter((c) => c.tipo === tab), [categorias, tab]);

  const grupos = useMemo(() => {
    const labels = [...new Set(doTipo.map((c) => c.grupo))];
    return labels.sort((a, b) => groupOrderIndex(a) - groupOrderIndex(b));
  }, [doTipo]);

  const grupoOptions = useMemo(() => [...new Set(doTipo.map((c) => c.grupo))], [doTipo]);

  async function handleAdd(e) {
    e.preventDefault();
    const grupo = grupoSel === NOVO_GRUPO ? novoGrupo.trim() : grupoSel;
    if (!nome.trim() || !grupo) return;
    await createCategoria(uid, { nome: nome.trim(), tipo: tab, grupo, corKey, ordem: Date.now() });
    setNome('');
    setNovoGrupo('');
    reload();
  }

  async function handleDelete(id) {
    await deleteCategoria(uid, id);
    reload();
  }

  return (
    <>
      <Topbar title="Categorias" />
      <div className="p-4 md:p-8 max-w-4xl">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('despesa')}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
              tab === 'despesa' ? 'bg-ink-900 text-white' : 'bg-ink-50 text-ink-500'
            }`}
          >
            Despesas
          </button>
          <button
            onClick={() => setTab('receita')}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
              tab === 'receita' ? 'bg-ledger-500 text-white' : 'bg-ink-50 text-ink-500'
            }`}
          >
            Receitas
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {grupos.map((grupo) => (
            <div key={grupo}>
              <p className="text-sm font-medium text-ink-500 mb-2">
                {groupEmoji(grupo)} {grupo}
              </p>
              <div className="flex flex-wrap gap-2">
                {doTipo
                  .filter((c) => c.grupo === grupo)
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((c) => {
                    const color = getColor(c.corKey);
                    return (
                      <span
                        key={c.id}
                        className={`inline-flex items-center gap-2 rounded-pill pl-3 pr-2 py-1.5 text-sm ${color.chipBg} ${color.chipText}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                        {c.nome}
                        <button
                          onClick={() => handleDelete(c.id)}
                          aria-label={`Excluir ${c.nome}`}
                          className="text-current opacity-50 hover:opacity-100 transition-opacity"
                        >
                          <X size={13} strokeWidth={2.5} />
                        </button>
                      </span>
                    );
                  })}
              </div>
            </div>
          ))}
          {grupos.length === 0 && (
            <p className="text-sm text-ink-300 text-center py-6">Nenhuma categoria ainda.</p>
          )}
        </div>

        <form onSubmit={handleAdd} className="mt-8 bg-white rounded-card shadow-card p-4 flex flex-col gap-3">
          <p className="text-sm font-medium text-ink-900">Nova categoria de {tab === 'despesa' ? 'despesa' : 'receita'}</p>

          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Papelaria"
            className="w-full rounded-xl border border-ink-100 px-3.5 py-2.5 text-sm focus:border-ledger-500 transition-colors"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={grupoSel}
              onChange={(e) => setGrupoSel(e.target.value)}
              className="w-full rounded-xl border border-ink-100 px-3.5 py-2.5 text-sm bg-white"
            >
              <option value="" disabled>
                Grupo
              </option>
              {grupoOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
              <option value={NOVO_GRUPO}>+ Novo grupo</option>
            </select>

            {grupoSel === NOVO_GRUPO && (
              <input
                value={novoGrupo}
                onChange={(e) => setNovoGrupo(e.target.value)}
                placeholder="Nome do novo grupo"
                className="w-full rounded-xl border border-ink-100 px-3.5 py-2.5 text-sm focus:border-ledger-500 transition-colors"
              />
            )}
          </div>

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
