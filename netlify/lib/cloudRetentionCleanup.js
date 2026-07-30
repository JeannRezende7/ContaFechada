import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { USER_FINANCIAL_COLLECTIONS } from '../../shared/userDataCollections.js';

export const RETAINED_COLLECTIONS = USER_FINANCIAL_COLLECTIONS;

export const INACTIVE_SUBSCRIPTION_STATUSES = new Set([
  'canceled',
  'cancelled',
  'expired',
  'past_due',
  'suspended',
  'none',
]);

export function retentionCutoff(now = new Date(), retentionDays = 90) {
  return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
}

function uidFromSubscriptionRef(ref) {
  const match = /^users\/([^/]+)\/private\/subscription$/.exec(ref.path);
  return match?.[1] ?? null;
}

export async function deleteFinancialCloudCopy(db, uid) {
  await Promise.all(
    RETAINED_COLLECTIONS.map((name) => db.recursiveDelete(db.collection(`users/${uid}/${name}`)))
  );
  await db.recursiveDelete(db.collection(`users/${uid}/config`));
}

/**
 * Remove somente a cópia financeira de contas inativas cujo período terminou
 * há pelo menos `retentionDays`. Conta Auth, assinatura e logs são preservados.
 */
export async function cleanupExpiredCloudCopies({
  db,
  now = new Date(),
  retentionDays = 90,
  dryRun = false,
  limit = 100,
}) {
  const cutoff = retentionCutoff(now, retentionDays);
  const snapshot = await db
    .collectionGroup('private')
    .where('currentPeriodEnd', '<=', Timestamp.fromDate(cutoff))
    .limit(limit)
    .get();

  const summary = { scanned: snapshot.size, eligible: 0, deleted: 0, skipped: 0, errors: [] };

  for (const doc of snapshot.docs) {
    const uid = uidFromSubscriptionRef(doc.ref);
    const data = doc.data();
    if (!uid || !INACTIVE_SUBSCRIPTION_STATUSES.has(data.subscriptionStatus)) {
      summary.skipped++;
      continue;
    }

    summary.eligible++;
    if (dryRun) continue;

    try {
      await deleteFinancialCloudCopy(db, uid);
      await doc.ref.set(
        {
          cloudCopyDeletedAt: FieldValue.serverTimestamp(),
          cloudCopyDeletionReason: 'retention_expired',
        },
        { merge: true }
      );
      summary.deleted++;
    } catch (error) {
      summary.errors.push({ uid, message: error instanceof Error ? error.message : String(error) });
    }
  }

  return summary;
}
