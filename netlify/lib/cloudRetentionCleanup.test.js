import { describe, expect, it, vi } from 'vitest';
import { cleanupExpiredCloudCopies, retentionCutoff } from './cloudRetentionCleanup.js';

function fakeDb(docs) {
  const recursiveDelete = vi.fn().mockResolvedValue(undefined);
  const query = {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ size: docs.length, docs }),
  };
  return { collectionGroup: vi.fn(() => query), collection: vi.fn((path) => ({ path })), recursiveDelete, query };
}

function subscription(path, data) {
  return { ref: { path, set: vi.fn().mockResolvedValue(undefined) }, data: () => data };
}

describe('cloud retention cleanup', () => {
  it('calcula a janela de 90 dias', () => {
    expect(retentionCutoff(new Date('2026-07-30T00:00:00Z')).toISOString()).toBe('2026-05-01T00:00:00.000Z');
  });

  it('apaga só dados financeiros de assinatura inativa elegível', async () => {
    const eligible = subscription('users/u1/private/subscription', { subscriptionStatus: 'expired' });
    const active = subscription('users/u2/private/subscription', { subscriptionStatus: 'active' });
    const db = fakeDb([eligible, active]);

    const result = await cleanupExpiredCloudCopies({ db, now: new Date('2026-07-30T00:00:00Z') });

    expect(result).toMatchObject({ scanned: 2, eligible: 1, deleted: 1, skipped: 1, errors: [] });
    expect(db.recursiveDelete).toHaveBeenCalledTimes(10);
    expect(db.recursiveDelete.mock.calls.map(([ref]) => ref.path)).not.toContain('users/u1/private');
    expect(eligible.ref.set).toHaveBeenCalledWith(
      expect.objectContaining({ cloudCopyDeletionReason: 'retention_expired' }),
      { merge: true }
    );
  });

  it('dry-run não apaga nem marca documentos', async () => {
    const doc = subscription('users/u1/private/subscription', { subscriptionStatus: 'canceled' });
    const db = fakeDb([doc]);
    const result = await cleanupExpiredCloudCopies({ db, dryRun: true });
    expect(result.eligible).toBe(1);
    expect(result.deleted).toBe(0);
    expect(db.recursiveDelete).not.toHaveBeenCalled();
    expect(doc.ref.set).not.toHaveBeenCalled();
  });
});
