import { useEffect, useMemo, useState } from 'react';
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, Home, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import {
  getDashboardData,
  getDashboardMemoryCache,
  syncDashboardRecorrencias,
  getMetaEconomiaMensal,
  setMetaEconomiaMensal,
} from '../services/dashboardService.js';
import { listCategorias } from '../../categorias/services/categoriasService.js';
import { computeInsights } from '../utils/insights.js';
import IndicatorCard from '../../../components/ui/IndicatorCard.jsx';
import LoadingScreen from '../../../components/ui/LoadingScreen.jsx';
import MonthNav from '../../../components/ui/MonthNav.jsx';
import Topbar from '../../../components/layout/Topbar.jsx';
import { getCurrentMonthKey, daysRemainingInMonth, daysInMonth } from '../../../utils/monthKey.js';
import {
  DailyBudgetCard,
  DashboardHighlights,
  DashboardLinks,
  InsightsCard,
  MonthlyComparisonCard,
  SavingsChallenge,
  FreeValueSummary,
} from '../components/DashboardSections.jsx';
import { usePremium } from '../../../contexts/PremiumContext.jsx';
import { FEATURES } from '../../../config/premium.js';
import { getDistribuicaoMensal } from '../../valor-livre/services/valorLivreService.js';
import { calcularValorLivre } from '../../valor-livre/utils/valorLivre.js';
import { listMetas } from '../../metas/services/metasService.js';

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
  const [metaEconomia, setMetaEconomia] = useState(null);
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [metaInput, setMetaInput] = useState('');
  const [loadError, setLoadError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [distribuicaoValorLivre, setDistribuicaoValorLivre] = useState([]);
  const [metasValorLivre, setMetasValorLivre] = useState([]);

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
      getDashboardData(uid, monthKey, { source: 'cache' })
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

    Promise.race([getDashboardData(uid, monthKey, { source: 'server' }), timeout])
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
        syncDashboardRecorrencias(uid, monthKey)
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
    listCategorias(uid).then(setCategorias);
    getMetaEconomiaMensal(uid).then((valor) => setMetaEconomia(valor));
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    setDistribuicaoValorLivre([]);
    setMetasValorLivre([]);
    Promise.all([getDistribuicaoMensal(uid, monthKey), listMetas(uid)])
      .then(([items, goalItems]) => {
        if (!cancelled) {
          setDistribuicaoValorLivre(items);
          setMetasValorLivre(goalItems);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDistribuicaoValorLivre([]);
          setMetasValorLivre([]);
        }
      });
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

  async function handleSalvarMeta() {
    const valor = Number(metaInput);
    if (!valor) return;
    await setMetaEconomiaMensal(uid, valor);
    setMetaEconomia(valor);
    setEditandoMeta(false);
  }

  const economiaAtual = indicators ? Math.max(0, indicators.saldoMes) : 0;
  const economiaPct = metaEconomia > 0 ? Math.min(100, Math.round((economiaAtual / metaEconomia) * 100)) : 0;
  const resumoValorLivre = useMemo(
    () => calcularValorLivre(dashboardItems.atual, distribuicaoValorLivre),
    [dashboardItems.atual, distribuicaoValorLivre]
  );

  if (loadError && !indicators) {
    return (
      <>
        <Topbar title="Início" icon={Home} />
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
        <div className="h-5 -mt-2 mb-1 text-right" aria-live="polite">
          {refreshing && indicators && (
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-300">
              <RefreshCw size={12} className="animate-spin" aria-hidden="true" />
              Atualizando…
            </span>
          )}
        </div>

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

        <MonthlyComparisonCard comparacao={comparacao} monthKey={monthKey} />
        <DailyBudgetCard gastoDiario={gastoDiario} diasRestantes={diasRestantes} />
        <FreeValueSummary resumo={resumoValorLivre} metas={metasValorLivre} />
        <DashboardHighlights indicators={indicators} />

        <SavingsChallenge
          editando={editandoMeta}
          meta={metaEconomia}
          metaInput={metaInput}
          economiaAtual={economiaAtual}
          economiaPct={economiaPct}
          onStartEditing={() => {
            setMetaInput(metaEconomia ? String(metaEconomia) : '');
            setEditandoMeta(true);
          }}
          onInputChange={setMetaInput}
          onSave={handleSalvarMeta}
        />
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
