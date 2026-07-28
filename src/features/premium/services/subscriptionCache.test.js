import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSubscriptionCache,
  readSubscriptionCache,
  writeSubscriptionCache,
} from './subscriptionCache.js';

function createStorage() {
  const values = new Map();
  return {
    get length() { return values.size; },
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => values.set(key, value)),
    removeItem: vi.fn((key) => values.delete(key)),
    key: vi.fn((index) => [...values.keys()][index] ?? null),
  };
}

describe('subscriptionCache', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorage());
  });

  it('isolates cached subscription state by uid', () => {
    writeSubscriptionCache('u1', { plan: 'premium', subscriptionStatus: 'active' });
    writeSubscriptionCache('u2', { plan: 'free', subscriptionStatus: 'none' });

    expect(readSubscriptionCache('u1')).toMatchObject({ plan: 'premium' });
    expect(readSubscriptionCache('u2')).toMatchObject({ plan: 'free' });
  });

  it('clears only the requested user cache', () => {
    writeSubscriptionCache('u1', { plan: 'premium' });
    writeSubscriptionCache('u2', { plan: 'free' });
    clearSubscriptionCache('u1');

    expect(readSubscriptionCache('u1')).toBeNull();
    expect(readSubscriptionCache('u2')).toMatchObject({ plan: 'free' });
  });

  it('can remove every Conta Fechada subscription cache without touching unrelated storage', () => {
    localStorage.setItem('unrelated', 'keep');
    writeSubscriptionCache('u1', { plan: 'premium' });
    writeSubscriptionCache('u2', { plan: 'free' });
    clearSubscriptionCache();

    expect(readSubscriptionCache('u1')).toBeNull();
    expect(readSubscriptionCache('u2')).toBeNull();
    expect(localStorage.getItem('unrelated')).toBe('keep');
  });
});
