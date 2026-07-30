import { beforeEach, describe, expect, it } from 'vitest';
import { endLocalSession, isLocalSessionActive, startLocalSession } from './localSession.js';

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
}

describe('localSession', () => {
  beforeEach(() => {
    globalThis.localStorage = createMemoryStorage();
  });

  it('is inactive until startLocalSession is called', () => {
    expect(isLocalSessionActive()).toBe(false);
  });

  it('activates and persists after startLocalSession', () => {
    startLocalSession();
    expect(isLocalSessionActive()).toBe(true);
  });

  it('deactivates after endLocalSession', () => {
    startLocalSession();
    endLocalSession();
    expect(isLocalSessionActive()).toBe(false);
  });
});
