import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from './firebaseAdmin.js';

/**
 * MercadoPago `preapproval.status` -> our internal subscriptionStatus
 * (ROADMAP_MONETIZACAO.txt, Fase 2/8). `pending` means the user started
 * checkout but hasn't authorized the recurring charge yet — treated as
 * "sem assinatura" until it flips to `authorized`.
 */
const STATUS_MAP = {
  authorized: 'active',
  paused: 'past_due',
  cancelled: 'canceled',
  pending: 'none',
};

/**
 * Single write path from "a MercadoPago preapproval object" to our Firestore
 * subscription doc — used by the webhook (Fase 8) and by cancel-subscription,
 * and reusable later by an admin "reprocessar assinatura" tool (Fase 11) so
 * there's exactly one place that knows how to translate MercadoPago's shape
 * into ours. Runs with the Admin SDK, so it bypasses firestore.rules — this
 * is the ONE path (besides scripts/grant-premium.mjs) allowed to write
 * plan/status, matching "nunca liberar Premium apenas pelo retorno do
 * navegador": the client never calls this, only server code does, and only
 * after confirming the state directly with MercadoPago's API.
 *
 * ATENÇÃO: os nomes de campo do objeto `preapproval` (em especial
 * `next_payment_date`) foram escritos a partir da documentação pública da
 * API de Preapproval da MercadoPago, mas nunca foram testados contra uma
 * conta real — confirme no sandbox antes de ativar em produção.
 */
export async function applyMercadoPagoPreapproval(uid, preapproval, { actor = 'mercadopago_webhook' } = {}) {
  const subscriptionStatus = STATUS_MAP[preapproval.status] ?? 'none';
  const plan = subscriptionStatus === 'none' ? 'free' : 'premium';

  const patch = {
    plan,
    subscriptionStatus,
    subscriptionProvider: 'web',
    subscriptionId: preapproval.id,
    currentPeriodEnd: preapproval.next_payment_date ? Timestamp.fromDate(new Date(preapproval.next_payment_date)) : null,
    cancelAtPeriodEnd: preapproval.status === 'cancelled',
    updatedAt: FieldValue.serverTimestamp(),
  };

  const db = getAdminDb();
  await db.doc(`users/${uid}/private/subscription`).set(patch, { merge: true });
  await logSubscriptionChange(uid, {
    actor,
    source: 'mercadopago',
    preapprovalId: preapproval.id,
    mercadoPagoStatus: preapproval.status,
    patch: { ...patch, updatedAt: undefined },
  });

  return patch;
}

/**
 * Google Play `subscriptionState` (Subscriptions v2 API) -> nosso
 * subscriptionStatus interno (Fase 9). IN_GRACE_PERIOD e ON_HOLD viram
 * `past_due` — ainda "com acesso, mas com problema de cobrança" — e é
 * `toSubscriptionState`/currentPeriodEnd quem decide se o acesso continua
 * de fato, olhando pra expiryTime.
 */
const GOOGLE_PLAY_STATE_MAP = {
  SUBSCRIPTION_STATE_ACTIVE: 'active',
  SUBSCRIPTION_STATE_IN_GRACE_PERIOD: 'past_due',
  SUBSCRIPTION_STATE_ON_HOLD: 'past_due',
  SUBSCRIPTION_STATE_CANCELED: 'canceled',
  SUBSCRIPTION_STATE_PAUSED: 'canceled',
  SUBSCRIPTION_STATE_EXPIRED: 'expired',
  SUBSCRIPTION_STATE_PENDING: 'none',
};

/**
 * Mesmo papel de `applyMercadoPagoPreapproval`, para uma
 * `subscriptionPurchaseV2` já validada contra a Google Play Developer API
 * (ver netlify/functions/validate-android-purchase.js, Fase 9).
 *
 * NÃO TESTADO contra a API real do Google Play — os nomes de campo
 * (`subscriptionState`, `lineItems[0].expiryTime`) seguem a documentação
 * pública da Subscriptions v2 API, mas precisam ser confirmados com uma
 * compra de teste real antes de ir pra produção. Falta também implementar
 * o *acknowledgement* da compra (obrigatório em até 3 dias pela Play
 * Billing Library, via `purchases.subscriptions.acknowledge` da v1 API) —
 * sem isso o Google reembolsa a compra automaticamente.
 */
export async function applyGooglePlaySubscription(uid, subscriptionPurchase, { actor = 'google_play_validation' } = {}) {
  const subscriptionStatus = GOOGLE_PLAY_STATE_MAP[subscriptionPurchase.subscriptionState] ?? 'none';
  const plan = subscriptionStatus === 'none' ? 'free' : 'premium';
  const expiryTime = subscriptionPurchase.lineItems?.[0]?.expiryTime;

  const patch = {
    plan,
    subscriptionStatus,
    subscriptionProvider: 'google_play',
    subscriptionId: subscriptionPurchase.purchaseToken ?? null,
    currentPeriodEnd: expiryTime ? Timestamp.fromDate(new Date(expiryTime)) : null,
    cancelAtPeriodEnd: subscriptionStatus === 'canceled',
    updatedAt: FieldValue.serverTimestamp(),
  };

  const db = getAdminDb();
  await db.doc(`users/${uid}/private/subscription`).set(patch, { merge: true });
  await logSubscriptionChange(uid, {
    actor,
    source: 'google_play',
    googlePlayState: subscriptionPurchase.subscriptionState,
    patch: { ...patch, updatedAt: undefined },
  });

  return patch;
}

/** Audit trail (Fase 11: "Manter log das alteracoes de assinatura"). Never fails the caller — logging is best-effort. */
export async function logSubscriptionChange(uid, entry) {
  try {
    const db = getAdminDb();
    // Subcoleção do próprio doc de assinatura: users/{uid}/private/subscription/subscription_log/{id}
    // (5 segmentos — precisa ser ímpar pra ser uma coleção válida).
    await db
      .collection(`users/${uid}/private/subscription/subscription_log`)
      .add({ ...entry, at: FieldValue.serverTimestamp() });
  } catch (err) {
    console.error('Falha ao gravar subscription_log (não bloqueante):', err);
  }
}
