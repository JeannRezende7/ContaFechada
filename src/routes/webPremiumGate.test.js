import { describe, expect, it } from 'vitest';
import { shouldBlockWebAccess } from './webPremiumGate.js';

describe('shouldBlockWebAccess', () => {
  it('never blocks on native (Android) regardless of plan or enforcement', () => {
    expect(shouldBlockWebAccess({ isNativePlatform: true, enforced: true, isPremium: false })).toBe(false);
    expect(shouldBlockWebAccess({ isNativePlatform: true, enforced: true, isPremium: true })).toBe(false);
  });

  it('never blocks on web while enforcement is off, matching PREMIUM_ENFORCED=false today', () => {
    expect(shouldBlockWebAccess({ isNativePlatform: false, enforced: false, isPremium: false })).toBe(false);
  });

  it('blocks a non-Premium account on web once enforcement is on', () => {
    expect(shouldBlockWebAccess({ isNativePlatform: false, enforced: true, isPremium: false })).toBe(true);
  });

  it('never blocks a Premium account on web', () => {
    expect(shouldBlockWebAccess({ isNativePlatform: false, enforced: true, isPremium: true })).toBe(false);
  });
});
