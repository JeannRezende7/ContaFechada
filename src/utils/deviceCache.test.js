import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  clearDashboardMemoryCache: vi.fn(),
  clearSubscriptionCache: vi.fn(),
  terminate: vi.fn(),
  clearIndexedDbPersistence: vi.fn(),
  db: { name: 'firestore-test' },
}));

vi.mock('../features/dashboard/services/dashboardService.js', () => ({
  clearDashboardMemoryCache: mocks.clearDashboardMemoryCache,
}));
vi.mock('../features/premium/services/subscriptionCache.js', () => ({
  clearSubscriptionCache: mocks.clearSubscriptionCache,
}));
vi.mock('firebase/firestore', () => ({
  terminate: mocks.terminate,
  clearIndexedDbPersistence: mocks.clearIndexedDbPersistence,
}));
vi.mock('../firebase/config.js', () => ({ db: mocks.db }));

import { clearDeviceData, clearSessionCaches } from './deviceCache.js';

describe('device cache isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.terminate.mockResolvedValue();
    mocks.clearIndexedDbPersistence.mockResolvedValue();
  });

  it('clears user-scoped memory and subscription caches on session end', () => {
    clearSessionCaches('u1');
    expect(mocks.clearDashboardMemoryCache).toHaveBeenCalledWith('u1');
    expect(mocks.clearSubscriptionCache).toHaveBeenCalledWith('u1');
  });

  it('terminates Firestore before clearing persistent IndexedDB data', async () => {
    await clearDeviceData('u1');
    expect(mocks.terminate).toHaveBeenCalledWith(mocks.db);
    expect(mocks.clearIndexedDbPersistence).toHaveBeenCalledWith(mocks.db);
    expect(mocks.terminate.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.clearIndexedDbPersistence.mock.invocationCallOrder[0]);
  });

  it('explains that other open tabs can block the cleanup', async () => {
    mocks.clearIndexedDbPersistence.mockRejectedValue({ code: 'failed-precondition' });
    await expect(clearDeviceData('u1')).rejects
      .toThrow('Feche as outras abas do Conta Fechada e tente novamente.');
  });
});
