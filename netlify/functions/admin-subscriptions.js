import { getAdminAuth, getAdminDb, verifyIdToken } from '../lib/firebaseAdmin.js';
import {
  grantManualPremium,
  listActiveSubscriptions,
  listSubscriptionHistory,
  revokeManualPremium,
} from '../lib/adminSubscriptions.js';

export function createAdminSubscriptionsHandler({
  verifyToken = verifyIdToken,
  getDb = getAdminDb,
  getAuth = getAdminAuth,
  list = listActiveSubscriptions,
  grant = grantManualPremium,
  revoke = revokeManualPremium,
  history = listSubscriptionHistory,
} = {}) {
  return async (req) => {
    let admin;
    try {
      admin = await verifyToken(req.headers.get('authorization'));
      if (admin.admin !== true) return Response.json({ error: 'forbidden' }, { status: 403 });
    } catch {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    try {
      const db = getDb();
      const auth = getAuth();
      if (req.method === 'GET') {
        const url = new URL(req.url);
        if (url.searchParams.get('action') === 'history') {
          return Response.json({
            history: await history({
              db,
              identifier: url.searchParams.get('uid'),
              limit: url.searchParams.get('limit'),
            }),
          });
        }
        const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 50, 1), 100);
        const offset = Math.min(Math.max(Number(url.searchParams.get('offset')) || 0, 0), 10_000);
        const subscriptions = await list({
          db,
          auth,
          limit,
          offset,
          search: url.searchParams.get('search') || '',
        });
        return Response.json({
          subscriptions,
          nextOffset: subscriptions.length === limit ? offset + limit : null,
        });
      }
      if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

      const contentLength = Number(req.headers.get('content-length') || 0);
      if (contentLength > 4096) return Response.json({ error: 'payload too large' }, { status: 413 });
      const rawBody = await req.text();
      if (rawBody.length > 4096) return Response.json({ error: 'payload too large' }, { status: 413 });
      const body = JSON.parse(rawBody);
      if (body.action === 'grant') {
        const result = await grant({ db, auth, identifier: body.identifier, days: body.days, founder: body.founder, adminUid: admin.uid });
        return Response.json({ ok: true, ...result });
      }
      if (body.action === 'revoke') {
        const result = await revoke({ db, auth, identifier: body.identifier, adminUid: admin.uid });
        return Response.json({ ok: true, ...result });
      }
      return Response.json({ error: 'invalid action' }, { status: 400 });
    } catch (error) {
      if (error instanceof TypeError) return Response.json({ error: error.message }, { status: 400 });
      console.error('admin-subscriptions: falha', error);
      return Response.json({ error: 'admin operation failed' }, { status: 500 });
    }
  };
}

export default createAdminSubscriptionsHandler();
