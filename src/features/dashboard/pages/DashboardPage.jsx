import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, PieChart, ChevronRight, Home, PiggyBank,
  TrendingUp, TrendingDown, Flame, Clock, CalendarClock, Sparkles, Target, Pencil, Landmark,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import {
  getDashboardData,
  getMetaEconomiaMensal,
  setMetaEconomiaMensal,
} from '../services/dashboardService.js';
import { listCategorias } from '../../categorias/services/categoriasService.js';
import { computeInsights } from '../utils/insights.js';
import IndicatorCard from '../../../components/ui/IndicatorCard.jsx';
import LoadingScreen from '../../../components/ui/LoadingScreen.jsx';
import MonthNav from '../../../components/ui/MonthNav.jsx';
import Topbar from '../../../components/layout/Topbar.jsx';
import { getCurrentMonthKey, daysRemainingInMonth, daysInMonth, formatMonthShort } from '../../../utils/monthKey.js';
import { formatCurrency } from '../../../utils/formatCurrency.js';
import { formatDateBR } from '../../../utils/formatDate.js';

export default function DashboardPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey());
  const [indicators, setIndicators] = useState(null);
  const [comparacao, setComparacao] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [metaEconomia, setMetaEconomia] = useState(null);
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [metaInput, setMetaInput] = useState('');

  useEffect(() => {
    if (!uid) return;
    getDashboardData(uid, monthKey).then(({ indicators, comparacao }) => {
      setIndicators(indicators);
      setComparacao(comparacao);
    });
  }, [uid, monthKey]);

  useEffect(() => {
    if (!uid) return;
    listCategorias(uid).then(setCategorias);
    getMetaEconomiaMensal(uid).then((valor) => setMetaEconomia(valor));
  }, [uid]);

  const categoriasById = useMemo(
    () => Object.fromEntries(categorias.map((c) => [c.id, c])),
    [categorias]
  );

  const diasRestantes = daysRemainingInMonth(monthKey);
  const diasNoMes = daysInMonth(monthKey);
  const gastoDiario = indicators && diasRestantes > 0 ? indicators.saldoMes / diasRestantes : null;

  const insights = useMemo(() => {
    if (!indicators || !comparacao) return [];
    return computeInsights({
      despesaPorCategoriaAtual: comparacao.porCategoriaAtual,
      despesaPorCategoriaAnterior: comparacao.porCategoriaAnterior,
      categoriasById,
      saldoMes: indicators.saldoMes,
      diasRestantes,
      diasNoMes,
    });
  }, [indicators, comparacao, categoriasById, diasRestantes, diasNoMes]);

  async function handleSalvarMeta() {
    const valor = Number(metaInput);
    if (!valor) return;
    await setMetaEconomiaMensal(uid, valor);
    setMetaEconomia(valor);
    setEditandoMeta(false);
  }

  const economiaAtual = indicators ? Math.max(0, indicators.saldoMes) : 0;
  const economiaPct = metaEconomia > 0 ? Math.min(100, Math.round((economiaAtual / metaEconomia) * 100)) : 0;

  if (!indicators) {
    return (
      <>
        <Topbar title="Início" icon={Home} />
        <LoadingScreen />
      </>
    );
  }

  return (
    <>
      <Topbar title="Início" icon={Home} />
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <MonthNav monthKey={monthKey} onChange={setMonthKey} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <IndicatorCard
            label="Saldo do mês"
            value={indicators?.saldoMes ?? 0}
            tone={indicators && indicators.saldoMes < 0 ? 'negative' : 'positive'}
            icon={Wallet}
          />
          <IndicatorCard
            label="A pagar (mês)"
            value={indicators?.totalAPagar ?? 0}
            tone="pending"
            icon={ArrowDownCircle}
            hint={indicators?.contasAtrasadas ? `${indicators.contasAtrasadas} atrasada(s)` : undefined}
          />
          <IndicatorCard
            label="A receber (mês)"
            value={indicators?.totalAReceber ?? 0}
            tone="positive"
            icon={ArrowUpCircle}
          />
        </div>

        {comparacao && comparacao.percentual != null && (
          <div className="mt-4 bg-white dark:bg-ink-700 rounded-card shadow-card p-4 flex items-center gap-3">
            <span
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                comparacao.percentual > 0 ? 'bg-signal-50 text-signal-500' : 'bg-ledger-50 text-ledger-600'
              }`}
            >
              {comparacao.percentual > 0 ? <TrendingUp size={18} strokeWidth={1.75} /> : <TrendingDown size={18} strokeWidth={1.75} />}
            </span>
            <div className="min-w-0">
              <p className="text-xs text-ink-300">
                {formatMonthShort(monthKey)} · despesas vs. mês anterior
              </p>
              <p className="text-sm font-medium text-ink-900 dark:text-ink-50">
                {formatCurrency(comparacao.despesaAtual)}{' '}
                <span className={comparacao.percentual > 0 ? 'text-signal-500' : 'text-ledger-600'}>
                  {comparacao.percentual > 0 ? '▲' : '▼'} {Math.abs(Math.round(comparacao.percentual))}%
                </span>{' '}
                em relação ao mês anterior
              </p>
            </div>
          </div>
        )}

        {gastoDiario != null && (
          <div className="mt-4 bg-white dark:bg-ink-700 rounded-card shadow-card p-4 flex items-center gap-3">
            <span
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                gastoDiario > 0 ? 'bg-ledger-500 text-white' : 'bg-signal-500 text-white'
              }`}
            >
              <PiggyBank size={18} strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-ink-300">
                Gasto diário recomendado · {diasRestantes} dia{diasRestantes === 1 ? '' : 's'} restante{diasRestantes === 1 ? '' : 's'}
              </p>
              {gastoDiario > 0 ? (
                <p className="money text-lg font-semibold text-ledger-600">{formatCurrency(gastoDiario)}/dia</p>
              ) : (
                <p className="text-sm font-medium text-signal-500">
                  Saldo do mês já negativo — evite novos gastos até equilibrar.
                </p>
              )}
            </div>
          </div>
        )}

        {indicators && (
          <div className="mt-4 bg-white dark:bg-ink-700 rounded-card shadow-card divide-y divide-ink-100 dark:divide-ink-900">
            {indicators.maiorGasto && (
              <div className="flex items-center gap-3 p-4">
                <span className="w-9 h-9 rounded-full bg-clay-500 text-white flex items-center justify-center shrink-0">
                  <Flame size={16} strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-ink-300">Maior gasto do mês</p>
                  <p className="text-sm font-medium text-ink-900 dark:text-ink-50 truncate">{indicators.maiorGasto.descricao}</p>
                </div>
                <span className="money text-sm font-semibold text-ink-900 dark:text-ink-50 shrink-0">
                  {formatCurrency(indicators.maiorGasto.valor)}
                </span>
              </div>
            )}
            {indicators.ultimoLancamento && (
              <div className="flex items-center gap-3 p-4">
                <span className="w-9 h-9 rounded-full bg-mint-500 text-white flex items-center justify-center shrink-0">
                  <Clock size={16} strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-ink-300">Último lançamento</p>
                  <p className="text-sm font-medium text-ink-900 dark:text-ink-50 truncate">{indicators.ultimoLancamento.descricao}</p>
                </div>
                <span className="text-xs text-ink-300 shrink-0">{formatDateBR(indicators.ultimoLancamento.dataVencimento)}</span>
              </div>
            )}
            {indicators.proximoVencimento && (
              <div className="flex items-center gap-3 p-4">
                <span className="w-9 h-9 rounded-full bg-pending-500 text-white flex items-center justify-center shrink-0">
                  <CalendarClock size={16} strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-ink-300">Próximo vencimento</p>
                  <p className="text-sm font-medium text-ink-900 dark:text-ink-50 truncate">{indicators.proximoVencimento.descricao}</p>
                </div>
                <span className="text-xs text-ink-300 shrink-0">{formatDateBR(indicators.proximoVencimento.dataVencimento)}</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 bg-white dark:bg-ink-700 rounded-card shadow-card p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-gold-500 text-white flex items-center justify-center shrink-0">
                <Target size={15} strokeWidth={1.75} />
              </span>
              <p className="text-sm font-medium text-ink-900 dark:text-ink-50">Desafio de economia</p>
            </div>
            {!editandoMeta && (
              <button
                onClick={() => {
                  setMetaInput(metaEconomia ? String(metaEconomia) : '');
                  setEditandoMeta(true);
                }}
                aria-label="Editar meta de economia"
                className="text-ink-300 hover:text-ink-500 transition-colors"
              >
                <Pencil size={14} strokeWidth={2} />
              </button>
            )}
          </div>

          {editandoMeta ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="number"
                step="0.01"
                min="0"
                placeholder="Meta do mês, ex: 500"
                value={metaInput}
                onChange={(e) => setMetaInput(e.target.value)}
                className="flex-1 rounded-xl border border-ink-100 bg-white dark:bg-ink-900 dark:border-ink-700 text-ink-900 dark:text-ink-50 px-3 py-2 text-sm focus:border-ledger-500 transition-colors"
              />
              <button
                onClick={handleSalvarMeta}
                className="rounded-pill bg-ledger-500 text-white px-4 py-2 text-sm font-medium hover:bg-ledger-600 transition-colors"
              >
                Salvar
              </button>
            </div>
          ) : metaEconomia ? (
            <>
              <div className="h-2.5 rounded-pill bg-ink-50 dark:bg-ink-900 overflow-hidden mb-2">
                <div className="h-full rounded-pill bg-gold-500 transition-all" style={{ width: `${economiaPct}%` }} />
              </div>
              <p className="text-xs text-ink-300">
                {formatCurrency(economiaAtual)} / {formatCurrency(metaEconomia)} · {economiaPct}%
              </p>
            </>
          ) : (
            <p className="text-xs text-ink-300">Defina uma meta de economia para este mês.</p>
          )}
        </div>

        {insights.length > 0 && (
          <div className="mt-4 bg-white dark:bg-ink-700 rounded-card shadow-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0">
                <Sparkles size={15} strokeWidth={1.75} />
              </span>
              <p className="text-sm font-medium text-ink-900 dark:text-ink-50">Insights automáticos</p>
            </div>
            <ul className="flex flex-col gap-1.5">
              {insights.map((texto, i) => (
                <li key={i} className="text-sm text-ink-500 pl-2">
                  • {texto}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link
          to="/relatorios"
          className="mt-4 flex items-center gap-2.5 text-ink-500 text-sm bg-white dark:bg-ink-700 rounded-card shadow-card hover:shadow-card-hover p-4 transition-shadow"
        >
          <span className="w-8 h-8 rounded-full bg-clay-50 text-clay-500 flex items-center justify-center shrink-0">
            <PieChart size={16} strokeWidth={1.75} />
          </span>
          <span className="flex-1">Veja a distribuição de gastos por categoria e a evolução mês a mês</span>
          <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-ink-300" />
        </Link>

        <Link
          to="/gestor"
          className="mt-3 flex items-center gap-2.5 text-ink-500 text-sm bg-white dark:bg-ink-700 rounded-card shadow-card hover:shadow-card-hover p-4 transition-shadow"
        >
          <span className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Landmark size={16} strokeWidth={1.75} />
          </span>
          <span className="flex-1">Veja quanto da sua renda está comprometida e o que está parcelado</span>
          <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-ink-300" />
        </Link>
      </div>
    </>
  );
}
