import { describe, expect, it } from 'vitest';
import { canSync } from './syncPolicy.js';

describe('canSync', () => {
  it('allows syncing only when both Premium and online', () => {
    expect(canSync({ isPremium: true, isOnline: true })).toBe(true);
  });

  it('pauses when not Premium, even online', () => {
    expect(canSync({ isPremium: false, isOnline: true })).toBe(false);
  });

  it('pauses when offline, even with Premium', () => {
    expect(canSync({ isPremium: true, isOnline: false })).toBe(false);
  });

  it('pauses when neither Premium nor online', () => {
    expect(canSync({ isPremium: false, isOnline: false })).toBe(false);
  });
});
