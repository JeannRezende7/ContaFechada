import { describe, expect, it, vi } from 'vitest';
import { grantManualPremium, listActiveSubscriptions, revokeManualPremium } from './adminSubscriptions.js';

function fakeDb(docs = []) {
  const set = vi.fn().mockResolvedValue();
  const add = vi.fn().mockResolvedValue();
  const query = { limit: vi.fn().mockReturnThis(), get: vi.fn().mockResolvedValue({ docs }) };
  return {
    collectionGroup: vi.fn(() => query),
    doc: vi.fn(() => ({ set })),
    collection: vi.fn(() => ({ add })),
    set,
    add,
  };
}

const auth = {
  getUsers: vi.fn().mockResolvedValue({ users: [{ uid: 'u1', email: 'user@example.com', displayName: 'User' }] }),
  getUser: vi.fn().mockResolvedValue({ uid: 'u1' }),
  getUserByEmail: vi.fn().mockResolvedValue({ uid: 'u1' }),
};

describe('admin subscriptions', () => {
  it('lists only effectively active subscription documents', async () => {
    const future = { toMillis: () => Date.parse('2026-08-30T00:00:00Z') };
    const past = { toMillis: () => Date.parse('2026-06-01T00:00:00Z') };
    const db = fakeDb([
      { ref: { path: 'users/u1/private/subscription' }, data: () => ({ plan: 'premium', subscriptionStatus: 'active', subscriptionProvider: 'manual', currentPeriodEnd: future }) },
      { ref: { path: 'users/u2/private/subscription' }, data: () => ({ plan: 'premium', subscriptionStatus: 'active', subscriptionProvider: 'manual', currentPeriodEnd: past }) },
    ]);
    const result = await listActiveSubscriptions({ db, auth, now: new Date('2026-07-30T00:00:00Z') });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ uid: 'u1', email: 'user@example.com', provider: 'manual' });
  });

  it('grants and revokes with an audit entry', async () => {
    const db = fakeDb();
    const grant = await grantManualPremium({ db, auth, identifier: 'user@example.com', days: 30, founder: true, adminUid: 'admin1' });
    expect(grant.uid).toBe('u1');
    expect(db.set).toHaveBeenCalledWith(expect.objectContaining({ plan: 'premium', founder: true }), { merge: true });
    expect(db.add).toHaveBeenCalledWith(expect.objectContaining({ actor: 'admin_panel:admin1', action: 'grant' }));

    await revokeManualPremium({ db, auth, identifier: 'u1', adminUid: 'admin1' });
    expect(db.set).toHaveBeenLastCalledWith(expect.objectContaining({ plan: 'free', subscriptionStatus: 'expired' }), { merge: true });
    expect(db.add).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'revoke' }));
  });

  it('rejects unsafe grant periods', async () => {
    await expect(grantManualPremium({ db: fakeDb(), auth, identifier: 'u1', days: 0, adminUid: 'a' })).rejects.toThrow();
    await expect(grantManualPremium({ db: fakeDb(), auth, identifier: 'u1', days: 99999, adminUid: 'a' })).rejects.toThrow();
  });
});
