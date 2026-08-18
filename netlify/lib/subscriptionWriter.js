import { FieldValue } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { getAdminDb } from './firebaseAdmin.js';

/** Grants lifetime Pro and prevents a purchase token from being shared. */
export async function applyGooglePlayLifetimePurchase(uid, purchase, { purchaseToken, productId, actor = 'google_play_validation' } = {}) {
  if (purchase.purchaseState !== 0) throw new Error('Compra ainda nao esta concluida.');
  if (!purchaseToken || !productId) throw new TypeError('purchaseToken e productId sao obrigatorios.');

  const db = getAdminDb();
  const tokenHash = createHash('sha256').update(purchaseToken).digest('hex');
  const ownershipRef = db.doc(`google_play_purchases/${tokenHash}`);
  const entitlementRef = db.doc(`users/${uid}/private/subscription`);
  const patch = {
    plan: 'pro',
    proLifetime: true,
    subscriptionStatus: 'none',
    subscriptionProvider: 'google_play',
    subscriptionId: null,
    googlePlayPurchaseTokenHash: tokenHash,
    googlePlayProductId: productId,
    googlePlayOrderId: purchase.orderId ?? null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await db.runTransaction(async (transaction) => {
    const owner = await transaction.get(ownershipRef);
    if (owner.exists && owner.data().uid !== uid) throw new Error('Compra ja vinculada a outra conta.');
    transaction.set(ownershipRef, {
      uid,
      productId,
      orderId: purchase.orderId ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(entitlementRef, patch, { merge: true });
  });

  await logEntitlementChange(uid, {
    actor,
    source: 'google_play_one_time',
    productId,
    orderId: purchase.orderId ?? null,
  });
  return patch;
}

export async function logEntitlementChange(uid, entry) {
  try {
    const db = getAdminDb();
    await db.collection(`users/${uid}/private/subscription/subscription_log`)
      .add({ ...entry, at: FieldValue.serverTimestamp() });
  } catch {
    // Audit logging is best-effort and never exposes purchase data in logs.
  }
}
