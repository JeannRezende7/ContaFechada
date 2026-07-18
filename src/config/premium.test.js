import { describe, it, expect } from 'vitest';
import {
  FEATURES,
  FREE_LIMITS,
  PLAN,
  PREMIUM_ENFORCED,
  checkGate,
  getLimit,
  isLimitFeature,
  isBooleanFeature,
  getOldestAllowedMonthKey,
} from './premium.js';

describe('PREMIUM_ENFORCED default', () => {
  it('is off until the paid plan launches — no user should be gated by default', () => {
    expect(PREMIUM_ENFORCED).toBe(false);
  });

  it('checkGate always allows every feature while enforcement is off, regardless of plan or usage', () => {
    for (const feature of Object.values(FEATURES)) {
      expect(checkGate(feature, { isPremium: false, count: 999 })).toEqual({ allowed: true });
    }
  });
});

describe('every FEATURES key is classified as exactly one kind', () => {
  it.each(Object.values(FEATURES))('%s is either a limit feature or a boolean feature, never both/neither', (feature) => {
    expect(isLimitFeature(feature) !== isBooleanFeature(feature)).toBe(true);
  });
});

describe('checkGate — limit features (enforced)', () => {
  const LIMITED = [FEATURES.CATEGORIAS_CUSTOM, FEATURES.RECORRENCIAS, FEATURES.METAS];

  it.each(LIMITED)('%s: allows creation below the free limit', (feature) => {
    const limit = FREE_LIMITS[feature];
    expect(checkGate(feature, { enforced: true, isPremium: false, count: limit - 1 })).toEqual({ allowed: true });
  });

  it.each(LIMITED)('%s: blocks creation once the free limit is reached', (feature) => {
    const limit = FREE_LIMITS[feature];
    expect(checkGate(feature, { enforced: true, isPremium: false, count: limit })).toEqual({
      allowed: false,
      reason: 'limit_reached',
      limit,
    });
  });

  it.each(LIMITED)('%s: never blocks a premium user, no matter the count', (feature) => {
    const limit = FREE_LIMITS[feature];
    expect(checkGate(feature, { enforced: true, isPremium: true, count: limit + 50 })).toEqual({ allowed: true });
  });

  it('a free user sitting above the limit (e.g. after downgrading) is blocked from creating more, but existing data is never touched by this check', () => {
    // checkGate only guards new creation, not reads/listing — verified here by
    // asserting it has no concept of "existing count" beyond the number passed in.
    const result = checkGate(FEATURES.RECORRENCIAS, { enforced: true, isPremium: false, count: 7 });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('limit_reached');
  });
});

describe('checkGate — boolean (all-or-nothing) features', () => {
  const booleanFeatures = [
    FEATURES.RELATORIOS_AVANCADOS,
    FEATURES.GESTOR_AVANCADO,
    FEATURES.INSIGHTS_AVANCADOS,
    FEATURES.EXPORTACAO_AVANCADA,
  ];

  it.each(booleanFeatures)('%s: always blocked for a free user once enforced', (feature) => {
    expect(checkGate(feature, { enforced: true, isPremium: false })).toEqual({
      allowed: false,
      reason: 'premium_required',
    });
  });

  it.each(booleanFeatures)('%s: always allowed for a premium user', (feature) => {
    expect(checkGate(feature, { enforced: true, isPremium: true })).toEqual({ allowed: true });
  });
});

describe('getLimit / isLimitFeature / isBooleanFeature', () => {
  it('returns the configured cap for limit features', () => {
    expect(getLimit(FEATURES.CATEGORIAS_CUSTOM)).toBe(5);
    expect(getLimit(FEATURES.RECORRENCIAS)).toBe(2);
    expect(getLimit(FEATURES.METAS)).toBe(2);
    expect(getLimit(FEATURES.HISTORICO)).toBe(2);
  });

  it('returns null for boolean (non-quantitative) features', () => {
    expect(getLimit(FEATURES.RELATORIOS_AVANCADOS)).toBeNull();
    expect(getLimit(FEATURES.GESTOR_AVANCADO)).toBeNull();
    expect(getLimit(FEATURES.INSIGHTS_AVANCADOS)).toBeNull();
    expect(getLimit(FEATURES.EXPORTACAO_AVANCADA)).toBeNull();
  });
});

describe('getOldestAllowedMonthKey — historico limit', () => {
  const shiftMonthKey = (monthKey, delta) => {
    const [year, month] = monthKey.split('-').map(Number);
    const d = new Date(year, month - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  it('has no floor while enforcement is off', () => {
    expect(
      getOldestAllowedMonthKey({ isPremium: false, currentMonthKey: '2026-07', shiftMonthKey, enforced: false })
    ).toBeNull();
  });

  it('has no floor for a premium user even when enforced', () => {
    expect(
      getOldestAllowedMonthKey({ isPremium: true, currentMonthKey: '2026-07', shiftMonthKey, enforced: true })
    ).toBeNull();
  });

  it('floors a free user at (mes atual - 2) when enforced, matching the Gratuito plan description', () => {
    expect(
      getOldestAllowedMonthKey({ isPremium: false, currentMonthKey: '2026-07', shiftMonthKey, enforced: true })
    ).toBe('2026-05');
  });

  it('rolls over year boundaries correctly', () => {
    expect(
      getOldestAllowedMonthKey({ isPremium: false, currentMonthKey: '2026-01', shiftMonthKey, enforced: true })
    ).toBe('2025-11');
  });
});

describe('plan transition scenarios', () => {
  it('goal completion frees up a slot: a free user with 2 metas ativas but one now concluída can create another', () => {
    // The page layer is responsible for excluding metas concluídas from the
    // count it passes in — this test documents that contract: passing the
    // post-exclusion count (1) must allow creation again.
    const countAposExcluirConcluidas = 1;
    expect(
      checkGate(FEATURES.METAS, { enforced: true, isPremium: false, count: countAposExcluirConcluidas })
    ).toEqual({ allowed: true });
  });

  it('downgrading from premium to free re-applies the limit on the very next creation attempt', () => {
    const wasPremium = checkGate(FEATURES.RECORRENCIAS, { enforced: true, isPremium: true, count: 10 });
    const nowFree = checkGate(FEATURES.RECORRENCIAS, { enforced: true, isPremium: false, count: 10 });
    expect(wasPremium.allowed).toBe(true);
    expect(nowFree.allowed).toBe(false);
  });

  it('PLAN constants match the values expected in the Firestore subscription doc', () => {
    expect(PLAN.FREE).toBe('free');
    expect(PLAN.PREMIUM).toBe('premium');
  });
});
