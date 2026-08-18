import { GoogleAuth } from 'google-auth-library';
import { GOOGLE_PLAY_PRODUCTS } from '../../src/config/premium.js';
import { verifyIdToken } from '../lib/firebaseAdmin.js';
import { applyGooglePlayLifetimePurchase } from '../lib/subscriptionWriter.js';
import { acknowledgeOneTimeProductPurchase, getOneTimeProductPurchase } from '../lib/googlePlay.js';

/** Valida no servidor uma compra unica antes de conceder o Pro vitalicio. */
export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let user;
  try {
    user = await verifyIdToken(req.headers.get('authorization'));
  } catch (error) {
    console.error('validate-android-purchase: token invalido', error);
    return json({ error: 'unauthorized' }, 401);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid body' }, 400);
  }

  const { purchaseToken, productId } = body;
  if (!purchaseToken || !productId) return json({ error: 'purchaseToken e productId sao obrigatorios' }, 400);
  if (productId !== GOOGLE_PLAY_PRODUCTS.PRO_LIFETIME) return json({ error: 'produto invalido' }, 400);

  const packageName = process.env.ANDROID_PACKAGE_NAME;
  const serviceAccountRaw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT;
  if (!packageName || !serviceAccountRaw) return json({ error: 'Google Play nao configurado no servidor' }, 500);

  try {
    const auth = new GoogleAuth({
      credentials: JSON.parse(serviceAccountRaw),
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
    const client = await auth.getClient();
    const { token: accessToken } = await client.getAccessToken();
    const purchase = await getOneTimeProductPurchase({ packageName, productId, purchaseToken, accessToken });

    if (purchase.purchaseState === 2) return json({ ok: false, pending: true }, 202);
    if (purchase.purchaseState !== 0) return json({ error: 'compra nao concluida' }, 409);

    const subscription = await applyGooglePlayLifetimePurchase(user.uid, purchase, { purchaseToken, productId });
    if (purchase.acknowledgementState !== 1) {
      await acknowledgeOneTimeProductPurchase({ packageName, productId, purchaseToken, accessToken });
    }
    return json({ ok: true, subscription });
  } catch (error) {
    console.error('validate-android-purchase: falha ao validar', error);
    return json({ error: 'falha ao validar compra' }, 502);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}
