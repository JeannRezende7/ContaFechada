import { FieldValue } from 'firebase-admin/firestore';

function uidFromRef(ref) {
  return /^users\/([^/]+)\/private\/subscription$/.exec(ref.path)?.[1] ?? null;
}

function timestampMillis(value) {
  return typeof value?.toMillis === 'function' ? value.toMillis() : null;
}

export async function listActiveSubscriptions({ db, auth, limit = 100, offset = 0, search = '' }) {
  const normalizedLimit = Math.min(Math.max(Number(limit) || 1, 1), 100);
  const normalizedOffset = Math.min(Math.max(Number(offset) || 0, 0), 10_000);
  const snapshot = await db.collectionGroup('private').limit(500).get();
  const rows = snapshot.docs
    .map((doc) => ({ uid: uidFromRef(doc.ref), data: doc.data() }))
    .filter(({ uid, data }) => uid && data.proLifetime === true);
  const resolvedUsers = [];
  for (let index = 0; index < rows.length; index += 100) {
    const result = await auth.getUsers(rows.slice(index, index + 100).map(({ uid }) => ({ uid })));
    resolvedUsers.push(...result.users);
  }
  const userByUid = new Map(resolvedUsers.map((user) => [user.uid, user]));
  return rows.map(({ uid, data }) => ({
    uid,
    email: userByUid.get(uid)?.email ?? null,
    displayName: userByUid.get(uid)?.displayName ?? null,
    plan: 'pro',
    provider: data.subscriptionProvider ?? null,
  })).filter((item) => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return !term || [item.uid, item.email, item.displayName, item.provider]
      .some((value) => String(value || '').toLocaleLowerCase('pt-BR').includes(term));
  }).slice(normalizedOffset, normalizedOffset + normalizedLimit);
}

async function resolveUid(auth, identifier) {
  if (!identifier || typeof identifier !== 'string') throw new TypeError('uid ou e-mail obrigatorio');
  const normalized = identifier.trim();
  if (!normalized || normalized.length > 320) throw new TypeError('identificador invalido');
  return normalized.includes('@') ? (await auth.getUserByEmail(normalized)).uid : normalized;
}

export async function listSubscriptionHistory({ db, identifier, limit = 50 }) {
  if (!identifier || typeof identifier !== 'string' || identifier.length > 128) throw new TypeError('uid invalido');
  const snapshot = await db.collection(`users/${identifier}/private/subscription/subscription_log`)
    .orderBy('at', 'desc').limit(Math.min(Math.max(Number(limit) || 1, 1), 100)).get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return { id: doc.id, action: data.action ?? null, actor: data.actor ?? null, provider: data.provider ?? null, at: timestampMillis(data.at) };
  });
}

async function logAdminAction(db, uid, entry) {
  await db.collection(`users/${uid}/private/subscription/subscription_log`).add({ ...entry, at: FieldValue.serverTimestamp() });
}

export async function grantManualPremium({ db, auth, identifier, adminUid }) {
  const uid = await resolveUid(auth, identifier);
  await auth.getUser(uid);
  await db.doc(`users/${uid}/private/subscription`).set({
    plan: 'pro', proLifetime: true, subscriptionProvider: 'manual', updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await logAdminAction(db, uid, { actor: `admin_panel:${adminUid}`, action: 'grant_lifetime' });
  return { uid };
}

export async function revokeManualPremium({ db, auth, identifier, adminUid }) {
  const uid = await resolveUid(auth, identifier);
  await auth.getUser(uid);
  await db.doc(`users/${uid}/private/subscription`).set({
    plan: 'free', proLifetime: false, subscriptionProvider: null, updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await logAdminAction(db, uid, { actor: `admin_panel:${adminUid}`, action: 'revoke_lifetime' });
  return { uid };
}
