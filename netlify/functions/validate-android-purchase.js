import { GoogleAuth } from 'google-auth-library';
import { verifyIdToken } from '../lib/firebaseAdmin.js';
import { applyGooglePlaySubscription } from '../lib/subscriptionWriter.js';

/**
 * Valida uma compra do Google Play Billing direto na Google Play Developer
 * API antes de conceder Premium (ROADMAP_MONETIZACAO.txt, Fase 9: "Validar
 * compra no backend" — nunca confiar só no que o SDK do cliente reporta,
 * que pode ser adulterado num APK modificado).
 *
 * Chamada pelo app depois que o Google Play Billing (client-side, ainda não
 * integrado — ver o item "PENDENTE" na Fase 9 do roadmap) devolve um
 * purchaseToken.
 *
 * Env vars necessárias:
 *   GOOGLE_PLAY_SERVICE_ACCOUNT — JSON de uma service account do Google
 *     Cloud com acesso concedido no Play Console (Configurações > Acesso à
 *     API). Pode ser uma conta dedicada ou a mesma do Firebase, desde que
 *     also esteja vinculada no Play Console.
 *   ANDROID_PACKAGE_NAME — ex: com.contafechada.app (mesmo appId do
 *     capacitor.config.json).
 *
 * NÃO TESTADO — exige uma compra real de teste na Play Console (faixa
 * interna) pra confirmar o formato da resposta. Falta também implementar o
 * *acknowledgement* da compra (ver nota em subscriptionWriter.js).
 */
export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let user;
  try {
    user = await verifyIdToken(req.headers.get('authorization'));
  } catch (err) {
    console.error('validate-android-purchase: token inválido', err);
    return json({ error: 'unauthorized' }, 401);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid body' }, 400);
  }

  const { purchaseToken, productId } = body;
  if (!purchaseToken || !productId) return json({ error: 'purchaseToken e productId são obrigatórios' }, 400);

  const packageName = process.env.ANDROID_PACKAGE_NAME;
  const serviceAccountRaw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT;
  if (!packageName || !serviceAccountRaw) {
    return json({ error: 'GOOGLE_PLAY_SERVICE_ACCOUNT/ANDROID_PACKAGE_NAME não configuradas no servidor' }, 500);
  }

  try {
    const auth = new GoogleAuth({
      credentials: JSON.parse(serviceAccountRaw),
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
    const client = await auth.getClient();
    const { token: accessToken } = await client.getAccessToken();

    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
    const res = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });

    if (!res.ok) {
      console.error('validate-android-purchase: Play Developer API respondeu', res.status, await res.text());
      return json({ error: 'não foi possível validar a compra com o Google Play' }, 502);
    }

    const subscriptionPurchase = await res.json();
    const patch = await applyGooglePlaySubscription(user.uid, { ...subscriptionPurchase, purchaseToken });
    return json({ ok: true, subscription: patch });
  } catch (err) {
    console.error('validate-android-purchase: falha ao validar', err);
    return json({ error: 'falha ao validar compra' }, 502);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}
