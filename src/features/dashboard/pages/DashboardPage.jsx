import { useEffect, useMemo, useState } from 'react';
import { Home, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import {
  getDashboardData,
  getDashboardMemoryCache,
  syncDashboardRecorrencias,
} from '../services/dashboardService.js';
import { repositories } from '../../../repositories/index.js';
import { computeInsights } from '../utils/insights.js';
import FinancialTotalsGrid from '../../../components/ui/FinancialTotalsGrid.jsx';
import LoadingScreen from '../../../components/ui/LoadingScreen.jsx';
import MonthNav from '../../../components/ui/MonthNav.jsx';
import Topbar from '../../../components/layout/Topbar.jsx';
import SectionTabs from '../../../components/ui/SectionTabs.jsx';
import { getCurrentMonthKey, daysRemainingInMonth, daysInMonth } from '../../../utils/monthKey.js';
import {
  DailyBudgetCard,
  DashboardHighlights,
  DashboardLinks,
  InsightsCard,
  MonthlyComparisonCard,
  FreeValueSummary,
} from '../components/DashboardSections.jsx';
import { usePremium } from '../../../contexts/PremiumContext.jsx';
import { FEATURES } from '../../../config/premium.js';
import { calcularPlanejamentoCategorias } from '../../valor-livre/utils/valorLivre.js';

export default function DashboardPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const { canUse, openPaywall } = usePremium();
  const insightsAllowed = canUse(FEATURES.INSIGHTS_AVANCADOS);
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey());
  const [indicators, setIndicators] = useState(null);
  const [comparacao, setComparacao] = useState(null);
  const [dashboardItems, setDashboardItems] = useState({ atual: [], anterior: [] });
  const [categorias, setCategorias] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [distribuicaoValorLivre, setDistribuicaoValorLivre] = useState([]);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    let serverApplied = false;
    let cachePainted = false;
    let timeoutId;
    const startedAt = performance.now();
    const memory = getDashboardMemoryCache(uid, monthKey);

    if (memory) {
      cachePainted = true;
      setIndicators(memory.indicators);
      setComparacao(memory.comparacao);
      setDashboardItems({ atual: memory.lancamentosAtual || [], anterior: memory.lancamentosAnterior || [] });
      setRefreshing(false);
      return () => {
        cancelled = true;
      };
    } else {
      setIndicators(null);
      setComparacao(null);
    }
    setLoadError(null);
    setRefreshing(true);

    // Paint IndexedDB data immediately when this month was visited before.
    // An empty cache is not shown as a real zero balance because it may only
    // mean the query has never been cached on this device.
    if (!memory) {
      getDashboardData(uid, monthKey, { source: 'cache', dataRepositories: repositories })
        .then((cached) => {
          if (cancelled || serverApplied || cached.documentCount === 0) return;
          cachePainted = true;
          setIndicators(cached.indicators);
          setComparacao(cached.comparacao);
          setDashboardItems({ atual: cached.lancamentosAtual || [], anterior: cached.lancamentosAnterior || [] });
          if (import.meta.env.DEV) {
            console.debug(`[dashboard] cache em ${Math.round(performance.now() - startedAt)}ms`);
          }
        })
        .catch(() => {
          // Cache misses are expected on the first visit.
        });
    }

    const timeout = new Promise((_, reject) => {
      timeoutId = window.setTimeout(
        () => reject(new Error('O carregamento demorou mais que o esperado.')),
        12000
      );
    });

    Promise.race([getDashboardData(uid, monthKey, { source: 'server', dataRepositories: repositories }), timeout])
      .then((data) => {
        if (cancelled) return;
        serverApplied = true;
        setIndicators(data.indicators);
        setComparacao(data.comparacao);
        setDashboardItems({ atual: data.lancamentosAtual || [], anterior: data.lancamentosAnterior || [] });
        setRefreshing(false);
        if (import.meta.env.DEV) {
          console.debug(`[dashboard] servidor em ${Math.round(performance.now() - startedAt)}ms`);
        }

        // Recurrences are maintenance work, not a prerequisite for painting
        // totals. Refresh only if the background pass creates something.
        const syncStartedAt = performance.now();
        syncDashboardRecorrencias(uid, monthKey, repositories)
          .then((updated) => {
            if (cancelled || !updated) return;
            setIndicators(updated.indicators);
            setComparacao(updated.comparacao);
            setDashboardItems({ atual: updated.lancamentosAtual || [], anterior: updated.lancamentosAnterior || [] });
          })
          .catch((error) => {
            if (import.meta.env.DEV) console.debug('[dashboard] sincronização de recorrências falhou', error);
          })
          .finally(() => {
            if (import.meta.env.DEV) {
              console.debug(`[dashboard] recorrências em ${Math.round(performance.now() - syncStartedAt)}ms`);
            }
          });
      })
      .catch((error) => {
        if (cancelled) return;
        setRefreshing(false);
        if (!cachePainted) {
          setLoadError(error.message || 'Não foi possível carregar os totalizadores.');
        }
      })
      .finally(() => window.clearTimeout(timeoutId));

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [uid, monthKey, reloadToken]);

  useEffect(() => {
    if (!uid) return;
    repositories.categorias.list(uid).then(setCategorias);
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    setDistribuicaoValorLivre([]);
    repositories.valorLivre.getDistribuicaoMensal(uid, monthKey)
      .then((items) => { if (!cancelled) setDistribuicaoValorLivre(items); })
      .catch(() => { if (!cancelled) setDistribuicaoValorLivre([]); });
    return () => { cancelled = true; };
  }, [uid, monthKey]);

  const categoriasById = useMemo(
    () => Object.fromEntries(categorias.map((c) => [c.id, c])),
    [categorias]
  );

  const diasRestantes = daysRemainingInMonth(monthKey);
  const diasNoMes = daysInMonth(monthKey);
  const gastoDiario = indicators && diasRestantes > 0 ? indicators.saldoMes / diasRestantes : null;

  const insights = useMemo(() => {
    if (!indicators || !comparacao || !insightsAllowed) return [];
    return computeInsights({
      despesaPorCategoriaAtual: comparacao.porCategoriaAtual,
      despesaPorCategoriaAnterior: comparacao.porCategoriaAnterior,
      categoriasById,
      saldoMes: indicators.saldoMes,
      diasRestantes,
      diasNoMes,
      lancamentosAtual: dashboardItems.atual,
      lancamentosAnterior: dashboardItems.anterior,
    });
  }, [indicators, comparacao, categoriasById, diasRestantes, diasNoMes, dashboardItems, insightsAllowed]);

  const resumoValorLivre = useMemo(
    () => calcularPlanejamentoCategorias(dashboardItems.atual, distribuicaoValorLivre),
    [dashboardItems.atual, distribuicaoValorLivre]
  );

  if (loadError && !indicators) {
    return (
      <>
        <Topbar title="Resumo" icon={Home} />
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm text-ink-500 dark:text-ink-100">{loadError}</p>
          <button
            type="button"
            onClick={() => setReloadToken((value) => value + 1)}
            className="inline-flex items-center gap-2 rounded-pill bg-ledger-500 px-4 py-2 text-sm font-medium text-white hover:bg-ledger-600"
          >
            <RefreshCw size={15} strokeWidth={2} />
            Tentar novamente
          </button>
        </div>
      </>
    );
  }

  if (!indicators) {
    return (
      <>
        <Topbar title="Resumo" icon={Home} />
        <LoadingScreen />
      </>
    );
  }

  return (
    <>
      <Topbar title="Resumo" icon={Home} />
      <SectionTabs area="resumo" />
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <MonthNav monthKey={monthKey} onChange={setMonthKey} />
        <div className="h-5 -mt-2 mb-1 text-right" aria-live="polite">
          {refreshing && indicators && (
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-300">
              <RefreshCw size={12} className="animate-spin" aria-hidden="true" />
              Atualizando…
            </span>
          )}
        </div>

        <FinancialTotalsGrid
          incomeLabel="Receitas"
          incomeValue={indicators?.totalAReceber ?? 0}
          expenseLabel="Despesas"
          expenseValue={indicators?.totalAPagar ?? 0}
          expenseHint={indicators?.contasAtrasadas ? `${indicators.contasAtrasadas} atrasada(s)` : undefined}
          balanceLabel="Saldo"
          balanceValue={indicators?.saldoMes ?? 0}
        />

        <MonthlyComparisonCard comparacao={comparacao} monthKey={monthKey} />
        <DailyBudgetCard gastoDiario={gastoDiario} diasRestantes={diasRestantes} />
        <FreeValueSummary resumo={resumoValorLivre} monthKey={monthKey} />
        <DashboardHighlights indicators={indicators} />

        <InsightsCard
          insights={insights}
          locked={!insightsAllowed}
          onUnlock={() => openPaywall({ feature: FEATURES.INSIGHTS_AVANCADOS })}
        />
        <DashboardLinks />
      </div>
    </>
  );
}
