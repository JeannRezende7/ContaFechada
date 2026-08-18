import { describe, expect, it } from 'vitest';
import { ADMOB_IDS, getAdMobRuntimeConfig } from './ads.js';

describe('AdMob build separation', () => {
  it('uses test mode only when explicitly requested by the build', () => {
    expect(getAdMobRuntimeConfig({ testing: true })).toEqual({ bannerId: ADMOB_IDS.mainBanner, isTesting: true });
    expect(getAdMobRuntimeConfig({ testing: false })).toEqual({ bannerId: ADMOB_IDS.mainBanner, isTesting: false });
  });
});
