import { useEffect, useMemo, useState } from 'react';
import { PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { usePremium } from '../../../contexts/PremiumContext.jsx';
import { FEATURES, getOldestAllowedMonthKey } from '../../../config/premium.js';
import PremiumBadge from '../../premium/components/PremiumBadge.jsx';
import { getGastosPorCategoria, getEvolucaoMensal } from '../services/relatoriosService.js';
import { getColor } from '../../categorias/colorMap.js';
import { getCurrentMonthKey, shiftMonthKey } from '../../../utils/monthKey.js';
import { formatCurrency } from '../../../utils/formatCurrency.js';
import MonthNav from '../../../components/ui/MonthNav.jsx';
import Topbar from '../../../components/layout/Topbar.jsx';

function CategoriaTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-white dark:bg-ink-700 rounded-xl shadow-card-hover px-3 py-2 text-sm">
      <p className="font-medium text-ink-900 dark:text-ink-50">{item.nome}</p>
      <p className="text-ink-500">{formatCurrency(item.total)}</p>
    </div>
  );
}

function EvolucaoTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-ink-700 rounded-xl shadow-card-hover px-3 py-2 text-sm">
      <p className="font-medium text-ink-900 dark:text-ink-50 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.dataKey === 'receitas' ? 'Entradas' : 'Saídas'}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function RelatoriosPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const { canUse, isPremium, openPaywall, getLimit } = usePremium();
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey());
  const [tipo, setTipo] = useState('despesa');
  const [categoriaData, setCategoriaData] = useState({ items: [], totalGeral: 0 });
  const [evolucao, setEvolucao] = useState([]);

  // Histórico (Fase 6): free vê só o mês atual e os 2 anteriores.
  const oldestAllowedMonthKey = getOldestAllowedMonthKey({
    isPremium,
    currentMonthKey: getCurrentMonthKey(),
    shiftMonthKey,
  });

  function tryChangeMonth(nextMonthKey) {
    if (oldestAllowedMonthKey && nextMonthKey < oldestAllowedMonthKey) {
      openPaywall({ feature: FEATURES.HISTORICO, reason: 'limit_reached', limit: getLimit(FEATURES.HISTORICO) });
      return;
    }
    setMonthKey(nextMonthKey);
  }

  // Relatório básico (categorias do mês) é grátis; evolução/comparação
  // entre meses é Premium (Fase 6) — `canUse` volta `true` pra todo mundo
  // enquanto PREMIUM_ENFORCED estiver desligado, então isso não muda nada
  // até o plano pago ser lançado de fato.
  const podeVerEvolucao = canUse(FEATURES.RELATORIOS_AVANCADOS);

  useEffect(() => {
    if (!uid) return;
    getGastosPorCategoria(uid, monthKey, tipo).then(setCategoriaData);
  }, [uid, monthKey, tipo]);

  useEffect(() => {
    if (!uid || !podeVerEvolucao) return;
    getEvolucaoMensal(uid, monthKey, 6).then(setEvolucao);
  }, [uid, monthKey, podeVerEvolucao]);

  const chartData = useMemo(
    () => categoriaData.items.map((item) => ({ ...item, color: getColor(item.corKey).hex })),
    [categoriaData.items]
  );

  const temMovimentacaoEvolucao = evolucao.some((m) => m.receitas > 0 || m.despesas > 0);

  return (
    <>
      <Topbar title="Relatórios" icon={PieChartIcon} />
      <div className="p-4 md:p-8 max-w-4xl mx-auto flex flex-col gap-8">
        <MonthNav monthKey={monthKey} onChange={tryChangeMonth} />

        <section className="bg-white dark:bg-ink-700 rounded-card shadow-card p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink-900 dark:text-ink-50">
              <PieChartIcon size={18} className="text-clay-500" strokeWidth={1.75} />
              Por categoria
            </h2>
            <div className="flex gap-1 bg-ink-50 dark:bg-ink-900 rounded-pill p-1">
              <button
                onClick={() => setTipo('despesa')}
                className={`rounded-pill px-3 py-1.5 text-xs font-medium transition-colors ${
                  tipo === 'despesa' ? 'bg-ink-900 text-white' : 'text-ink-500'
                }`}
              >
                Despesas
              </button>
              <button
                onClick={() => setTipo('receita')}
                className={`rounded-pill px-3 py-1.5 text-xs font-medium transition-colors ${
                  tipo === 'receita' ? 'bg-ledger-500 text-white' : 'text-ink-500'
                }`}
              >
                Receitas
              </button>
            </div>
          </div>

          {chartData.length === 0 ? (
            <p className="text-sm text-ink-300 text-center py-10">
              Nenhum lançamento de {tipo === 'despesa' ? 'despesa' : 'receita'} neste mês.
            </p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-full sm:w-52 h-52 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="total"
                      nameKey="nome"
                      innerRadius="62%"
                      outerRadius="90%"
                      paddingAngle={2}
                      stroke="#F8FAFC"
                      strokeWidth={2}
                    >
                      {chartData.map((entry) => (
                        <Cell key={entry.id} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CategoriaTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex-1 w-full min-w-0 flex flex-col gap-2.5">
                {chartData.map((item) => {
                  const pct = categoriaData.totalGeral
                    ? Math.round((item.total / categoriaData.totalGeral) * 100)
                    : 0;
                  return (
                    <div key={item.id} className="flex items-center gap-3">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-ink-700 dark:text-ink-50 truncate flex-1">{item.nome}</span>
                      <span className="text-xs text-ink-300 shrink-0 w-9 text-right">{pct}%</span>
                      <span className="money text-sm font-medium text-ink-900 dark:text-ink-50 shrink-0">
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-ink-700 rounded-card shadow-card p-4 md:p-6">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink-900 dark:text-ink-50 mb-4">
            <TrendingUp size={18} className="text-clay-500" strokeWidth={1.75} />
            Evolução mensal
            <PremiumBadge />
          </h2>

          {!podeVerEvolucao ? (
            <div className="flex flex-col items-center gap-2 text-center py-10 px-4">
              <p className="text-sm text-ink-300 max-w-[280px]">
                Compare a evolução dos últimos meses com o Premium.
              </p>
              <button
                onClick={() => openPaywall({ feature: FEATURES.RELATORIOS_AVANCADOS })}
                className="text-sm font-medium text-ledger-600 hover:underline"
              >
                Conhecer o Premium
              </button>
            </div>
          ) : !temMovimentacaoEvolucao ? (
            <p className="text-sm text-ink-300 text-center py-10">
              Sem lançamentos nos últimos meses.
            </p>
          ) : (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolucao} barGap={4} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 12 }}
                  />
                  <YAxis hide />
                  <Tooltip content={<EvolucaoTooltip />} cursor={{ fill: '#F8FAFC' }} />
                  <Legend
                    formatter={(value) => (value === 'receitas' ? 'Entradas' : 'Saídas')}
                    wrapperStyle={{ fontSize: 13 }}
                  />
                  <Bar dataKey="receitas" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="despesas" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
