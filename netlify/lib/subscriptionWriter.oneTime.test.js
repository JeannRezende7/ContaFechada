import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAdminDb = vi.fn();
vi.mock('./firebaseAdmin.js', () => ({ getAdminDb }));

const { applyGooglePlayLifetimePurchase } = await import('./subscriptionWriter.js');

function fakeDb(owner) {
  const writes = [];
  const transaction = {
    get: vi.fn().mockResolvedValue({ exists: Boolean(owner), data: () => owner }),
    set: vi.fn((ref, value) => writes.push({ path: ref.path, value })),
  };
  return {
    writes,
    transaction,
    doc: (path) => ({ path }),
    runTransaction: (callback) => callback(transaction),
    collection: () => ({ add: vi.fn().mockResolvedValue() }),
  };
}

describe('Google Play lifetime entitlement', () => {
  beforeEach(() => vi.clearAllMocks());

  it('atomically records token ownership and permanent Pro access', async () => {
    const db = fakeDb();
    getAdminDb.mockReturnValue(db);
    const result = await applyGooglePlayLifetimePurchase('uid-1', { purchaseState: 0, orderId: 'order-1' }, {
      purchaseToken: 'secret-token', productId: 'conta_fechada_pro_lifetime',
    });
    expect(result).toMatchObject({ plan: 'pro', proLifetime: true, currentPeriodEnd: null });
    expect(db.writes.map((item) => item.path)).toContain('users/uid-1/private/subscription');
    expect(db.writes.some((item) => item.path.startsWith('google_play_purchases/'))).toBe(true);
    expect(JSON.stringify(db.writes)).not.toContain('secret-token');
  });

  it('rejects a pending purchase and a token owned by another uid', async () => {
    getAdminDb.mockReturnValue(fakeDb());
    await expect(applyGooglePlayLifetimePurchase('uid-1', { purchaseState: 2 }, {
      purchaseToken: 'token', productId: 'pro',
    })).rejects.toThrow('nao esta concluida');

    getAdminDb.mockReturnValue(fakeDb({ uid: 'uid-2' }));
    await expect(applyGooglePlayLifetimePurchase('uid-1', { purchaseState: 0 }, {
      purchaseToken: 'token', productId: 'pro',
    })).rejects.toThrow('outra conta');
  });
});
