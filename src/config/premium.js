/**
 * Master switch for premium gating. Flip to `true` when the paid plan is
 * ready to launch — every check below then starts enforcing real limits.
 * While `false`, `checkGate` always allows everything, so nothing changes
 * for current users until this is flipped.
 *
 * Only flip this once billing, restauração de compra and subscription admin
 * are tested end to end (docs/ROADMAP_MONETIZACAO.txt, objetivo).
 */
export const PREMIUM_ENFORCED = true;
export const CLOUD_UI_ENABLED = false;

/** Produto nao consumivel cadastrado na Google Play Console. */
export const GOOGLE_PLAY_PRODUCTS = {
  PRO_LIFETIME: 'conta_fechada_pro_lifetime',
};

export const PLAN = {
  FREE: 'free',
  PRO: 'pro',
  // Compatibilidade com assinaturas criadas antes da separação Pro/Nuvem.
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
  PLANEJAMENTO_AVANCADO: 'planejamento_avancado',
  IMPORTACAO_EXTRATO: 'importacao_extrato',
  REGRAS_CATEGORIZACAO: 'regras_categorizacao',
  ACOES_EM_MASSA: 'acoes_em_massa',
  BUSCA_GLOBAL: 'busca_global',
  METAS_AUTOMATICAS: 'metas_automaticas',
};

/**
 * `free` keeps the complete local experience available to everyone.
 * `boolean` marks convenience, cloud, automation and advanced-analysis
 * features that become Premium when enforcement is enabled.
 */
const FEATURE_KIND = {
  [FEATURES.CATEGORIAS_CUSTOM]: 'free',
  [FEATURES.RECORRENCIAS]: 'free',
  [FEATURES.METAS]: 'free',
  [FEATURES.HISTORICO]: 'free',
  [FEATURES.RELATORIOS_AVANCADOS]: 'boolean',
  [FEATURES.GESTOR_AVANCADO]: 'free',
  [FEATURES.INSIGHTS_AVANCADOS]: 'boolean',
  [FEATURES.EXPORTACAO_AVANCADA]: 'free',
  [FEATURES.PLANEJAMENTO_AVANCADO]: 'free',
  [FEATURES.IMPORTACAO_EXTRATO]: 'boolean',
  [FEATURES.REGRAS_CATEGORIZACAO]: 'boolean',
  [FEATURES.ACOES_EM_MASSA]: 'free',
  [FEATURES.BUSCA_GLOBAL]: 'boolean',
  [FEATURES.METAS_AUTOMATICAS]: 'free',
};

/**
 * Kept as a compatibility export for UI helpers. Core usage no longer has
 * quantitative caps: users retain full access to their local data.
 */
export const FREE_LIMITS = {
};

/** Copy used by "Meu Plano" and the paywall — kept next to the rules they describe. */
export const PLAN_DETAILS = {
  [PLAN.FREE]: {
    label: 'Gratuito',
    beneficios: [
      'Lançamentos manuais ilimitados',
      'Parcelamentos, categorias e recorrências ilimitados',
      'Histórico completo no dispositivo',
      'Dashboard e relatórios mensais',
      'Gestor Financeiro e planejamento do valor livre',
      'Exportação CSV completa',
      'Edição e exclusão de vários lançamentos',
      'Backup e restauração manual por arquivo',
    ],
  },
  [PLAN.PRO]: {
    label: 'Pro',
    beneficios: [
      'Relatórios de múltiplos períodos e comparação entre meses',
      'Projeções e insights financeiros avançados',
      'Importação assistida por print, CSV e OFX',
      'Busca global e regras automáticas de categorização',
      'Acesso antecipado a novos recursos',
    ],
  },
};

/** Diferenciais exibidos em "Meu Plano" e no paywall. */
export const PLAN_COMPARISON = [
  { label: 'Sem anúncios', premium: 'Use o aplicativo sem interrupções.' },
  { feature: FEATURES.IMPORTACAO_EXTRATO, label: 'Importação assistida', premium: 'Importe por print, CSV e OFX.' },
  { feature: FEATURES.RELATORIOS_AVANCADOS, label: 'Relatórios avançados', premium: 'Compare meses e acompanhe sua evolução.' },
  { feature: FEATURES.INSIGHTS_AVANCADOS, label: 'Insights e projeções', premium: 'Receba análises financeiras mais completas.' },
  { feature: FEATURES.REGRAS_CATEGORIZACAO, label: 'Categorização automática', premium: 'Crie regras para organizar lançamentos.' },
  { feature: FEATURES.BUSCA_GLOBAL, label: 'Busca global', premium: 'Pesquise em todo o histórico com filtros.' },
];

/** Preços propostos — validar antes do lançamento (docs/ROADMAP_MONETIZACAO.txt, secao 1). */
export const PRICING = {
  proLifetime: 39.9,
  proLaunch: 29.9,
};

/**
 * Janela de elegibilidade da "oferta de fundador" (docs/ROADMAP_MONETIZACAO.txt,
 * Marco 4: "decidir e implementar a regra de elegibilidade/janela de
 * tempo"). Só quem nunca teve nenhuma assinatura (nunca iniciou teste nem
 * compra) e está dentro do prazo abaixo vê o preço promocional — ajuste a
 * data quando decidir a janela real de lançamento, um único ponto de
 * configuração, sem tocar em nenhuma tela.
 */

/** @returns {number|null} the free-tier cap for `feature`, or null if it isn't a 'limit' feature. */
export function getLimit(feature) {
  return FEATURE_KIND[feature] === 'limit' ? (FREE_LIMITS[feature] ?? null) : null;
}

export function isLimitFeature() {
  return false;
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

  return { allowed: true };
}

/**
 * Compatibility helper for older screens. History is now always complete,
 * so navigation never has a minimum month.
 */
export function getOldestAllowedMonthKey() {
  return null;
}
