/**
 * Master switch for premium gating. Flip to `true` when the paid plan is
 * ready to launch — every check below then starts enforcing real limits.
 * While `false`, `checkGate` always allows everything, so nothing changes
 * for current users until this is flipped.
 *
 * Only flip this once billing, restauração de compra and subscription admin
 * are tested end to end (ROADMAP_MONETIZACAO.txt, objetivo).
 */
export const PREMIUM_ENFORCED = false;

export const PLAN = {
  FREE: 'free',
  PREMIUM: 'premium',
};

/**
 * Every gated feature in the product. Kept as a flat enum (not nested per
 * page) so a single import gives any screen the full catalog — this is the
 * "one config, not one check per screen" rule from Fase 1.
 */
export const FEATURES = {
  CATEGORIAS_CUSTOM: 'categorias_custom',
  RECORRENCIAS: 'recorrencias',
  METAS: 'metas',
  HISTORICO: 'historico',
  RELATORIOS_AVANCADOS: 'relatorios_avancados',
  GESTOR_AVANCADO: 'gestor_avancado',
  INSIGHTS_AVANCADOS: 'insights_avancados',
  EXPORTACAO_AVANCADA: 'exportacao_avancada',
};

/**
 * 'limit'    — free up to N (see FREE_LIMITS), unlimited on premium.
 * 'boolean'  — all-or-nothing: free never gets it, premium always does.
 * Kept as its own map (instead of guessing from FREE_LIMITS having a value)
 * so a limit of 0 is representable and a boolean feature can never be
 * mistaken for "limit not configured yet".
 */
const FEATURE_KIND = {
  [FEATURES.CATEGORIAS_CUSTOM]: 'limit',
  [FEATURES.RECORRENCIAS]: 'limit',
  [FEATURES.METAS]: 'limit',
  [FEATURES.HISTORICO]: 'limit',
  [FEATURES.RELATORIOS_AVANCADOS]: 'boolean',
  [FEATURES.GESTOR_AVANCADO]: 'boolean',
  [FEATURES.INSIGHTS_AVANCADOS]: 'boolean',
  [FEATURES.EXPORTACAO_AVANCADA]: 'boolean',
};

/**
 * Free-tier caps, only enforced once PREMIUM_ENFORCED is true. Every
 * quantitative limit in the whole app is defined here and nowhere else —
 * changing a number never requires touching a page component.
 *
 * HISTORICO is in "meses anteriores ao mes atual" (2 = mes atual + 2
 * anteriores acessiveis, como descrito no plano gratuito).
 */
export const FREE_LIMITS = {
  [FEATURES.CATEGORIAS_CUSTOM]: 5,
  [FEATURES.RECORRENCIAS]: 2,
  [FEATURES.METAS]: 2,
  [FEATURES.HISTORICO]: 2,
};

/** Copy used by "Meu Plano" and the paywall — kept next to the rules they describe. */
export const PLAN_DETAILS = {
  [PLAN.FREE]: {
    label: 'Gratuito',
    beneficios: [
      'Lançamentos manuais ilimitados',
      'Dashboard básico',
      'Categorias padrão + até 5 personalizadas',
      'Até 2 recorrências ativas',
      'Até 2 metas ativas',
      'Relatório básico do mês atual',
      'Histórico do mês atual e dos 2 meses anteriores',
      'Gestor Financeiro com indicadores básicos do mês atual',
      'Exportação CSV do mês atual',
    ],
  },
  [PLAN.PREMIUM]: {
    label: 'Premium',
    beneficios: [
      'Categorias personalizadas ilimitadas',
      'Recorrências ilimitadas',
      'Metas ilimitadas',
      'Histórico completo',
      'Relatórios de múltiplos períodos e comparação entre meses',
      'Projeções e insights financeiros avançados',
      'Gestor Financeiro completo',
      'Filtros e exportações avançadas',
      'Acesso antecipado a novos recursos',
    ],
  },
};

/** Preços propostos — validar antes do lançamento (ROADMAP_MONETIZACAO.txt, secao 1). */
export const PRICING = {
  mensal: 12.9,
  anual: 99.9,
  fundadorAnualPrimeiroAno: 69.9,
  trialDias: 14,
};

/** @returns {number|null} the free-tier cap for `feature`, or null if it isn't a 'limit' feature. */
export function getLimit(feature) {
  return FEATURE_KIND[feature] === 'limit' ? (FREE_LIMITS[feature] ?? null) : null;
}

export function isLimitFeature(feature) {
  return FEATURE_KIND[feature] === 'limit';
}

export function isBooleanFeature(feature) {
  return FEATURE_KIND[feature] === 'boolean';
}

/**
 * Pure gate check — takes `isPremium` as an input instead of resolving it
 * itself, so this stays a plain function of (feature, plan state) with no
 * dependency on Firestore/auth. `PremiumContext` is the only caller that
 * knows the real subscription state; it supplies `isPremium` here.
 * @param {string} feature - one of FEATURES
 * @param {{ isPremium?: boolean, count?: number, enforced?: boolean }} [ctx] -
 *   `count` = current usage (required for 'limit' features); `enforced`
 *   overrides PREMIUM_ENFORCED, used by tests to exercise the enforced path
 *   without flipping the module-wide switch.
 */
export function checkGate(feature, ctx = {}) {
  const enforced = ctx.enforced ?? PREMIUM_ENFORCED;
  if (!enforced) return { allowed: true };
  if (ctx.isPremium) return { allowed: true };

  if (FEATURE_KIND[feature] === 'boolean') {
    return { allowed: false, reason: 'premium_required' };
  }

  const limit = FREE_LIMITS[feature];
  if (limit != null && (ctx.count ?? 0) >= limit) {
    return { allowed: false, reason: 'limit_reached', limit };
  }
  return { allowed: true };
}

/**
 * Oldest 'YYYY-MM' month key a free user may navigate to (mes atual - N
 * meses, N = FREE_LIMITS.historico). Premium/unenforced has no floor.
 * Takes `shiftMonthKey`/`currentMonthKey` as params instead of importing
 * monthKey.js directly, keeping this module dependency-free and easy to
 * unit test in isolation.
 */
export function getOldestAllowedMonthKey({ isPremium, currentMonthKey, shiftMonthKey, enforced = PREMIUM_ENFORCED }) {
  if (!enforced || isPremium) return null;
  return shiftMonthKey(currentMonthKey, -FREE_LIMITS[FEATURES.HISTORICO]);
}
