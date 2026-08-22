import { describe, expect, it } from 'vitest';
import {
  FEATURES,
  PLAN,
  PREMIUM_ENFORCED,
  checkGate,
  getLimit,
  getOldestAllowedMonthKey,
  isBooleanFeature,
  isLimitFeature,
} from './premium.js';

const CORE_FREE_FEATURES = [
  FEATURES.CATEGORIAS_CUSTOM,
  FEATURES.RECORRENCIAS,
  FEATURES.METAS,
  FEATURES.HISTORICO,
  FEATURES.GESTOR_AVANCADO,
  FEATURES.EXPORTACAO_AVANCADA,
  FEATURES.PLANEJAMENTO_AVANCADO,
  FEATURES.METAS_AUTOMATICAS,
  FEATURES.ACOES_EM_MASSA,
];

const PREMIUM_FEATURES = [
  FEATURES.RELATORIOS_AVANCADOS,
  FEATURES.INSIGHTS_AVANCADOS,
  FEATURES.IMPORTACAO_EXTRATO,
  FEATURES.REGRAS_CATEGORIZACAO,
  FEATURES.BUSCA_GLOBAL,
];

describe('PREMIUM_ENFORCED default', () => {
  it('keeps every local feature unlocked', () => {
    expect(PREMIUM_ENFORCED).toBe(false);
  });

  it('allows the complete catalog without a purchase', () => {
    for (const feature of [...CORE_FREE_FEATURES, ...PREMIUM_FEATURES]) {
      expect(checkGate(feature, { isPremium: false, count: 999 })).toEqual({ allowed: true });
    }
  });
});

describe('free core', () => {
  it.each(CORE_FREE_FEATURES)('%s remains available without Premium', (feature) => {
    expect(checkGate(feature, { enforced: true, isPremium: false, count: 999 })).toEqual({ allowed: true });
    expect(getLimit(feature)).toBeNull();
    expect(isLimitFeature(feature)).toBe(false);
    expect(isBooleanFeature(feature)).toBe(false);
  });

  it('never limits access to old history', () => {
    expect(getOldestAllowedMonthKey({
      isPremium: false,
      currentMonthKey: '2026-07',
      shiftMonthKey: () => 'unexpected',
      enforced: true,
    })).toBeNull();
  });
});

describe('formerly paid features', () => {
  it.each(PREMIUM_FEATURES)('%s remains available even if a caller requests enforcement', (feature) => {
    expect(isBooleanFeature(feature)).toBe(true);
    expect(checkGate(feature, { enforced: true, isPremium: false })).toEqual({ allowed: true });
    expect(checkGate(feature, { enforced: true, isPremium: true })).toEqual({ allowed: true });
  });
});

describe('plan identifiers', () => {
  it('matches the Firestore subscription document', () => {
    expect(PLAN.FREE).toBe('free');
    expect(PLAN.PRO).toBe('pro');
  });
});
