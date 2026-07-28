import { verifyIdToken, getAdminDb } from '../lib/firebaseAdmin.js';

/**
 * Deletes subscription data during account deletion. This must run with the
 * Admin SDK because direct client deletion is intentionally denied: otherwise
 * a user could delete/recreate the subscription document to repeat a trial.
 */
export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let user;
  try {
    user = await verifyIdToken(req.headers.get('authorization'));
  } catch (err) {
    console.error('delete-private-user-data: token inválido', err);
    return json({ error: 'unauthorized' }, 401);
  }

  try {
    const db = getAdminDb();
    await db.recursiveDelete(db.doc(`users/${user.uid}/private/subscription`));
    return json({ ok: true });
  } catch (err) {
    console.error('delete-private-user-data: falha ao excluir', err);
    return json({ error: 'falha ao excluir dados privados da conta' }, 500);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
