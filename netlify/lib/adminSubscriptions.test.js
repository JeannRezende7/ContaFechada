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
  it('lists only lifetime Pro entitlement documents', async () => {
    const db = fakeDb([
      { ref: { path: 'users/u1/private/subscription' }, data: () => ({ plan: 'pro', proLifetime: true, subscriptionProvider: 'manual' }) },
      { ref: { path: 'users/u2/private/subscription' }, data: () => ({ plan: 'free', proLifetime: false }) },
    ]);
    const result = await listActiveSubscriptions({ db, auth, now: new Date('2026-07-30T00:00:00Z') });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ uid: 'u1', email: 'user@example.com', provider: 'manual' });
  });

  it('grants and revokes with an audit entry', async () => {
    const db = fakeDb();
    const grant = await grantManualPremium({ db, auth, identifier: 'user@example.com', adminUid: 'admin1' });
    expect(grant.uid).toBe('u1');
    expect(db.set).toHaveBeenCalledWith(expect.objectContaining({ plan: 'pro', proLifetime: true }), { merge: true });
    expect(db.add).toHaveBeenCalledWith(expect.objectContaining({ actor: 'admin_panel:admin1', action: 'grant_lifetime' }));

    await revokeManualPremium({ db, auth, identifier: 'u1', adminUid: 'admin1' });
    expect(db.set).toHaveBeenLastCalledWith(expect.objectContaining({ plan: 'free', proLifetime: false }), { merge: true });
    expect(db.add).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'revoke_lifetime' }));
  });
});
