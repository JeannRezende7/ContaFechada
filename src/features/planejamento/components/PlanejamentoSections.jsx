import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpCircle,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Layers,
  Save,
  Bell,
  LockKeyhole,
  Tags,
} from 'lucide-react';
import { formatCurrency } from '../../../utils/formatCurrency.js';
import { formatDateBR } from '../../../utils/formatDate.js';
import FinancialTotalsGrid from '../../../components/ui/FinancialTotalsGrid.jsx';

export function ForecastSection({ forecast, saldoInput, onSaldoInputChange, onSaveSaldo, saving }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="bg-white dark:bg-ink-700 rounded-card shadow-card p-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <label className="flex-1">
            <span className="block text-xs font-medium text-ink-300 mb-1">Saldo inicial do mês</span>
            <input
              type="number"
              step="0.01"
              value={saldoInput}
              onChange={(event) => onSaldoInputChange(event.target.value)}
              className="money w-full rounded-xl border border-ink-100 bg-white dark:bg-ink-900 dark:border-ink-700 text-ink-900 dark:text-ink-50 px-3.5 py-2.5 text-sm focus:border-ledger-500"
            />
          </label>
          <button
            type="button"
            onClick={onSaveSaldo}
            disabled={saving}
            className="inline-flex items-center justify-center gap-1.5 rounded-pill bg-ledger-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-ledger-600 disabled:opacity-50"
          >
            <Save size={15} />
            Salvar
          </button>
        </div>
        <p className="mt-2 text-xs text-ink-300">
          Use o saldo disponível no primeiro dia do mês. A projeção soma receitas e desconta despesas pela data de vencimento.
        </p>
      </div>

      <FinancialTotalsGrid
        incomeLabel="Receitas previstas"
        incomeValue={forecast.receitasPrevistas}
        expenseLabel="Despesas previstas"
        expenseValue={forecast.despesasPrevistas}
        balanceLabel="Saldo previsto"
        balanceValue={forecast.saldoFinalPrevisto}
      />
      <div className="grid grid-cols-2 gap-3">
        <ForecastCard label="Saldo previsto hoje" value={forecast.saldoHojePrevisto} />
        <ForecastCard label="Menor saldo previsto" value={forecast.menorSaldoPrevisto} />
      </div>

      {forecast.dataSaldoNegativo ? (
        <div className="flex items-center gap-3 rounded-card bg-signal-50 p-4 text-signal-600">
          <AlertTriangle size={18} className="shrink-0" />
          <p className="text-sm font-medium">
            Mantendo os lançamentos atuais, o saldo fica negativo em {formatDateBR(forecast.dataSaldoNegativo)}.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-card bg-ledger-50 p-4 text-ledger-700">
          <CheckCircle2 size={18} className="shrink-0" />
          <p className="text-sm font-medium">O saldo previsto permanece positivo durante todo o mês.</p>
        </div>
      )}

      <div className="bg-white dark:bg-ink-700 rounded-card shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-100 dark:border-ink-900">
          <h3 className="text-sm font-medium text-ink-900 dark:text-ink-50">Linha do tempo</h3>
        </div>
        {forecast.timeline.length === 0 ? (
          <p className="p-4 text-sm text-ink-300">Nenhum lançamento previsto para este mês.</p>
        ) : (
          <div className="divide-y divide-ink-100 dark:divide-ink-900">
            {forecast.timeline.map((event) => (
              <div key={event.date} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-ink-900 dark:text-ink-50">{formatDateBR(event.date)}</p>
                  <p className={event.movement >= 0 ? 'text-ledger-600' : 'text-signal-500'}>
                    {event.movement >= 0 ? '+' : '-'} {formatCurrency(Math.abs(event.movement))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-ink-300">Saldo previsto</p>
                  <p className={`money font-semibold ${event.balance < 0 ? 'text-signal-500' : 'text-ink-900 dark:text-ink-50'}`}>
                    {formatCurrency(event.balance)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function ClosingSection({
  summary,
  saved,
  saldoReal,
  onSaldoRealChange,
  notes,
  onNotesChange,
  carryPending,
  onCarryPendingChange,
  onCloseMonth,
  saving,
}) {
  if (saved) {
    return (
      <section className="space-y-3">
        <div className="rounded-card bg-ledger-50 p-5">
          <div className="flex items-center gap-2 text-ledger-700"><LockKeyhole size={18} /><p className="font-medium">Mês fechado</p></div>
          <p className="mt-1 text-xs text-ledger-600">Este resumo é um retrato do momento do fechamento e não muda se os lançamentos forem editados depois.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ForecastCard label="Saldo calculado" value={saved.saldoCalculado} />
          <ForecastCard label="Saldo real" value={saved.saldoReal} />
          <ForecastCard label="Diferença" value={saved.diferenca} />
          <ForecastCard label="Pendências registradas" value={saved.pendenciasNoFechamento} currency={false} />
        </div>
        {saved.observacoes && <p className="rounded-card bg-white p-4 text-sm text-ink-500 shadow-card dark:bg-ink-700">{saved.observacoes}</p>}
      </section>
    );
  }

  const actual = Number(saldoReal) || 0;
  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <ForecastCard label="Receitas realizadas" value={summary.receitas} />
        <ForecastCard label="Despesas realizadas" value={summary.despesas} />
        <ForecastCard label="Saldo calculado" value={summary.saldoCalculado} />
        <ForecastCard label="Diferença atual" value={actual - summary.saldoCalculado} />
      </div>
      <div className="rounded-card bg-white p-4 shadow-card dark:bg-ink-700">
        <p className={`mb-3 text-sm ${summary.pendentes.length ? 'text-signal-500' : 'text-ledger-600'}`}>
          {summary.pendentes.length} lançamento(s) ainda pendente(s) neste mês.
        </p>
        <label className="block text-xs text-ink-300">Saldo real da conta</label>
        <input type="number" step="0.01" value={saldoReal} onChange={(e) => onSaldoRealChange(e.target.value)} className="money mt-1 w-full rounded-xl border border-ink-100 bg-white px-3 py-2.5 text-sm dark:border-ink-700 dark:bg-ink-900" />
        <label className="mt-3 block text-xs text-ink-300">Observações do fechamento</label>
        <textarea value={notes} onChange={(e) => onNotesChange(e.target.value)} rows="3" className="mt-1 w-full resize-none rounded-xl border border-ink-100 bg-white px-3 py-2.5 text-sm dark:border-ink-700 dark:bg-ink-900" />
        {summary.pendentes.length > 0 && (
          <label className="mt-3 flex items-start gap-2 text-sm text-ink-500">
            <input type="checkbox" checked={carryPending} onChange={(e) => onCarryPendingChange(e.target.checked)} className="mt-0.5" />
            Levar as pendências para o mês seguinte, preservando o dia do vencimento.
          </label>
        )}
        <button type="button" disabled={saving || saldoReal === ''} onClick={onCloseMonth} className="mt-4 w-full rounded-pill bg-ledger-500 py-2.5 text-sm font-medium text-white disabled:opacity-50">
          Fechar e salvar resumo
        </button>
      </div>
    </section>
  );
}

export function NotificationsSection({ enabled, hour, onHourChange, onToggle, saving, feedback, native }) {
  return (
    <section className="rounded-card bg-white p-5 shadow-card dark:bg-ink-700">
      <div className="flex items-start gap-3">
        <span className="rounded-full bg-ledger-50 p-2 text-ledger-600"><Bell size={18} /></span>
        <div className="flex-1">
          <p className="text-sm font-medium text-ink-900 dark:text-ink-50">Lembretes de vencimento</p>
          <p className="mt-1 text-xs text-ink-300">
            {native
              ? 'No Android, os alertas ficam agendados mesmo com o aplicativo fechado.'
              : 'Na PWA, o navegador só pode mostrar lembretes enquanto o aplicativo estiver aberto.'}
          </p>
        </div>
      </div>
      <label className="mt-4 block text-xs text-ink-300">Horário dos lembretes</label>
      <input type="number" min="0" max="23" value={hour} onChange={(e) => onHourChange(e.target.value)} className="mt-1 w-24 rounded-xl border border-ink-100 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900" />
      <button type="button" disabled={saving} onClick={onToggle} className={`mt-4 w-full rounded-pill py-2.5 text-sm font-medium ${enabled ? 'bg-signal-50 text-signal-600' : 'bg-ledger-500 text-white'}`}>
        {enabled ? 'Desativar notificações' : 'Ativar e agendar notificações'}
      </button>
      {feedback && <p className="mt-2 text-center text-xs text-ink-300">{feedback}</p>}
    </section>
  );
}

export function InstallmentSimulatorSection({ form, onChange, scenarios, categorias, onCreate, saving }) {
  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-3 rounded-card bg-white p-4 shadow-card dark:bg-ink-700 sm:grid-cols-3">
        <label className="text-xs text-ink-300">Descrição
          <input value={form.descricao} onChange={(e) => onChange('descricao', e.target.value)} className="mt-1 w-full rounded-xl border border-ink-100 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900" />
        </label>
        <label className="text-xs text-ink-300">Valor total
          <input type="number" min="0" step="0.01" value={form.valor} onChange={(e) => onChange('valor', e.target.value)} className="money mt-1 w-full rounded-xl border border-ink-100 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900" />
        </label>
        <label className="text-xs text-ink-300">Entrada
          <input type="number" min="0" step="0.01" value={form.entrada} onChange={(e) => onChange('entrada', e.target.value)} className="money mt-1 w-full rounded-xl border border-ink-100 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900" />
        </label>
        <label className="text-xs text-ink-300">Parcelas
          <input type="number" min="1" max="60" value={form.parcelas} onChange={(e) => onChange('parcelas', e.target.value)} className="mt-1 w-full rounded-xl border border-ink-100 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900" />
        </label>
        <label className="text-xs text-ink-300">Dia do vencimento
          <input type="number" min="1" max="31" value={form.diaVencimento} onChange={(e) => onChange('diaVencimento', e.target.value)} className="mt-1 w-full rounded-xl border border-ink-100 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900" />
        </label>
        <label className="text-xs text-ink-300">Categoria
          <select value={form.categoriaId} onChange={(e) => onChange('categoriaId', e.target.value)} className="mt-1 w-full rounded-xl border border-ink-100 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-900">
            <option value="">Sem categoria</option>{categorias.filter((item) => item.tipo === 'despesa').map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
        </label>
      </div>

      {Number(form.valor) > 0 && scenarios.map((scenario) => (
        <div key={scenario.parcelas} className={`rounded-card border p-4 ${scenario.parcelas === Number(form.parcelas) ? 'border-ledger-500 bg-ledger-50/40' : 'border-ink-100 bg-white dark:border-ink-700 dark:bg-ink-700'}`}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">{scenario.parcelas}x de {formatCurrency(scenario.valorParcela)}</p>
            <p className={`money text-sm ${scenario.menorSaldo < 0 ? 'text-signal-500' : 'text-ledger-600'}`}>Menor saldo: {formatCurrency(scenario.menorSaldo)}</p>
          </div>
          <p className="mt-1 text-xs text-ink-300">
            {scenario.dataNegativa ? `O saldo ficaria negativo em ${formatDateBR(scenario.dataNegativa)}.` : 'Esta opção não deixa o saldo projetado negativo.'}
          </p>
        </div>
      ))}
      <button type="button" disabled={saving || !form.descricao.trim() || Number(form.valor) <= 0} onClick={onCreate} className="w-full rounded-pill bg-ledger-500 py-2.5 text-sm font-medium text-white disabled:opacity-50">
        Transformar simulação em lançamento
      </button>
    </section>
  );
}

function ForecastCard({ label, value, currency = true }) {
  return (
    <div className="bg-white dark:bg-ink-700 rounded-card shadow-card p-4">
      <p className="text-xs text-ink-300">{label}</p>
      <p className={`money mt-1 text-lg font-semibold ${value < 0 ? 'text-signal-500' : 'text-ledger-600'}`}>
        {currency ? formatCurrency(value) : value}
      </p>
    </div>
  );
}

export function BudgetsSection({ items, onSave, savingCategory }) {
  if (items.length === 0) {
    return <div className="rounded-card bg-white p-6 text-center shadow-card dark:bg-ink-700"><p className="text-sm font-semibold text-ink-900 dark:text-ink-50">Nenhuma categoria de despesa</p><p className="mt-1 text-sm text-ink-300">Cadastre uma categoria para começar seu planejamento.</p><Link to="/categorias" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-ledger-500 px-4 text-sm font-semibold text-white">Cadastrar categoria</Link></div>;
  }

  return (
    <section className="flex flex-col gap-3">
      <p className="text-sm text-ink-300">
        Defina quanto pretende gastar em cada categoria neste mês. Valores zerados removem o limite.
      </p>
      {items.map((item) => (
        <BudgetRow
          key={item.categoria.id}
          item={item}
          saving={savingCategory === item.categoria.id}
          onSave={(value) => onSave(item.categoria.id, value)}
        />
      ))}
    </section>
  );
}

function BudgetRow({ item, saving, onSave }) {
  const [value, setValue] = useState(item.limite ? String(item.limite) : '');

  useEffect(() => {
    setValue(item.limite ? String(item.limite) : '');
  }, [item.limite]);

  const width = Math.min(100, Math.round(item.percentual));
  const barTone =
    item.status === 'excedido' ? 'bg-signal-500' :
    item.status === 'atencao' ? 'bg-gold-500' :
    'bg-ledger-500';

  return (
    <div className="bg-white dark:bg-ink-700 rounded-card shadow-card p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex justify-between gap-3">
            <p className="text-sm font-medium text-ink-900 dark:text-ink-50">{item.categoria.nome}</p>
            <p className={`money text-sm font-semibold ${item.status === 'excedido' ? 'text-signal-500' : item.status === 'atencao' ? 'text-gold-700' : 'text-ledger-600'}`}>{formatCurrency(item.gasto)} de {formatCurrency(item.limite)} planejados</p>
          </div>
          {item.limite > 0 && (
            <>
              <div className="h-2.5 rounded-pill bg-ink-50 dark:bg-ink-900 overflow-hidden mt-2" role="progressbar" aria-label={`Uso do planejamento de ${item.categoria.nome}`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(item.percentual)}>
                <div className={`h-full rounded-pill transition-[width] ${barTone}`} style={{ width: `${width}%` }} />
              </div>
              <p className={`mt-1 text-xs ${item.status === 'excedido' ? 'text-signal-500' : 'text-ink-300'}`}>
                {Math.round(item.percentual)}% do limite · {item.restante >= 0
                  ? `${formatCurrency(item.restante)} restantes`
                  : `${formatCurrency(Math.abs(item.restante))} acima do limite`}
              </p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 sm:w-52">
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Sem limite"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="money min-w-0 flex-1 rounded-xl border border-ink-100 bg-white dark:bg-ink-900 dark:border-ink-700 px-3 py-2 text-sm text-ink-900 dark:text-ink-50"
          />
          <button
            type="button"
            onClick={() => onSave(value)}
            disabled={saving}
            aria-label={`Salvar orçamento de ${item.categoria.nome}`}
            className="rounded-full bg-ledger-50 p-2 text-ledger-600 hover:bg-ledger-100 disabled:opacity-50"
          >
            <Save size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

const PENDING_GROUPS = [
  { key: 'atrasadas', title: 'Contas atrasadas', icon: AlertTriangle, tone: 'text-signal-500 bg-signal-50' },
  { key: 'proximosVencimentos', title: 'Próximos 7 dias', icon: CalendarClock, tone: 'text-pending-600 bg-pending-50' },
  { key: 'receitasPendentes', title: 'Receitas pendentes', icon: ArrowUpCircle, tone: 'text-ledger-600 bg-ledger-50' },
  { key: 'semCategoria', title: 'Sem categoria', icon: Tags, tone: 'text-clay-600 bg-clay-50' },
  { key: 'parcelamentosFinalizando', title: 'Parcelamentos no fim', icon: Layers, tone: 'text-clay-600 bg-clay-50' },
];

export function PendingSection({ pending }) {
  const total = PENDING_GROUPS.reduce((sum, group) => sum + pending[group.key].length, 0)
    + pending.recorrenciasParaRevisar.length;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-card bg-ledger-50 p-8 text-center">
        <CheckCircle2 size={28} className="text-ledger-600" />
        <p className="text-sm font-medium text-ledger-700">Nenhuma pendência encontrada.</p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <p className="text-sm text-ink-300">
        Alguns lançamentos aparecem em mais de um grupo quando precisam de tipos diferentes de atenção.
      </p>
      {PENDING_GROUPS.map((group) => (
        <PendingGroup key={group.key} group={group} items={pending[group.key]} />
      ))}
      {pending.recorrenciasParaRevisar.length > 0 && (
        <div className="bg-white dark:bg-ink-700 rounded-card shadow-card p-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gold-50 p-2 text-gold-700"><CircleDollarSign size={16} /></span>
            <div>
              <p className="text-sm font-medium text-ink-900 dark:text-ink-50">Recorrências para revisar</p>
              <p className="text-xs text-ink-300">{pending.recorrenciasParaRevisar.length} sem categoria, valor ou vencimento completo.</p>
            </div>
          </div>
        </div>
      )}
      <Link to="/" className="self-start text-sm font-medium text-ledger-600 hover:underline">
        Abrir lançamentos para resolver pendências
      </Link>
    </section>
  );
}

function PendingGroup({ group, items }) {
  if (items.length === 0) return null;
  const Icon = group.icon;

  return (
    <details className="bg-white dark:bg-ink-700 rounded-card shadow-card overflow-hidden" open={group.key === 'atrasadas'}>
      <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none">
        <span className={`rounded-full p-2 ${group.tone}`}><Icon size={16} /></span>
        <span className="flex-1 text-sm font-medium text-ink-900 dark:text-ink-50">{group.title}</span>
        <span className="rounded-pill bg-ink-50 dark:bg-ink-900 px-2.5 py-1 text-xs text-ink-500">{items.length}</span>
      </summary>
      <div className="border-t border-ink-100 dark:border-ink-900 divide-y divide-ink-100 dark:divide-ink-900">
        {items.slice(0, 8).map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm text-ink-900 dark:text-ink-50">{item.descricao}</p>
              <p className="text-xs text-ink-300">{formatDateBR(item.dataVencimento)}</p>
            </div>
            <span className={`money shrink-0 text-sm font-medium ${item.tipo === 'receita' ? 'text-ledger-600' : 'text-ink-700 dark:text-ink-100'}`}>
              {item.tipo === 'receita' ? '+' : '-'} {formatCurrency(item.valor)}
            </span>
          </div>
        ))}
        {items.length > 8 && <p className="px-4 py-2 text-xs text-ink-300">E mais {items.length - 8} lançamento(s).</p>}
      </div>
    </details>
  );
}
