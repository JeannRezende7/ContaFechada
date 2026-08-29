import { Link } from 'react-router-dom';
import {
  CalendarClock,
  CalendarRange,
  ChevronRight,
  Clock,
  Flame,
  Landmark,
  Pencil,
  PieChart,
  PiggyBank,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { formatCurrency } from '../../../utils/formatCurrency.js';
import { formatDateBR } from '../../../utils/formatDate.js';
import { formatMonthShort } from '../../../utils/monthKey.js';

export function MonthlyComparisonCard({ comparacao, monthKey }) {
  if (!comparacao || comparacao.percentual == null) return null;
  const increased = comparacao.percentual > 0;

  return (
    <div className="mt-4 bg-white dark:bg-ink-700 rounded-card shadow-card p-4 flex items-center gap-3">
      <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
        increased ? 'bg-signal-50 text-signal-500' : 'bg-ledger-50 text-ledger-600'
      }`}>
        {increased
          ? <TrendingUp size={18} strokeWidth={1.75} />
          : <TrendingDown size={18} strokeWidth={1.75} />}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-ink-300">
          {formatMonthShort(monthKey)} · despesas vs. mês anterior
        </p>
        <p className="text-sm font-medium text-ink-900 dark:text-ink-50">
          {formatCurrency(comparacao.despesaAtual)}{' '}
          <span className={increased ? 'text-signal-500' : 'text-ledger-600'}>
            {increased ? '▲' : '▼'} {Math.abs(Math.round(comparacao.percentual))}%
          </span>{' '}
          em relação ao mês anterior
        </p>
      </div>
    </div>
  );
}

export function DailyBudgetCard({ gastoDiario, diasRestantes }) {
  if (gastoDiario == null) return null;

  return (
    <div className="mt-4 bg-white dark:bg-ink-700 rounded-card shadow-card p-4 flex items-center gap-3">
      <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
        gastoDiario > 0 ? 'bg-ledger-500 text-white' : 'bg-signal-500 text-white'
      }`}>
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
  );
}

export function FreeValueSummary({ resumo, monthKey }) {
  if (!resumo) return null;
  const totalPlanejado = Math.max(0, resumo.totalPlanejado);
  const totalGasto = resumo.totalGasto;
  const restante = totalPlanejado - totalGasto;

  return (
    <Link
      to={monthKey ? `/planejamento?mes=${monthKey}` : '/planejamento'}
      className="mt-4 block rounded-card bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover dark:bg-ink-700"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ledger-50 text-ledger-600">
          <WalletCards size={18} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div><p className="text-sm font-semibold text-ink-900 dark:text-ink-50">Planejamento do mês</p><p className="mt-0.5 text-xs text-ink-300">Limites por categoria e gastos realizados</p></div>
            <ChevronRight size={17} className="shrink-0 text-ink-300" />
          </div>
          {resumo.itens.length === 0 ? <p className="mt-3 rounded-xl bg-ink-50 p-3 text-sm text-ink-300 dark:bg-ink-900">Nenhum limite definido. Toque para criar seu planejamento.</p> : <>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <span className="text-ink-300">Planejado<b className="money mt-1 block text-ink-700 dark:text-ink-100">{formatCurrency(totalPlanejado)}</b></span>
              <span className="text-ink-300">Gasto<b className="money mt-1 block text-signal-500">{formatCurrency(totalGasto)}</b></span>
              <span className="text-ink-300">Restante<b className={`money mt-1 block ${restante < 0 ? 'text-signal-500' : 'text-ledger-600'}`}>{formatCurrency(restante)}</b></span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {resumo.itens.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-ink-100 bg-ink-50/60 p-3 dark:border-ink-900 dark:bg-ink-900"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-xs font-medium text-ink-700 dark:text-ink-100">
                      {item.nome || 'Sem nome'}
                    </p>
                  </div>
                  <p className={`money mt-1 text-base font-semibold ${
                    item.restante < 0 ? 'text-signal-500' : 'text-ledger-600'
                  }`}>
                    {formatCurrency(item.restante)}
                  </p>
                  <p className="text-[10px] text-ink-300">Restante</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-white dark:bg-ink-700">
                    <div
                      className={`h-full rounded-pill ${
                        item.restante < 0 ? 'bg-signal-500' : 'bg-ledger-500'
                      }`}
                      style={{ width: `${item.percentualUsado}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between gap-2 text-[10px] text-ink-300">
                    <span>Gasto: <b className="money">{formatCurrency(item.gasto)}</b></span>
                    <span>Limite: <b className="money">{formatCurrency(item.planejado)}</b></span>
                  </div>
                </div>
              ))}
            </div>
          </>}
        </div>
      </div>
    </Link>
  );
}

export function DashboardHighlights({ indicators }) {
  if (!indicators) return null;

  return (
    <div className="mt-4 bg-white dark:bg-ink-700 rounded-card shadow-card divide-y divide-ink-100 dark:divide-ink-900">
      {indicators.maiorGasto && (
        <HighlightRow
          icon={Flame}
          tone="bg-clay-500"
          label="Maior gasto do mês"
          description={indicators.maiorGasto.descricao}
          detail={formatCurrency(indicators.maiorGasto.valor)}
          detailClassName="money text-sm font-semibold text-ink-900 dark:text-ink-50"
        />
      )}
      {indicators.ultimoLancamento && (
        <HighlightRow
          icon={Clock}
          tone="bg-mint-500"
          label="Último lançamento"
          description={indicators.ultimoLancamento.descricao}
          detail={formatDateBR(indicators.ultimoLancamento.dataVencimento)}
        />
      )}
      {indicators.proximoVencimento && (
        <HighlightRow
          icon={CalendarClock}
          tone="bg-pending-500"
          label="Próximo vencimento"
          description={indicators.proximoVencimento.descricao}
          detail={formatDateBR(indicators.proximoVencimento.dataVencimento)}
        />
      )}
    </div>
  );
}

function HighlightRow({ icon: Icon, tone, label, description, detail, detailClassName = 'text-xs text-ink-300' }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <span className={`w-9 h-9 rounded-full ${tone} text-white flex items-center justify-center shrink-0`}>
        <Icon size={16} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-300">{label}</p>
        <p className="text-sm font-medium text-ink-900 dark:text-ink-50 truncate">{description}</p>
      </div>
      <span className={`${detailClassName} shrink-0`}>{detail}</span>
    </div>
  );
}

export function SavingsChallenge({
  editando,
  meta,
  metaInput,
  economiaAtual,
  economiaPct,
  onStartEditing,
  onInputChange,
  onSave,
}) {
  return (
    <div className="mt-4 bg-white dark:bg-ink-700 rounded-card shadow-card p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-gold-500 text-white flex items-center justify-center shrink-0">
            <Target size={15} strokeWidth={1.75} />
          </span>
          <p className="text-sm font-medium text-ink-900 dark:text-ink-50">Desafio de economia</p>
        </div>
        {!editando && (
          <button
            type="button"
            onClick={onStartEditing}
            aria-label="Editar meta de economia"
            className="text-ink-300 hover:text-ink-500 transition-colors"
          >
            <Pencil size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      {editando ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            type="number"
            step="0.01"
            min="0"
            placeholder="Meta do mês, ex: 500"
            value={metaInput}
            onChange={(event) => onInputChange(event.target.value)}
            className="flex-1 rounded-xl border border-ink-100 bg-white dark:bg-ink-900 dark:border-ink-700 text-ink-900 dark:text-ink-50 px-3 py-2 text-sm focus:border-ledger-500 transition-colors"
          />
          <button
            type="button"
            onClick={onSave}
            className="rounded-pill bg-ledger-500 text-white px-4 py-2 text-sm font-medium hover:bg-ledger-600 transition-colors"
          >
            Salvar
          </button>
        </div>
      ) : meta ? (
        <>
          <div className="h-2.5 rounded-pill bg-ink-50 dark:bg-ink-900 overflow-hidden mb-2">
            <div className="h-full rounded-pill bg-gold-500 transition-all" style={{ width: `${economiaPct}%` }} />
          </div>
          <p className="text-xs text-ink-300">
            {formatCurrency(economiaAtual)} / {formatCurrency(meta)} · {economiaPct}%
          </p>
        </>
      ) : (
        <p className="text-xs text-ink-300">Defina uma meta de economia para este mês.</p>
      )}
    </div>
  );
}

export function InsightsCard({ insights, locked = false, onUnlock }) {
  if (!locked && insights.length === 0) return null;

  return (
    <div className="mt-4 bg-white dark:bg-ink-700 rounded-card shadow-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-8 h-8 rounded-full bg-ledger-500 text-white flex items-center justify-center shrink-0">
          <Sparkles size={15} strokeWidth={1.75} />
        </span>
        <p className="text-sm font-medium text-ink-900 dark:text-ink-50">Insights automáticos</p>
      </div>
      <ul className="flex flex-col gap-1.5">
        {locked && (
          <li className="rounded-xl bg-ink-50 p-3 text-sm text-ink-500 dark:bg-ink-900">
            Insights explicados, gastos incomuns e detecção de assinaturas fazem parte do Pro.
            <button onClick={onUnlock} className="mt-1.5 block text-xs font-medium text-ledger-600 hover:underline">Conhecer o Pro</button>
          </li>
        )}
        {insights.map((insight, index) => (
          <li key={`${insight.title || insight}-${index}`} className="rounded-xl bg-ink-50 p-3 text-sm dark:bg-ink-900">
            <p className="font-medium text-ink-700 dark:text-ink-100">{insight.title || insight}</p>
            {insight.detail && <p className="mt-1 text-xs text-ink-300">{insight.detail}</p>}
            {typeof insight === 'object' && (
              <Link to={`/${insight.query ? `?q=${encodeURIComponent(insight.query)}` : ''}`} className="mt-1.5 inline-block text-xs font-medium text-ledger-600 hover:underline">
                Ver lançamentos relacionados
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DashboardLinks() {
  return (
    <>
      <DashboardLink
        to="/planejamento"
        icon={CalendarRange}
        tone="bg-ledger-50 text-ledger-600"
        text="Defina limites por categoria e compare o planejado com seus gastos"
      />
      <DashboardLink
        to="/resumo/relatorios"
        icon={PieChart}
        tone="bg-clay-50 text-clay-500"
        text="Veja a distribuição de gastos por categoria e a evolução mês a mês"
        className="mt-3"
      />
      <DashboardLink
        to="/planejamento/gestor"
        icon={Landmark}
        tone="bg-ledger-50 text-ledger-600"
        text="Veja quanto da sua renda está comprometida e o que está parcelado"
        className="mt-3"
      />
    </>
  );
}

function DashboardLink({ to, icon: Icon, tone, text, className = 'mt-4' }) {
  return (
    <Link
      to={to}
      className={`${className} flex items-center gap-2.5 text-ink-500 text-sm bg-white dark:bg-ink-700 rounded-card shadow-card hover:shadow-card-hover p-4 transition-shadow`}
    >
      <span className={`w-8 h-8 rounded-full ${tone} flex items-center justify-center shrink-0`}>
        <Icon size={16} strokeWidth={1.75} />
      </span>
      <span className="flex-1">{text}</span>
      <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-ink-300" />
    </Link>
  );
}
