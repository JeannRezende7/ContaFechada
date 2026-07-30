import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const DAY_MS = 86_400_000;
const VISIBLE_STATUSES = new Set(['active', 'trialing', 'past_due', 'canceled']);

function uidFromRef(ref) {
  return /^users\/([^/]+)\/private\/subscription$/.exec(ref.path)?.[1] ?? null;
}

function timestampMillis(value) {
  return typeof value?.toMillis === 'function' ? value.toMillis() : null;
}

function effectiveActive(data, nowMs) {
  const end = timestampMillis(data.currentPeriodEnd);
  const trialEnd = timestampMillis(data.trialEndsAt);
  if (data.subscriptionStatus === 'trialing') return trialEnd == null || trialEnd >= nowMs;
  if (data.subscriptionStatus === 'canceled') return end != null && end >= nowMs;
  if (['active', 'past_due'].includes(data.subscriptionStatus)) return end == null || end >= nowMs;
  return false;
}

export async function listActiveSubscriptions({ db, auth, limit = 100, offset = 0, search = '', now = new Date() }) {
  const normalizedLimit = Math.min(Math.max(Number(limit) || 1, 1), 100);
  const normalizedOffset = Math.min(Math.max(Number(offset) || 0, 0), 10_000);
  const snapshot = await db.collectionGroup('private').limit(500).get();
  const rows = snapshot.docs
    .map((doc) => ({ uid: uidFromRef(doc.ref), data: doc.data() }))
    .filter(({ uid, data }) => uid && VISIBLE_STATUSES.has(data.subscriptionStatus) && effectiveActive(data, now.getTime()));

  const resolvedUsers = [];
  for (let index = 0; index < rows.length; index += 100) {
    const result = await auth.getUsers(
      rows.slice(index, index + 100).map(({ uid }) => ({ uid }))
    );
    resolvedUsers.push(...result.users);
  }
  const userByUid = new Map(resolvedUsers.map((user) => [user.uid, user]));

  return rows.map(({ uid, data }) => ({
    uid,
    email: userByUid.get(uid)?.email ?? null,
    displayName: userByUid.get(uid)?.displayName ?? null,
    plan: data.plan,
    status: data.subscriptionStatus,
    provider: data.subscriptionProvider,
    currentPeriodEnd: timestampMillis(data.currentPeriodEnd),
    founder: Boolean(data.founder),
  })).filter((item) => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return !term || [item.uid, item.email, item.displayName, item.provider]
      .some((value) => String(value || '').toLocaleLowerCase('pt-BR').includes(term));
  }).slice(normalizedOffset, normalizedOffset + normalizedLimit);
}

async function resolveUid(auth, identifier) {
  if (!identifier || typeof identifier !== 'string') throw new TypeError('uid ou e-mail obrigatório');
  const normalized = identifier.trim();
  if (!normalized || normalized.length > 320) throw new TypeError('identificador inválido');
  return normalized.includes('@') ? (await auth.getUserByEmail(normalized)).uid : normalized;
}

export async function listSubscriptionHistory({ db, identifier, limit = 50 }) {
  if (!identifier || typeof identifier !== 'string' || identifier.length > 128) {
    throw new TypeError('uid inválido');
  }
  const snapshot = await db.collection(`users/${identifier}/private/subscription/subscription_log`)
    .orderBy('at', 'desc')
    .limit(Math.min(Math.max(Number(limit) || 1, 1), 100))
    .get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      action: data.action ?? null,
      actor: data.actor ?? null,
      provider: data.provider ?? null,
      at: timestampMillis(data.at),
    };
  });
}

async function logAdminAction(db, uid, entry) {
  await db.collection(`users/${uid}/private/subscription/subscription_log`).add({
    ...entry,
    at: FieldValue.serverTimestamp(),
  });
}

export async function grantManualPremium({ db, auth, identifier, days, founder = false, adminUid }) {
  const normalizedDays = Number(days);
  if (!Number.isInteger(normalizedDays) || normalizedDays < 1 || normalizedDays > 3650) {
    throw new TypeError('days deve ser inteiro entre 1 e 3650');
  }
  const uid = await resolveUid(auth, identifier);
  await auth.getUser(uid);
  const end = Timestamp.fromMillis(Date.now() + normalizedDays * DAY_MS);
  await db.doc(`users/${uid}/private/subscription`).set({
    plan: 'premium',
    subscriptionStatus: 'active',
    subscriptionProvider: 'manual',
    subscriptionId: `admin_${Date.now()}`,
    currentPeriodEnd: end,
    cancelAtPeriodEnd: false,
    founder: Boolean(founder),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await logAdminAction(db, uid, { actor: `admin_panel:${adminUid}`, action: 'grant', days: normalizedDays, founder: Boolean(founder) });
  return { uid, currentPeriodEnd: end.toMillis() };
}

export async function revokeManualPremium({ db, auth, identifier, adminUid }) {
  const uid = await resolveUid(auth, identifier);
  await auth.getUser(uid);
  await db.doc(`users/${uid}/private/subscription`).set({
    plan: 'free',
    subscriptionStatus: 'expired',
    cancelAtPeriodEnd: false,
    currentPeriodEnd: Timestamp.now(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await logAdminAction(db, uid, { actor: `admin_panel:${adminUid}`, action: 'revoke' });
  return { uid };
}
