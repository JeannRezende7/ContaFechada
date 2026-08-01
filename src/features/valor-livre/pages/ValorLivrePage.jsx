import { useEffect, useMemo, useState } from 'react';
import { Check, Pencil, Plus, Sparkles, Trash2, WalletCards, X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import Topbar from '../../../components/layout/Topbar.jsx';
import MonthNav from '../../../components/ui/MonthNav.jsx';
import LoadingScreen from '../../../components/ui/LoadingScreen.jsx';
import CategoriaPicker from '../../categorias/components/CategoriaPicker.jsx';
import { repositories } from '../../../repositories/index.js';
import { formatCurrency } from '../../../utils/formatCurrency.js';
import { getCurrentMonthKey } from '../../../utils/monthKey.js';
import { calcularGastosPorCategoria, calcularSaldoLancamentos, calcularValorLivre, criarSugestao } from '../utils/valorLivre.js';

export default function ValorLivrePage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey());
  const [lancamentos, setLancamentos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [distribuicoes, setDistribuicoes] = useState([]);
  const [metas, setMetas] = useState([]);
  const [personalizada, setPersonalizada] = useState(false);
  const [valorBaseMensal, setValorBaseMensal] = useState(null);
  const [gastosIniciais, setGastosIniciais] = useState({});
  const [editandoValorBase, setEditandoValorBase] = useState(false);
  const [valorBaseRascunho, setValorBaseRascunho] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      repositories.lancamentos.listByMonth(uid, monthKey),
      repositories.categorias.ensureDefaults(uid),
      repositories.valorLivre.getDistribuicao(uid, monthKey),
      repositories.metas.list(uid),
    ]).then(async ([items, categoryItems, saved, goalItems]) => {
      const fotografia = await repositories.valorLivre.ensureFotografiaMensal(
        uid, monthKey, calcularSaldoLancamentos(items), calcularGastosPorCategoria(items)
      );
      if (cancelled) return;
      setLancamentos(items);
      setCategorias(categoryItems);
      setDistribuicoes(saved.distribuicoes);
      setPersonalizada(saved.personalizada);
      setMetas(goalItems);
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

  function atualizar(id, campo, valor) {
    setDistribuicoes((atual) => atual.map((item) => (
      item.id === id ? atualizarItem(item, campo, valor, Math.max(0, resumo.valorLivre)) : item
    )));
    setFeedback('');
  }

  function adicionar() {
    setDistribuicoes((atual) => [...atual, {
      id: crypto.randomUUID(), nome: '', categoriaId: '', metaId: '', valor: 0, percentual: 0,
    }]);
  }

  function gerarSugestao() {
    const metaPoupanca = metas.find((meta) => {
      const nome = String(meta.nome || '').toLocaleLowerCase('pt-BR');
      return ['emergência', 'reserva', 'poupança', 'investimento'].some((termo) => nome.includes(termo));
    });
    const sugestao = criarSugestao(resumo.valorLivre, categorias);
    setDistribuicoes(sugestao.map((item, index) => (
      index === 2 && metaPoupanca ? { ...item, metaId: metaPoupanca.id } : item
    )));
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

  if (loading) return <><Topbar title="Valor livre" icon={WalletCards} /><LoadingScreen /></>;

  return (
    <>
      <Topbar title="Valor livre" icon={WalletCards} />
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <MonthNav monthKey={monthKey} onChange={setMonthKey} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
          <Resumo label="Renda do mês" valor={resumo.renda} />
          <Resumo label="Contas fixas" valor={resumo.contasFixas} tone="text-signal-500" />
          <div className="rounded-card bg-white p-4 shadow-card dark:bg-ink-700">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-ink-300">Valor livre definido para o mês</p>
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
              <p className={`money mt-1 text-xl font-semibold ${resumo.valorLivre < 0 ? 'text-signal-500' : 'text-ledger-600'}`}>{formatCurrency(resumo.valorLivre)}</p>
            )}
            <p className="mt-1 text-[11px] text-ink-300">Fotografia mensal; permanece fixa até você editar.</p>
          </div>
        </div>

        <section className="mt-4 rounded-card bg-white p-4 shadow-card dark:bg-ink-700">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">Distribuição do valor livre</h2>
              <p className="mt-1 text-xs text-ink-300">
                Os percentuais usam o valor livre fixado no início do mês. Novos gastos consomem os limites sem alterar essa base.
              </p>
            </div>
            <button
              type="button"
              onClick={gerarSugestao}
              className="inline-flex items-center gap-2 rounded-pill bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-600"
            >
              <Sparkles size={14} /> Gerar sugestão
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {resumo.itens.map((item) => (
              <div key={item.id} className="rounded-xl border border-ink-100 p-3 dark:border-ink-900">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(160px,1fr)_90px_minmax(190px,1fr)_140px_auto] lg:items-end">
                  <label className="text-xs text-ink-300">
                    Finalidade
                    <input value={item.nome} onChange={(e) => atualizar(item.id, 'nome', e.target.value)} placeholder="Ex.: Comida" className="mt-1 w-full rounded-xl border border-ink-100 bg-white px-3 py-2.5 text-sm dark:border-ink-900 dark:bg-ink-900" />
                  </label>
                  <label className="text-xs text-ink-300">
                    % do valor livre
                    <input type="number" min="0" step="1" value={item.percentual ?? 0} onChange={(e) => atualizar(item.id, 'percentual', e.target.value)} className="money mt-1 w-full rounded-xl border border-ink-100 bg-white px-3 py-2.5 text-sm dark:border-ink-900 dark:bg-ink-900" />
                  </label>
                  <label className="text-xs text-ink-300">
                    Categoria para acompanhar
                    <div className="mt-1"><CategoriaPicker categorias={categoriasDespesa} value={item.categoriaId} onChange={(value) => atualizar(item.id, 'categoriaId', value)} /></div>
                  </label>
                  <label className="text-xs text-ink-300">
                    Valor reservado
                    <input type="number" min="0" step="0.01" value={item.planejado} onChange={(e) => atualizar(item.id, 'valor', e.target.value)} className="money mt-1 w-full rounded-xl border border-ink-100 bg-white px-3 py-2.5 text-sm dark:border-ink-900 dark:bg-ink-900" />
                  </label>
                  <button type="button" aria-label={`Remover ${item.nome || 'item'}`} onClick={() => setDistribuicoes((atual) => atual.filter((row) => row.id !== item.id))} className="mb-1 text-ink-300 hover:text-signal-500">
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
                <label className="mt-3 block text-xs text-ink-300">
                  Meta vinculada (opcional)
                  <select
                    value={item.metaId || ''}
                    onChange={(e) => atualizar(item.id, 'metaId', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-ink-100 bg-white px-3 py-2.5 text-sm dark:border-ink-900 dark:bg-ink-900 sm:max-w-sm"
                  >
                    <option value="">Nenhuma meta</option>
                    {metas.map((meta) => <option key={meta.id} value={meta.id}>{meta.nome}</option>)}
                  </select>
                </label>
                {item.metaId && (() => {
                  const meta = metas.find((goal) => goal.id === item.metaId);
                  if (!meta) return null;
                  const alvo = Number(meta.valorAlvo) || 0;
                  const atual = Number(meta.valorAtual) || 0;
                  const progresso = alvo > 0 ? Math.min(100, Math.round((atual / alvo) * 100)) : 0;
                  return (
                    <div className="mt-2 rounded-xl bg-gold-50 px-3 py-2 text-xs text-gold-800 dark:bg-ink-900 dark:text-gold-200">
                      Meta “{meta.nome}”: <b className="money">{formatCurrency(atual)}</b> de <b className="money">{formatCurrency(alvo)}</b> ({progresso}%)
                      <span className="block text-[11px] opacity-75">Os lançamentos desta categoria mostram o reservado no mês; o progresso acumulado continua sendo controlado em Metas.</span>
                    </div>
                  );
                })()}
              </div>
            ))}
            {distribuicoes.length === 0 && <p className="rounded-xl bg-ink-50 p-4 text-sm text-ink-300 dark:bg-ink-900">Gere uma sugestão ou adicione sua primeira finalidade.</p>}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4 dark:border-ink-900">
            <button type="button" onClick={adicionar} className="inline-flex items-center gap-2 text-sm font-medium text-ledger-600"><Plus size={16} /> Adicionar finalidade</button>
            <div className="text-right">
              <p className={`money text-sm font-semibold ${resumo.naoDistribuido < 0 ? 'text-signal-500' : 'text-ink-700 dark:text-ink-100'}`}>
                Não distribuído: {formatCurrency(resumo.naoDistribuido)}
              </p>
              {resumo.naoDistribuido < 0 && <p className="text-xs text-signal-500">A distribuição ultrapassa o valor livre.</p>}
            </div>
          </div>
          <label className="mt-4 flex items-center gap-2 rounded-xl bg-ink-50 px-3 py-2.5 text-sm text-ink-500 dark:bg-ink-900 dark:text-ink-100">
            <input
              type="checkbox"
              checked={personalizada}
              onChange={(event) => { setPersonalizada(event.target.checked); setFeedback(''); }}
            />
            Usar uma distribuição diferente somente em {monthKey.split('-').reverse().join('/')}
          </label>
          <p className="mt-3 rounded-xl bg-indigo-50 p-3 text-xs text-indigo-700 dark:bg-ink-900 dark:text-indigo-200">
            O valor livre é registrado uma vez por mês a partir das entradas menos saídas existentes. Você pode corrigi-lo no campo acima; depois disso, novos lançamentos apenas atualizam os gastos das finalidades.
          </p>
          <button type="button" disabled={saving} onClick={salvar} className="mt-4 w-full rounded-pill bg-ledger-500 py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {saving ? 'Salvando…' : personalizada ? 'Salvar somente para este mês' : 'Salvar regra para todos os meses'}
          </button>
          {feedback && <p className="mt-2 text-center text-xs text-ink-300" aria-live="polite">{feedback}</p>}
        </section>
      </div>
    </>
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
    <div className="rounded-card bg-white p-4 shadow-card dark:bg-ink-700">
      <p className="text-xs text-ink-300">{label}</p>
      <p className={`money mt-1 text-xl font-semibold ${tone}`}>{formatCurrency(valor)}</p>
    </div>
  );
}
