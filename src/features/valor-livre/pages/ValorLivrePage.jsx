import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarRange, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import Topbar from '../../../components/layout/Topbar.jsx';
import MonthNav from '../../../components/ui/MonthNav.jsx';
import LoadingScreen from '../../../components/ui/LoadingScreen.jsx';
import FeedbackMessage from '../../../components/ui/FeedbackMessage.jsx';
import SectionTabs from '../../../components/ui/SectionTabs.jsx';
import CategoriaPicker from '../../categorias/components/CategoriaPicker.jsx';
import LancamentoModal from '../../lancamentos/components/LancamentoModal.jsx';
import { repositories } from '../../../repositories/index.js';
import { formatCurrency } from '../../../utils/formatCurrency.js';
import { getCurrentMonthKey } from '../../../utils/monthKey.js';
import { formatDateBR } from '../../../utils/formatDate.js';
import { calcularPlanejamentoCategorias } from '../utils/valorLivre.js';

function assinaturaRegras(regras) {
  return JSON.stringify(regras.map((item) => ({
    categoriaId: item.categoriaId || '',
    valor: Math.max(0, Number(item.valor) || 0),
  })));
}

export default function ValorLivrePage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const uid = user?.uid;
  const requestedMonth = searchParams.get('mes');
  const [monthKey, setMonthKey] = useState(/^\d{4}-\d{2}$/.test(requestedMonth || '') ? requestedMonth : getCurrentMonthKey());
  const [tab, setTab] = useState(searchParams.get('aba') === 'configuracoes' ? 'configuracoes' : 'acompanhamento');
  const [lancamentos, setLancamentos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [regras, setRegras] = useState([]);
  const [regrasSalvas, setRegrasSalvas] = useState('[]');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [editingLancamento, setEditingLancamento] = useState(null);
  const [duplicatingLancamento, setDuplicatingLancamento] = useState(false);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      repositories.lancamentos.listByMonth(uid, monthKey),
      repositories.categorias.ensureDefaults(uid),
      repositories.valorLivre.getDistribuicao(uid, monthKey),
    ]).then(([items, categoryItems, saved]) => {
      if (cancelled) return;
      setLancamentos(items);
      setCategorias(categoryItems);
      const regrasCarregadas = saved.distribuicoes.map((item) => ({
        id: item.id || crypto.randomUUID(),
        categoriaId: item.categoriaId || '',
        valor: Math.max(0, Number(item.valor) || 0),
      }));
      setRegras(regrasCarregadas);
      setRegrasSalvas(assinaturaRegras(regrasCarregadas));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [uid, monthKey]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = window.setTimeout(() => setFeedback(''), 3500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const categoriasDespesa = useMemo(() => categorias.filter((categoria) => categoria.tipo === 'despesa'), [categorias]);
  const categoriasById = useMemo(() => Object.fromEntries(categorias.map((categoria) => [categoria.id, categoria.nome])), [categorias]);
  const relatorio = useMemo(() => calcularPlanejamentoCategorias(lancamentos, regras), [lancamentos, regras]);
  const planejamentoValido = regras.length > 0
    && regras.every((item) => item.categoriaId && Number(item.valor) > 0)
    && new Set(regras.map((item) => item.categoriaId)).size === regras.length;
  const planejamentoAlterado = assinaturaRegras(regras) !== regrasSalvas;
  const gastosPorCategoria = useMemo(() => {
    const totais = {};
    lancamentos.forEach((item) => {
      if (item.tipo !== 'despesa') return;
      const categoriaId = item.categoriaId || '';
      totais[categoriaId] = (totais[categoriaId] || 0) + Number(item.valor || 0);
    });
    return totais;
  }, [lancamentos]);
  const grupos = useMemo(() => {
    const despesas = lancamentos.filter((item) => item.tipo === 'despesa');
    return {
      planejados: relatorio.itens.map((item) => ({
        ...item,
        nome: categoriasById[item.categoriaId] || 'Categoria removida',
        lancamentos: despesas.filter((lancamento) => lancamento.categoriaId === item.categoriaId),
      })),
      naoPlanejados: relatorio.semPlanejamento.map((item) => ({
        ...item,
        nome: item.categoriaId ? categoriasById[item.categoriaId] || 'Categoria removida' : 'Sem categoria',
        lancamentos: despesas.filter((lancamento) => (lancamento.categoriaId || '') === item.categoriaId),
      })),
    };
  }, [categoriasById, lancamentos, relatorio]);

  function adicionar() {
    setRegras((atual) => [...atual, { id: crypto.randomUUID(), categoriaId: '', valor: '' }]);
    setFeedback('');
  }

  function atualizar(id, changes) {
    setRegras((atual) => atual.map((item) => item.id === id ? { ...item, ...changes } : item));
    setFeedback('');
  }

  async function salvarPlanejamento() {
    if (regras.some((item) => !item.categoriaId || Number(item.valor) <= 0)) {
      setFeedback('Escolha uma categoria e informe um valor maior que zero em cada regra.');
      return;
    }
    if (new Set(regras.map((item) => item.categoriaId)).size !== regras.length) {
      setFeedback('Cada categoria pode aparecer apenas uma vez no planejamento.');
      return;
    }
    setSaving(true);
    setFeedback('');
    try {
      const dados = regras.map((item) => ({
        id: item.id,
        nome: categoriasById[item.categoriaId] || '',
        categoriaId: item.categoriaId,
        valor: Math.max(0, Number(item.valor) || 0),
      }));
      await repositories.valorLivre.setDistribuicao(uid, monthKey, dados, false);
      setRegras(dados);
      setRegrasSalvas(assinaturaRegras(dados));
      setFeedback('Planejamento salvo com sucesso.');
      setTab('acompanhamento');
    } catch {
      setFeedback('Não foi possível salvar o planejamento. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function recarregarLancamentos() {
    setLancamentos(await repositories.lancamentos.listByMonth(uid, monthKey));
  }

  async function salvarLancamento(data) {
    const { recorrente: _recorrente, parcelado, simulacao, ...rest } = data;
    if (simulacao) {
      const total = Math.max(0, Number(rest.valorTotal) || 0);
      const entrada = Math.min(total, Math.max(0, Number(rest.entrada) || 0));
      if (entrada > 0) await repositories.lancamentos.create(uid, {
        tipo: 'despesa', descricao: `${rest.descricao} (entrada)`, valor: entrada,
        dataVencimento: rest.dataVencimento, dataPagamento: rest.dataVencimento,
        status: 'pago', observacoes: rest.observacoes || 'Criado pelo simulador de compra.', categoriaId: rest.categoriaId,
      });
      if (total - entrada > 0) await repositories.lancamentos.createParcelamento(uid, {
        tipo: 'despesa', descricao: rest.descricao, valorTotal: total - entrada,
        numParcelas: Math.max(1, Number(rest.numParcelas) || 1), dataVencimento: rest.dataVencimento,
        observacoes: rest.observacoes || 'Criado pelo simulador de compra.', categoriaId: rest.categoriaId,
      });
    } else if (parcelado) {
      await repositories.lancamentos.createParcelamento(uid, rest);
    } else if (editingLancamento && !duplicatingLancamento) {
      await repositories.lancamentos.update(uid, editingLancamento.id, rest);
    } else {
      await repositories.lancamentos.create(uid, rest);
    }
    setEditingLancamento(null);
    setDuplicatingLancamento(false);
    await recarregarLancamentos();
  }

  async function excluirLancamento(item, { futureInstallments = false, futureRecorrencia = false, allRecorrencia = false } = {}) {
    if (futureInstallments && item.parcelamentoId && item.totalParcelas) {
      const ids = [];
      for (let n = item.parcelaAtual; n <= item.totalParcelas; n++) ids.push(`${item.parcelamentoId}_${n}`);
      await repositories.lancamentos.removeByIds(uid, ids);
    } else if ((futureRecorrencia || allRecorrencia) && item.origemRecorrenciaId) {
      await repositories.lancamentos.removeGeneratedFromRecorrencia(uid, item.origemRecorrenciaId, futureRecorrencia ? { fromMonthKey: item.mesReferencia } : {});
      if (allRecorrencia) await repositories.recorrencias.remove(uid, item.origemRecorrenciaId);
    } else {
      await repositories.lancamentos.remove(uid, item.id);
    }
    setEditingLancamento(null);
    setDuplicatingLancamento(false);
    await recarregarLancamentos();
  }

  if (loading) return <><Topbar title="Planejamento" icon={CalendarRange} /><LoadingScreen /></>;

  return (
    <>
      <Topbar title="Planejamento" icon={CalendarRange} />
      <SectionTabs area="planejamento" />
      <div className="mx-auto max-w-4xl p-4 md:p-8">
        <MonthNav monthKey={monthKey} onChange={setMonthKey} />
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-pill bg-ink-50 p-1 dark:bg-ink-900">
          <button type="button" onClick={() => setTab('acompanhamento')} className={`rounded-pill py-2 text-sm font-medium ${tab === 'acompanhamento' ? 'bg-ledger-500 text-white shadow-card' : 'text-ink-500 dark:text-ink-100'}`}>Relatório</button>
          <button type="button" onClick={() => setTab('configuracoes')} className={`rounded-pill py-2 text-sm font-medium ${tab === 'configuracoes' ? 'bg-ledger-500 text-white shadow-card' : 'text-ink-500 dark:text-ink-100'}`}>Planejar gastos</button>
        </div>
        <FeedbackMessage message={feedback} error={feedback.startsWith('Não')} className="mt-3 justify-center" />

        {tab === 'acompanhamento' && (
          <div className="mt-4 space-y-3">
            <ResumoPlanejamento relatorio={relatorio} />
            {grupos.planejados.map((grupo) => <Grupo key={grupo.id} grupo={grupo} categoriasById={categoriasById} onSelect={setEditingLancamento} />)}
            {grupos.naoPlanejados.length > 0 && <h2 className="pt-2 text-sm font-semibold text-signal-500">Gastos sem planejamento</h2>}
            {grupos.naoPlanejados.map((grupo) => <Grupo key={grupo.categoriaId || 'sem-categoria'} grupo={grupo} categoriasById={categoriasById} alerta onSelect={setEditingLancamento} />)}
            {grupos.planejados.length === 0 && grupos.naoPlanejados.length === 0 && <p className="rounded-card bg-white p-6 text-center text-sm text-ink-300 shadow-card dark:bg-ink-700">Nenhum gasto ou planejamento neste mês.</p>}
          </div>
        )}

        {tab === 'configuracoes' && (
          <section className="mb-28 mt-4 overflow-hidden rounded-card bg-white shadow-card dark:bg-ink-700">
            <div className="border-b border-ink-100 p-4 dark:border-ink-900">
              <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">Planejamento mensal</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-300">Defina um limite para cada categoria e acompanhe seus gastos no relatório.</p>
            </div>
            <div className="space-y-3 p-4">
              {regras.map((item) => (
                <div key={item.id} className="rounded-card border border-ink-100 bg-ink-50/60 p-3 dark:border-ink-900 dark:bg-ink-900/55">
                  <label className="block min-w-0 text-xs font-medium text-ink-500 dark:text-ink-100">Categoria<div className="mt-1.5"><CategoriaPicker categorias={categoriasDespesa} value={item.categoriaId} onChange={(categoriaId) => atualizar(item.id, { categoriaId })} emptyLabel="Escolha uma categoria" /></div></label>
                  <div className="mt-3 grid grid-cols-[minmax(0,1fr)_2.75rem] items-end gap-2">
                    <label className="min-w-0 text-xs font-medium text-ink-500 dark:text-ink-100">Limite mensal<div className="mt-1.5 flex items-center rounded-xl border border-ink-100 bg-white px-3 focus-within:border-ledger-500 dark:border-ink-700 dark:bg-ink-700"><span className="money shrink-0 text-sm text-ink-300">R$</span><input type="number" min="0" step="0.01" value={item.valor} placeholder="0,00" onChange={(event) => atualizar(item.id, { valor: event.target.value })} className="money min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm text-ink-900 outline-none placeholder:text-ink-300 dark:text-ink-50" /></div>{item.categoriaId && <span className="mt-1.5 block font-normal text-ink-300">Gasto neste mês: <b className="money font-medium text-signal-500">{formatCurrency(gastosPorCategoria[item.categoriaId] || 0)}</b></span>}</label>
                    <button type="button" aria-label="Remover categoria do planejamento" title="Remover" onClick={() => setRegras((atual) => atual.filter((row) => row.id !== item.id))} className="flex h-11 w-11 items-center justify-center rounded-xl bg-signal-50 text-signal-500 transition-colors hover:bg-signal-100 dark:bg-signal-500/10"><Trash2 size={17} /></button>
                  </div>
                </div>
              ))}
              {regras.length === 0 && <p className="rounded-xl bg-ink-50 p-4 text-sm text-ink-300 dark:bg-ink-900">Adicione uma categoria para começar.</p>}
              <button type="button" onClick={adicionar} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-ledger-500/30 bg-ledger-50 px-4 text-sm font-medium text-ledger-600 transition-colors hover:bg-ledger-100 dark:bg-ledger-500/10 dark:text-ledger-400"><Plus size={17} /> Adicionar categoria</button>
              <button type="button" disabled={saving || !planejamentoValido || !planejamentoAlterado} onClick={salvarPlanejamento} className="min-h-12 w-full rounded-xl bg-ledger-500 px-4 text-base font-semibold text-white shadow-card transition-colors hover:bg-ledger-600 disabled:cursor-not-allowed disabled:opacity-45">{saving ? 'Salvando…' : planejamentoAlterado ? 'Salvar planejamento' : 'Planejamento salvo'}</button>
            </div>
          </section>
        )}
      </div>
      <LancamentoModal
        open={Boolean(editingLancamento)} initialData={editingLancamento} categorias={categorias} permitirRecorrente={false}
        onClose={() => { setEditingLancamento(null); setDuplicatingLancamento(false); }} onSave={salvarLancamento}
        onDelete={excluirLancamento} copyMode={duplicatingLancamento}
        onDuplicate={(item) => { setEditingLancamento({ ...item, descricao: `${item.descricao} (cópia)`, origemRecorrenciaId: null, parcelamentoId: null, parcelaAtual: null, totalParcelas: null }); setDuplicatingLancamento(true); }}
      />
    </>
  );
}

function ResumoPlanejamento({ relatorio }) {
  const restante = relatorio.totalPlanejado - relatorio.totalGasto;
  return (
    <div className="grid grid-cols-2 gap-2">
      <Resumo label="Planejado" valor={relatorio.totalPlanejado} />
      <Resumo label="Gasto" valor={relatorio.totalGasto} tone="text-signal-500" />
      <div className="col-span-2 mx-auto w-[68%] sm:w-[48%]"><Resumo label="Restante" valor={restante} tone={restante < 0 ? 'text-signal-500' : 'text-ledger-600'} /></div>
    </div>
  );
}

function Resumo({ label, valor, tone = 'text-ink-900 dark:text-ink-50' }) {
  return <div className="min-w-0 overflow-hidden rounded-card bg-white p-3 text-center shadow-card dark:bg-ink-700"><p className="text-xs text-ink-300">{label}</p><p className={`money mt-1 whitespace-nowrap text-[clamp(0.875rem,4vw,1.25rem)] font-semibold ${tone}`}>{formatCurrency(valor)}</p></div>;
}

function Grupo({ grupo, categoriasById, alerta = false, onSelect }) {
  return (
    <section className={`overflow-hidden rounded-card border bg-white shadow-card dark:bg-ink-700 ${alerta ? 'border-signal-200 dark:border-signal-900' : 'border-ink-100 dark:border-ink-900'}`}>
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><h2 className="text-sm font-semibold text-ink-900 dark:text-ink-50">{grupo.nome}</h2>{alerta && <p className="mt-0.5 text-xs text-signal-500">Nenhum valor foi planejado para esta categoria.</p>}</div>
          <p className="money text-sm font-semibold text-signal-500">{formatCurrency(grupo.gasto)}</p>
        </div>
        {!alerta && (
          <>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <span className="text-ink-300">Planejado<b className="money mt-0.5 block text-ink-700 dark:text-ink-100">{formatCurrency(grupo.planejado)}</b></span>
              <span className="text-ink-300">Gasto<b className="money mt-0.5 block text-signal-500">{formatCurrency(grupo.gasto)}</b></span>
              <span className="text-ink-300">Restante<b className={`money mt-0.5 block ${grupo.restante < 0 ? 'text-signal-500' : 'text-ledger-600'}`}>{formatCurrency(grupo.restante)}</b></span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-pill bg-ink-50 dark:bg-ink-900"><div className={`h-full ${grupo.restante < 0 ? 'bg-signal-500' : 'bg-ledger-500'}`} style={{ width: `${grupo.percentualUsado}%` }} /></div>
          </>
        )}
      </div>
      {grupo.lancamentos.length > 0 && (
        <div className="divide-y divide-ink-100 border-t border-ink-100 dark:divide-ink-900 dark:border-ink-900">
          {grupo.lancamentos.map((item) => (
            <button type="button" key={item.id} onClick={() => onSelect(item)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-ink-50 dark:hover:bg-ink-900">
              <div className="min-w-0"><p className="truncate text-sm text-ink-700 dark:text-ink-100">{item.descricao}</p><p className="text-xs text-ink-300">{formatDateBR(item.dataVencimento)} · {item.categoriaId ? categoriasById[item.categoriaId] || 'Categoria removida' : 'Sem categoria'}</p></div>
              <span className="flex shrink-0 items-center gap-2"><span className="money text-sm text-signal-500">-{formatCurrency(item.valor)}</span><ChevronRight size={15} className="text-ink-300" /></span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
