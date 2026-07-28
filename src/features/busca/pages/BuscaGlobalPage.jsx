import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import Topbar from '../../../components/layout/Topbar.jsx';
import LoadingScreen from '../../../components/ui/LoadingScreen.jsx';
import { listAllLancamentos } from '../../lancamentos/services/lancamentosService.js';
import { ensureDefaultCategorias } from '../../categorias/services/categoriasService.js';
import { listMetas } from '../../metas/services/metasService.js';
import { listRecorrencias } from '../../recorrencias/services/recorrenciasService.js';
import { filtrarBuscaGlobal } from '../utils/buscaGlobal.js';
import { formatCurrency } from '../../../utils/formatCurrency.js';
import { formatDateBR } from '../../../utils/formatDate.js';
import { usePremium } from '../../../contexts/PremiumContext.jsx';
import { FEATURES } from '../../../config/premium.js';

const EMPTY_FILTERS = { query: '', recurso: 'todos', tipo: 'todos', status: 'todos', categoriaId: '', de: '', ate: '', valorMin: '', valorMax: '' };

export default function BuscaGlobalPage() {
  const { user } = useAuth();
  const { canUse, openPaywall, loading: premiumLoading } = usePremium();
  const allowed = canUse(FEATURES.BUSCA_GLOBAL);
  const [data, setData] = useState({ lancamentos: [], categorias: [], metas: [], recorrencias: [] });
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || !allowed) {
      if (!premiumLoading) setLoading(false);
      return;
    }
    Promise.all([
      listAllLancamentos(user.uid),
      ensureDefaultCategorias(user.uid),
      listMetas(user.uid),
      listRecorrencias(user.uid),
    ]).then(([lancamentos, categorias, metas, recorrencias]) => {
      setData({ lancamentos, categorias, metas, recorrencias });
      setLoading(false);
    });
  }, [user, allowed, premiumLoading]);

  const items = useMemo(() => [
    ...data.lancamentos.map((item) => ({
      ...item, recurso: item.parcelamentoId ? 'parcelamentos' : 'lancamentos',
      titulo: item.descricao, subtitulo: item.status, data: item.dataVencimento,
      href: `/lancamentos?q=${encodeURIComponent(item.descricao)}`,
    })),
    ...data.categorias.map((item) => ({ ...item, recurso: 'categorias', titulo: item.nome, href: '/categorias' })),
    ...data.metas.map((item) => ({ ...item, recurso: 'metas', titulo: item.nome, valor: item.valorAtual, href: '/metas' })),
    ...data.recorrencias.map((item) => ({ ...item, recurso: 'recorrencias', titulo: item.descricao, subtitulo: item.ativo ? 'Ativa' : 'Inativa', href: `/lancamentos?q=${encodeURIComponent(item.descricao)}` })),
  ], [data]);
  const results = useMemo(() => filtrarBuscaGlobal(items, filters).slice(0, 100), [items, filters]);

  function update(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  if (loading) return <><Topbar title="Busca global" icon={Search} /><LoadingScreen /></>;
  if (!allowed) {
    return (
      <>
        <Topbar title="Busca global" icon={Search} />
        <div className="mx-auto max-w-lg p-8 text-center">
          <p className="text-sm text-ink-500">A busca em todo o histórico e os filtros avançados fazem parte do Premium.</p>
          <button onClick={() => openPaywall({ feature: FEATURES.BUSCA_GLOBAL })} className="mt-3 rounded-pill bg-ledger-500 px-4 py-2.5 text-sm font-medium text-white">Conhecer o Premium</button>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Busca global" icon={Search} />
      <div className="mx-auto max-w-4xl p-4 md:p-8">
        <input autoFocus value={filters.query} onChange={(e) => update('query', e.target.value)} placeholder="Buscar lançamentos, metas, categorias…" className="w-full rounded-pill border border-ink-100 bg-white px-4 py-3 text-sm shadow-card dark:border-ink-700 dark:bg-ink-900" />
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select value={filters.recurso} onChange={(e) => update('recurso', e.target.value)} className="rounded-xl border border-ink-100 p-2 text-xs dark:border-ink-700 dark:bg-ink-900">
            <option value="todos">Todos os recursos</option><option value="lancamentos">Lançamentos</option><option value="parcelamentos">Parcelamentos</option><option value="recorrencias">Recorrências</option><option value="categorias">Categorias</option><option value="metas">Metas</option>
          </select>
          <select value={filters.tipo} onChange={(e) => update('tipo', e.target.value)} className="rounded-xl border border-ink-100 p-2 text-xs dark:border-ink-700 dark:bg-ink-900">
            <option value="todos">Receitas e despesas</option><option value="receita">Receitas</option><option value="despesa">Despesas</option>
          </select>
          <select value={filters.status} onChange={(e) => update('status', e.target.value)} className="rounded-xl border border-ink-100 p-2 text-xs dark:border-ink-700 dark:bg-ink-900">
            <option value="todos">Todos os status</option><option value="pendente">Pendente</option><option value="pago">Pago</option><option value="recebido">Recebido</option><option value="atrasado">Atrasado</option><option value="agendado">Agendado</option>
          </select>
          <select value={filters.categoriaId} onChange={(e) => update('categoriaId', e.target.value)} className="rounded-xl border border-ink-100 p-2 text-xs dark:border-ink-700 dark:bg-ink-900">
            <option value="">Todas as categorias</option>{data.categorias.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
          <input type="date" value={filters.de} onChange={(e) => update('de', e.target.value)} className="rounded-xl border border-ink-100 p-2 text-xs dark:border-ink-700 dark:bg-ink-900" />
          <input type="date" value={filters.ate} onChange={(e) => update('ate', e.target.value)} className="rounded-xl border border-ink-100 p-2 text-xs dark:border-ink-700 dark:bg-ink-900" />
          <input type="number" placeholder="Valor mínimo" value={filters.valorMin} onChange={(e) => update('valorMin', e.target.value)} className="money rounded-xl border border-ink-100 p-2 text-xs dark:border-ink-700 dark:bg-ink-900" />
          <input type="number" placeholder="Valor máximo" value={filters.valorMax} onChange={(e) => update('valorMax', e.target.value)} className="money rounded-xl border border-ink-100 p-2 text-xs dark:border-ink-700 dark:bg-ink-900" />
        </div>
        <p className="my-4 text-xs text-ink-300">{results.length} resultado(s)</p>
        <div className="space-y-2">
          {results.map((item) => (
            <Link key={`${item.recurso}-${item.id}`} to={item.href} className="flex items-center gap-3 rounded-card bg-white p-4 shadow-card hover:shadow-card-hover dark:bg-ink-700">
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.titulo}</p><p className="text-xs capitalize text-ink-300">{item.recurso}{item.data ? ` · ${formatDateBR(item.data)}` : ''}</p></div>
              {item.valor != null && <span className="money text-sm font-medium">{formatCurrency(item.valor)}</span>}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
