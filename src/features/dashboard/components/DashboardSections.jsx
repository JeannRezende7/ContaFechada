import { Link } from 'react-router-dom';
import {
  CalendarClock,
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

export function InsightsCard({ insights }) {
  if (insights.length === 0) return null;

  return (
    <div className="mt-4 bg-white dark:bg-ink-700 rounded-card shadow-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0">
          <Sparkles size={15} strokeWidth={1.75} />
        </span>
        <p className="text-sm font-medium text-ink-900 dark:text-ink-50">Insights automáticos</p>
      </div>
      <ul className="flex flex-col gap-1.5">
        {insights.map((texto) => (
          <li key={texto} className="text-sm text-ink-500 pl-2">• {texto}</li>
        ))}
      </ul>
    </div>
  );
}

export function DashboardLinks() {
  return (
    <>
      <DashboardLink
        to="/relatorios"
        icon={PieChart}
        tone="bg-clay-50 text-clay-500"
        text="Veja a distribuição de gastos por categoria e a evolução mês a mês"
      />
      <DashboardLink
        to="/gestor"
        icon={Landmark}
        tone="bg-indigo-50 text-indigo-600"
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
