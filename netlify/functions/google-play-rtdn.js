import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import { getAdminDb } from '../lib/firebaseAdmin.js';
import { getSubscriptionPurchaseV2 } from '../lib/googlePlay.js';
import { GooglePlayRtdnError, processGooglePlayRtdn } from '../lib/googlePlayRtdn.js';
import { applyGooglePlaySubscription } from '../lib/subscriptionWriter.js';

async function verifyPubSubToken(req) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const audience = process.env.GOOGLE_PUBSUB_AUDIENCE;
  const expectedEmail = process.env.GOOGLE_PUBSUB_SERVICE_ACCOUNT_EMAIL;
  if (!token || !audience || !expectedEmail) throw new GooglePlayRtdnError('Pub/Sub não configurado', 401);

  const ticket = await new OAuth2Client().verifyIdToken({ idToken: token, audience });
  const payload = ticket.getPayload();
  if (!payload?.email_verified || payload.email !== expectedEmail) {
    throw new GooglePlayRtdnError('identidade Pub/Sub inválida', 403);
  }
}

async function publisherAccessToken() {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT;
  if (!raw) throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT não configurada');
  const auth = new GoogleAuth({
    credentials: JSON.parse(raw),
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  if (!token) throw new Error('Google Play access token indisponível');
  return token;
}

export function createGooglePlayRtdnHandler({
  verifyToken = verifyPubSubToken,
  getDb = getAdminDb,
  getAccessToken = publisherAccessToken,
  fetchPurchase = getSubscriptionPurchaseV2,
  applySubscription = applyGooglePlaySubscription,
  expectedPackageName = () => process.env.ANDROID_PACKAGE_NAME,
  processNotification = processGooglePlayRtdn,
} = {}) {
  return async (req) => {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    try {
      await verifyToken(req);
      const contentLength = Number(req.headers.get('content-length') || 0);
      if (contentLength > 262_144) throw new GooglePlayRtdnError('payload muito grande', 413);
      const rawBody = await req.text();
      if (rawBody.length > 262_144) throw new GooglePlayRtdnError('payload muito grande', 413);
      const body = JSON.parse(rawBody);
      const result = await processNotification({
        body,
        expectedPackageName: expectedPackageName(),
        db: getDb(),
        getAccessToken,
        fetchPurchase,
        applySubscription,
      });
      return Response.json({ ok: true, messageId: result.event.messageId });
    } catch (error) {
      const status = error instanceof GooglePlayRtdnError ? error.status : 500;
      console.error('google-play-rtdn: falha', error);
      return Response.json({ error: status < 500 ? error.message : 'falha ao processar notificação' }, { status });
    }
  };
}

export default createGooglePlayRtdnHandler();
