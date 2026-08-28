import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarRange, Check, ChevronRight, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import Topbar from '../../../components/layout/Topbar.jsx';
import MonthNav from '../../../components/ui/MonthNav.jsx';
import LoadingScreen from '../../../components/ui/LoadingScreen.jsx';
import FinancialTotalsGrid from '../../../components/ui/FinancialTotalsGrid.jsx';
import SectionTabs from '../../../components/ui/SectionTabs.jsx';
import CategoriaPicker from '../../categorias/components/CategoriaPicker.jsx';
import LancamentoModal from '../../lancamentos/components/LancamentoModal.jsx';
import { repositories } from '../../../repositories/index.js';
import { formatCurrency } from '../../../utils/formatCurrency.js';
import { getCurrentMonthKey } from '../../../utils/monthKey.js';
import { formatDateBR } from '../../../utils/formatDate.js';
import { calcularGastosPorCategoria, calcularSaldoLancamentos, calcularValorLivre, criarSugestao } from '../utils/valorLivre.js';

export default function ValorLivrePage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const uid = user?.uid;
  const requestedMonth = searchParams.get('mes');
  const [monthKey, setMonthKey] = useState(
    /^\d{4}-\d{2}$/.test(requestedMonth || '') ? requestedMonth : getCurrentMonthKey()
  );
  const [tab, setTab] = useState(
    searchParams.get('aba') === 'configuracoes' ? 'configuracoes' : 'acompanhamento'
  );
  const [lancamentos, setLancamentos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [distribuicoes, setDistribuicoes] = useState([]);
  const [personalizada, setPersonalizada] = useState(false);
  const [valorBaseMensal, setValorBaseMensal] = useState(null);
  const [gastosIniciais, setGastosIniciais] = useState({});
  const [editandoValorBase, setEditandoValorBase] = useState(false);
  const [valorBaseRascunho, setValorBaseRascunho] = useState('');
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
    ]).then(async ([items, categoryItems, saved]) => {
      const fotografia = await repositories.valorLivre.ensureFotografiaMensal(
        uid, monthKey, calcularSaldoLancamentos(items), calcularGastosPorCategoria(items)
      );
      if (cancelled) return;
      setLancamentos(items);
      setCategorias(categoryItems);
      setDistribuicoes(saved.distribuicoes);
      setPersonalizada(saved.personalizada);
      setValorBaseMensal(fotografia.valorBaseMensal);
      setGastosIniciais(fotografia.gastosIniciais);
      setEditandoValorBase(false);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [uid, monthKey]);

  const resumo = useMemo(
    () => calcularValorLivre(lancamentos, distribuicoes, valorBaseMensal, gastosIniciais),
    [lancamentos, distribuicoes, valorBaseMensal, gastosIniciais]
  );
  const categoriasDespesa = useMemo(
    () => categorias.filter((categoria) => categoria.tipo === 'despesa'),
    [categorias]
  );
  const gruposAcompanhamento = useMemo(() => {
    const despesas = lancamentos.filter((item) => item.tipo === 'despesa');
    const categoriasVinculadas = new Set(resumo.itens.map((item) => item.categoriaId).filter(Boolean));
    return {
      finalidades: resumo.itens.map((item) => ({
        ...item,
        lancamentos: despesas.filter((lancamento) => lancamento.categoriaId === item.categoriaId),
      })),
      fora: despesas.filter((lancamento) => (
        !lancamento.categoriaId || !categoriasVinculadas.has(lancamento.categoriaId)
      )),
    };
  }, [lancamentos, resumo.itens]);

  function atualizar(id, campo, valor) {
    setDistribuicoes((atual) => atual.map((item) => (
      item.id === id ? atualizarItem(item, campo, valor, Math.max(0, resumo.valorLivre)) : item
    )));
    setFeedback('');
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
        status: 'pago', observacoes: rest.observacoes || 'Criado pelo simulador de compra.',
        categoriaId: rest.categoriaId,
      });
      if (total - entrada > 0) await repositories.lancamentos.createParcelamento(uid, {
        tipo: 'despesa', descricao: rest.descricao, valorTotal: total - entrada,
        numParcelas: Math.max(1, Number(rest.numParcelas) || 1),
        dataVencimento: rest.dataVencimento,
        observacoes: rest.observacoes || 'Criado pelo simulador de compra.',
        categoriaId: rest.categoriaId,
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
      await repositories.lancamentos.removeGeneratedFromRecorrencia(
        uid, item.origemRecorrenciaId, futureRecorrencia ? { fromMonthKey: item.mesReferencia } : {}
      );
      if (allRecorrencia) await repositories.recorrencias.remove(uid, item.origemRecorrenciaId);
    } else {
      await repositories.lancamentos.remove(uid, item.id);
    }
    setEditingLancamento(null);
    setDuplicatingLancamento(false);
    await recarregarLancamentos();
  }

  function adicionar() {
    setDistribuicoes((atual) => [...atual, {
      id: crypto.randomUUID(), nome: '', categoriaId: '', valor: 0, percentual: 0,
    }]);
  }

  function gerarSugestao() {
    setDistribuicoes(criarSugestao(resumo.valorLivre, categorias));
    setFeedback('');
  }

  function iniciarEdicaoValorBase() {
    setValorBaseRascunho(String(valorBaseMensal ?? 0).replace('.', ','));
    setEditandoValorBase(true);
    setFeedback('');
  }

  async function confirmarValorBase() {
    const texto = String(valorBaseRascunho).trim();
    const numero = Number(texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto);
    if (!Number.isFinite(numero)) {
      setFeedback('Informe um valor livre válido.');
      return;
    }
    setSaving(true);
    try {
      const salvo = await repositories.valorLivre.setValorBaseMensal(uid, monthKey, numero);
      setValorBaseMensal(salvo);
      setEditandoValorBase(false);
      setFeedback('Valor livre do mês atualizado.');
    } catch {
      setFeedback('Não foi possível atualizar o valor livre. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function salvar() {
    setSaving(true);
    setFeedback('');
    try {
      const distribuicoesAtualizadas = resumo.itens.map((item) => ({
        ...item,
        valor: item.planejado,
      }));
      await Promise.all([
        repositories.valorLivre.setDistribuicao(uid, monthKey, distribuicoesAtualizadas, personalizada),
        repositories.valorLivre.setValorBaseMensal(uid, monthKey, valorBaseMensal),
      ]);
      setDistribuicoes(distribuicoesAtualizadas);
      setFeedback(personalizada
        ? 'Distribuição exclusiva deste mês salva.'
        : 'Regra padrão salva e atualizada para todos os meses.');
    } catch {
      setFeedback('Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <><Topbar title="Planejamento" icon={CalendarRange} /><LoadingScreen /></>;

  return (
    <>
      <Topbar title="Planejamento" icon={CalendarRange} />
      <SectionTabs area="planejamento" />
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <MonthNav monthKey={monthKey} onChange={setMonthKey} />

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-pill bg-ink-50 p-1 dark:bg-ink-900">
          <button type="button" onClick={() => setTab('acompanhamento')} className={`rounded-pill py-2 text-sm font-medium ${tab === 'acompanhamento' ? 'bg-ledger-500 text-white shadow-card' : 'text-ink-500 dark:text-ink-100'}`}>Acompanhamento</button>
          <button type="button" onClick={() => setTab('configuracoes')} className={`rounded-pill py-2 text-sm font-medium ${tab === 'configuracoes' ? 'bg-ledger-500 text-white shadow-card' : 'text-ink-500 dark:text-ink-100'}`}>Dividir valor</button>
        </div>

        {tab === 'acompanhamento' && (
          <div className="mt-4 space-y-3">
            <FinancialTotalsGrid
              incomeLabel="Receitas do mês"
              incomeValue={resumo.renda}
              expenseLabel="Contas fixas"
              expenseValue={resumo.contasFixas}
              balanceLabel="Valor livre"
              balanceValue={resumo.valorLivre}
            />
            {gruposAcompanhamento.finalidades.map((grupo) => (
              <LancamentosGrupo key={grupo.id} grupo={grupo} categorias={categorias} onSelect={setEditingLancamento} />
            ))}
            {gruposAcompanhamento.fora.length > 0 && (
              <LancamentosGrupo
                grupo={{ nome: 'Gastos sem limite definido', lancamentos: gruposAcompanhamento.fora }}
                categorias={categorias}
                alerta
                onSelect={setEditingLancamento}
              />
            )}
            {gruposAcompanhamento.finalidades.length === 0 && gruposAcompanhamento.fora.length === 0 && (
              <p className="rounded-card bg-white p-6 text-center text-sm text-ink-300 shadow-card dark:bg-ink-700">Nenhum limite ou gasto para acompanhar neste mês.</p>
            )}
          </div>
        )}

        {tab === 'configuracoes' && (<>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <Resumo label="Receitas do mês" valor={resumo.renda} />
          <Resumo label="Contas fixas" valor={resumo.contasFixas} tone="text-signal-500" />
          <div className={`col-span-2 mx-auto min-w-0 ${editandoValorBase ? 'w-full' : 'w-[48%]'}`}>
          <div className="rounded-card bg-white p-4 text-center shadow-card dark:bg-ink-700">
            <div className="flex items-center justify-between gap-2">
              <p className="flex-1 text-center text-xs text-ink-300">Valor livre do mês</p>
              {!editandoValorBase && (
                <button type="button" onClick={iniciarEdicaoValorBase} className="inline-flex items-center gap-1 text-xs font-medium text-ledger-600">
                  <Pencil size={13} /> Editar
                </button>
              )}
            </div>
            {editandoValorBase ? (
              <div className="mt-2 flex items-center gap-2">
                <span className="money text-sm text-ink-300">R$</span>
                <input
                  autoFocus
                  inputMode="decimal"
                  value={valorBaseRascunho}
                  onChange={(event) => setValorBaseRascunho(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') confirmarValorBase(); }}
                  aria-label="Novo valor livre do mês"
                  className="money min-w-0 flex-1 rounded-xl border border-ink-100 bg-white px-3 py-2 text-base dark:border-ink-900 dark:bg-ink-900"
                />
                <button type="button" disabled={saving} onClick={confirmarValorBase} aria-label="Salvar valor livre" className="rounded-full bg-ledger-500 p-2 text-white disabled:opacity-50"><Check size={16} /></button>
                <button type="button" onClick={() => setEditandoValorBase(false)} aria-label="Cancelar edição" className="rounded-full bg-ink-50 p-2 text-ink-400 dark:bg-ink-900"><X size={16} /></button>
              </div>
            ) : (
              <p className={`money mt-1 text-center text-xl font-semibold ${resumo.valorLivre < 0 ? 'text-signal-500' : 'text-ledger-600'}`}>{formatCurrency(resumo.valorLivre)}</p>
            )}
            <p className="mt-1 text-xs text-ink-300">Este valor fica salvo para o mês selecionado até você editar.</p>
          </div>
          </div>
        </div>

        <section className="mt-4 rounded-card bg-white p-4 shadow-card dark:bg-ink-700">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">Planeje o valor disponível</h2>
              <p className="mt-1 text-xs text-ink-300">
                Reserve uma parte para cada categoria e acompanhe quanto ainda pode gastar.
              </p>
            </div>
            <button
              type="button"
              onClick={gerarSugestao}
              className="inline-flex items-center gap-2 rounded-pill bg-ledger-50 px-3 py-2 text-xs font-medium text-ledger-700"
            >
              <Sparkles size={16} /> Criar sugestão
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-xl bg-ink-50 dark:bg-ink-900">
            <div className="p-3">
              <p className="text-[10px] text-ink-300">Valor para dividir</p>
              <p className="money mt-1 text-sm font-semibold text-ink-700 dark:text-ink-100">{formatCurrency(resumo.valorLivre)}</p>
            </div>
            <div className="border-x border-ink-100 p-3 dark:border-ink-700">
              <p className="text-[10px] text-ink-300">Já reservado</p>
              <p className="money mt-1 text-sm font-semibold text-ledger-600">{formatCurrency(resumo.valorLivre - resumo.naoDistribuido)}</p>
            </div>
            <div className="p-3">
              <p className="text-[10px] text-ink-300">Ainda disponível</p>
              <p className={`money mt-1 text-sm font-semibold ${resumo.naoDistribuido < 0 ? 'text-signal-500' : 'text-ledger-600'}`}>{formatCurrency(resumo.naoDistribuido)}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {resumo.itens.map((item) => (
              <div key={item.id} className="rounded-xl border border-ink-100 p-3 dark:border-ink-900">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(160px,1fr)_90px_minmax(190px,1fr)_140px_auto] lg:items-end">
                  <label className="text-xs text-ink-300">
                    Nome do limite
                    <input value={item.nome} onChange={(e) => atualizar(item.id, 'nome', e.target.value)} placeholder="Ex.: Alimentação" className="mt-1 w-full rounded-xl border border-ink-100 bg-white px-3 py-2.5 text-sm dark:border-ink-900 dark:bg-ink-900" />
                  </label>
                  <label className="text-xs text-ink-300">
                    Quanto reservar (%)
                    <input type="number" min="0" step="1" value={item.percentual ?? 0} onChange={(e) => atualizar(item.id, 'percentual', e.target.value)} className="money mt-1 w-full rounded-xl border border-ink-100 bg-white px-3 py-2.5 text-sm dark:border-ink-900 dark:bg-ink-900" />
                  </label>
                  <label className="text-xs text-ink-300">
                    Acompanhar gastos de
                    <div className="mt-1"><CategoriaPicker categorias={categoriasDespesa} value={item.categoriaId} onChange={(value) => atualizar(item.id, 'categoriaId', value)} /></div>
                  </label>
                  <label className="text-xs text-ink-300">
                    Valor reservado
                    <input type="number" min="0" step="0.01" value={item.planejado} onChange={(e) => atualizar(item.id, 'valor', e.target.value)} className="money mt-1 w-full rounded-xl border border-ink-100 bg-white px-3 py-2.5 text-sm dark:border-ink-900 dark:bg-ink-900" />
                  </label>
                  <button type="button" aria-label={`Remover ${item.nome || 'item'}`} onClick={() => setDistribuicoes((atual) => atual.filter((row) => row.id !== item.id))} className="flex h-11 w-11 items-center justify-center rounded-full text-ink-300 hover:bg-signal-50 hover:text-signal-500">
                    <Trash2 size={17} />
                  </button>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-pill bg-ink-50 dark:bg-ink-900">
                  <div className={`h-full ${item.disponivel < 0 ? 'bg-signal-500' : 'bg-ledger-500'}`} style={{ width: `${item.percentualUsado}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs">
                  <span className="text-ink-300">Gasto: <b className="money text-ink-500">{formatCurrency(item.gasto)}</b></span>
                  <span className={item.disponivel < 0 ? 'text-signal-500' : 'text-ledger-600'}>Disponível: <b className="money">{formatCurrency(item.disponivel)}</b></span>
                </div>
              </div>
            ))}
            {distribuicoes.length === 0 && <p className="rounded-xl bg-ink-50 p-4 text-sm text-ink-300 dark:bg-ink-900">Crie uma sugestão ou adicione seu primeiro limite.</p>}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4 dark:border-ink-900">
            <button type="button" onClick={adicionar} className="inline-flex items-center gap-2 rounded-xl bg-ledger-50 px-3 text-sm font-medium text-ledger-600 dark:bg-ink-900"><Plus size={16} /> Adicionar limite</button>
            <div className="text-right">
              <p className={`money text-sm font-semibold ${resumo.naoDistribuido < 0 ? 'text-signal-500' : 'text-ink-700 dark:text-ink-100'}`}>
                Ainda disponível: {formatCurrency(resumo.naoDistribuido)}
              </p>
              {resumo.naoDistribuido < 0 && <p className="text-xs text-signal-500">Os limites ultrapassam o valor disponível.</p>}
            </div>
          </div>
          <fieldset className="mt-4">
            <legend className="text-sm font-semibold text-ink-900 dark:text-ink-50">Onde deseja usar estes limites?</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors ${
                !personalizada
                  ? 'border-ledger-500 bg-ledger-50 dark:bg-ledger-500/10'
                  : 'border-ink-100 bg-white dark:border-ink-900 dark:bg-ink-900'
              }`}>
                <input type="radio" name="periodo-distribuicao" checked={!personalizada} onChange={() => { setPersonalizada(false); setFeedback(''); }} className="mt-1 accent-ledger-600" />
                <span>
                  <span className="block text-sm font-medium text-ink-900 dark:text-ink-50">Todos os meses</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-300">Usa estes limites como padrão daqui em diante.</span>
                </span>
              </label>
              <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors ${
                personalizada
                  ? 'border-ledger-500 bg-ledger-50 dark:bg-ledger-500/10'
                  : 'border-ink-100 bg-white dark:border-ink-900 dark:bg-ink-900'
              }`}>
                <input type="radio" name="periodo-distribuicao" checked={personalizada} onChange={() => { setPersonalizada(true); setFeedback(''); }} className="mt-1 accent-ledger-600" />
                <span>
                  <span className="block text-sm font-medium text-ink-900 dark:text-ink-50">Somente {monthKey.split('-').reverse().join('/')}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-300">Cria uma exceção apenas para este mês.</span>
                </span>
              </label>
            </div>
          </fieldset>
          <details className="mt-3 rounded-xl bg-ledger-50 p-3 text-xs text-ledger-700 dark:bg-ink-900 dark:text-ledger-200">
            <summary className="cursor-pointer font-medium">Como funciona?</summary>
            <p className="mt-2 leading-relaxed">O app calcula receitas menos contas fixas. Você reserva partes desse valor por categoria; cada novo gasto reduz o disponível da categoria correspondente.</p>
          </details>
          <button type="button" disabled={saving} onClick={salvar} className="mt-4 w-full rounded-pill bg-ledger-500 py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {saving ? 'Salvando…' : 'Salvar distribuição'}
          </button>
          {feedback && <p className="mt-2 text-center text-xs text-ink-300" aria-live="polite">{feedback}</p>}
        </section>
        </>)}
      </div>
      <LancamentoModal
        open={Boolean(editingLancamento)}
        initialData={editingLancamento}
        categorias={categorias}
        permitirRecorrente={false}
        onClose={() => { setEditingLancamento(null); setDuplicatingLancamento(false); }}
        onSave={salvarLancamento}
        onDelete={excluirLancamento}
        copyMode={duplicatingLancamento}
        onDuplicate={(item) => {
          setEditingLancamento({
            ...item,
            descricao: `${item.descricao} (cópia)`,
            origemRecorrenciaId: null,
            parcelamentoId: null,
            parcelaAtual: null,
            totalParcelas: null,
          });
          setDuplicatingLancamento(true);
        }}
      />
    </>
  );
}

function LancamentosGrupo({ grupo, categorias, alerta = false, onSelect }) {
  const categoriasById = Object.fromEntries(categorias.map((item) => [item.id, item.nome]));
  const total = grupo.lancamentos.reduce((soma, item) => soma + (Number(item.valor) || 0), 0);
  return (
    <section className={`overflow-hidden rounded-card border bg-white shadow-card dark:bg-ink-700 ${alerta ? 'border-signal-200 dark:border-signal-900' : 'border-transparent'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 p-4">
        <div>
          <h2 className={`text-sm font-semibold ${alerta ? 'text-signal-500' : 'text-ink-900 dark:text-ink-50'}`}>{grupo.nome || 'Sem nome'}</h2>
          {!alerta && grupo.planejado !== undefined && <p className="mt-0.5 text-xs text-ink-300">Limite: {formatCurrency(grupo.planejado)} · Disponível: {formatCurrency(grupo.disponivel)}</p>}
        </div>
        <p className={`money text-sm font-semibold ${total > 0 ? 'text-signal-500' : 'text-ink-300'}`}>{formatCurrency(total)} gastos</p>
      </div>
      {grupo.lancamentos.length > 0 ? (
        <div className="divide-y divide-ink-100 border-t border-ink-100 dark:divide-ink-900 dark:border-ink-900">
          {grupo.lancamentos.map((item) => (
            <button type="button" key={item.id} onClick={() => onSelect(item)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-ink-50 dark:hover:bg-ink-900">
              <div className="min-w-0">
                <p className="truncate text-sm text-ink-700 dark:text-ink-100">{item.descricao}</p>
                <p className="text-xs text-ink-300">{formatDateBR(item.dataVencimento)} · {item.categoriaId ? categoriasById[item.categoriaId] || 'Categoria removida' : 'Sem categoria'}{item.origemRecorrenciaId ? ' · Conta fixa' : ''}</p>
              </div>
              <span className="flex shrink-0 items-center gap-2"><span className="money text-sm font-medium text-signal-500">-{formatCurrency(item.valor)}</span><ChevronRight size={15} className="text-ink-300" /></span>
            </button>
          ))}
        </div>
      ) : <p className="border-t border-ink-100 px-4 py-3 text-xs text-ink-300 dark:border-ink-900">Nenhum lançamento neste limite.</p>}
    </section>
  );
}

function atualizarItem(item, campo, valor, valorLivre) {
  if (campo === 'percentual') {
    const percentual = Math.max(0, Number(valor) || 0);
    return {
      ...item,
      percentual: valor,
      valor: Math.max(0, Math.round((
        valorLivre * percentual / 100
      ) * 100) / 100),
    };
  }
  if (campo === 'valor') {
    const numero = Math.max(0, Number(valor) || 0);
    return {
      ...item,
      valor,
      percentual: valorLivre > 0 ? Math.round((numero / valorLivre) * 1000) / 10 : 0,
    };
  }
  return { ...item, [campo]: valor };
}

function Resumo({ label, valor, tone = 'text-ink-900 dark:text-ink-50' }) {
  return (
    <div className="rounded-card bg-white p-4 text-center shadow-card dark:bg-ink-700">
      <p className="text-xs text-ink-300">{label}</p>
      <p className={`money mt-1 text-xl font-semibold ${tone}`}>{formatCurrency(valor)}</p>
    </div>
  );
}
