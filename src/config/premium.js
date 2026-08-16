/**
 * Master switch for premium gating. Flip to `true` when the paid plan is
 * ready to launch — every check below then starts enforcing real limits.
 * While `false`, `checkGate` always allows everything, so nothing changes
 * for current users until this is flipped.
 *
 * Only flip this once billing, restauração de compra and subscription admin
 * are tested end to end (docs/ROADMAP_MONETIZACAO.txt, objetivo).
 */
export const PREMIUM_ENFORCED = false;
export const WEB_ACCESS_ENABLED = false;

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
  [FEATURES.ACOES_EM_MASSA]: 'boolean',
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
    ],
  },
  [PLAN.PREMIUM]: {
    label: 'Premium',
    beneficios: [
      'Backup automático diário na nuvem',
      'Restauração segura em caso de troca ou perda do aparelho',
      'Relatórios de múltiplos períodos e comparação entre meses',
      'Projeções e insights financeiros avançados',
      'Importação CSV/OFX e ações em massa',
      'Busca global e regras automáticas de categorização',
      'Acesso antecipado a novos recursos',
    ],
  },
};

/**
 * Linha a linha, Gratuito vs Premium — usado pela tabela comparativa em
 * "Meu Plano" e no paywall. Esta é a fonte única da comunicação comercial.
 */
export const PLAN_COMPARISON = [
  { label: 'Lançamentos manuais', free: 'Ilimitados', premium: 'Ilimitados' },
  { label: 'Categorias e recorrências', free: 'Ilimitadas', premium: 'Ilimitadas' },
  { label: 'Histórico no dispositivo', free: 'Completo', premium: 'Completo' },
  { label: 'Backup automático na nuvem', free: 'Não incluído', premium: 'Diário' },
  { label: 'Restauração pela nuvem', free: 'Não incluído', premium: 'Incluído' },
  { label: 'Relatórios', free: 'Mensais', premium: 'Comparações e evolução' },
  { label: 'Gestor Financeiro', free: 'Indicadores completos', premium: 'Com insights e projeções' },
  { label: 'Insights e sugestões', free: 'Não incluído', premium: 'Avançados' },
  { label: 'Exportação CSV', free: 'Completa', premium: 'Completa' },
  { label: 'Planejamento do valor livre', free: 'Incluído', premium: 'Incluído' },
  { label: 'Importação bancária', free: 'Não incluída', premium: 'CSV e OFX' },
  { label: 'Automação', free: 'Recorrências', premium: 'Regras de categoria' },
  { label: 'Busca', free: 'No Movimento', premium: 'Global com filtros avançados' },
];

/** Preços propostos — validar antes do lançamento (docs/ROADMAP_MONETIZACAO.txt, secao 1). */
export const PRICING = {
  mensal: 12.9,
  anual: 99.9,
  fundadorAnualPrimeiroAno: 69.9,
  trialDias: 14,
};

/**
 * Janela de elegibilidade da "oferta de fundador" (docs/ROADMAP_MONETIZACAO.txt,
 * Marco 4: "decidir e implementar a regra de elegibilidade/janela de
 * tempo"). Só quem nunca teve nenhuma assinatura (nunca iniciou teste nem
 * compra) e está dentro do prazo abaixo vê o preço promocional — ajuste a
 * data quando decidir a janela real de lançamento, um único ponto de
 * configuração, sem tocar em nenhuma tela.
 */
export const FOUNDER_OFFER_DEADLINE = '2026-10-15T23:59:59-03:00';

export function isFounderOfferActive(now = new Date()) {
  return now.getTime() < new Date(FOUNDER_OFFER_DEADLINE).getTime();
}

/** @param {{ subscriptionStatus?: string, now?: Date }} [ctx] */
export function isFounderEligible({ subscriptionStatus, now } = {}) {
  return isFounderOfferActive(now) && (subscriptionStatus == null || subscriptionStatus === 'none');
}

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
