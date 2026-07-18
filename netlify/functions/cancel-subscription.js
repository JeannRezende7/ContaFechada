import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { verifyIdToken, getAdminDb } from '../lib/firebaseAdmin.js';
import { applyMercadoPagoPreapproval } from '../lib/subscriptionWriter.js';

/**
 * Cancela a assinatura Web do usuário autenticado no MercadoPago e
 * resincroniza o Firestore com o resultado real (ROADMAP_MONETIZACAO.txt,
 * Fase 8/11 — "Cancelamento preserva acesso ate o fim do periodo pago"). O
 * acesso Premium continua até `currentPeriodEnd`: quem decide isso é
 * `applyMercadoPagoPreapproval`/`toSubscriptionState`, que tratam
 * "cancelled com currentPeriodEnd no futuro" como ainda ativo.
 *
 * NÃO TESTADO contra a API real do MercadoPago.
 */
export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let user;
  try {
    user = await verifyIdToken(req.headers.get('authorization'));
  } catch (err) {
    console.error('cancel-subscription: token inválido', err);
    return json({ error: 'unauthorized' }, 401);
  }

  const db = getAdminDb();
  const subSnap = await db.doc(`users/${user.uid}/private/subscription`).get();
  const sub = subSnap.data();

  if (!sub?.subscriptionId || sub.subscriptionProvider !== 'web') {
    return json({ error: 'nenhuma assinatura Web ativa para cancelar nesta conta' }, 400);
  }

  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    return json({ error: 'MERCADOPAGO_ACCESS_TOKEN não configurada no servidor' }, 500);
  }

  try {
    const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
    const preapproval = await new PreApproval(client).update({
      id: sub.subscriptionId,
      body: { status: 'cancelled' },
    });

    const patch = await applyMercadoPagoPreapproval(user.uid, preapproval, { actor: `user:${user.uid}` });
    return json({ ok: true, subscription: patch });
  } catch (err) {
    console.error('cancel-subscription: falha ao cancelar no MercadoPago', err);
    return json({ error: 'falha ao cancelar assinatura' }, 502);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}
