import { MercadoPagoConfig, Payment, PreApproval, WebhookSignatureValidator } from 'mercadopago';
import { applyMercadoPagoPreapproval, logSubscriptionChange } from '../lib/subscriptionWriter.js';

/**
 * MercadoPago `payment.status` -> algo legível pro log de auditoria. Não
 * altera plan/subscriptionStatus — o preapproval (`subscription_preapproval`,
 * tratado abaixo) continua sendo a única fonte do estado agregado; isto aqui
 * só registra a cobrança individual pra dar visibilidade mais rápida de uma
 * falha específica (Fase 10/11).
 */
const PAYMENT_STATUS_LABEL = {
  approved: 'payment_approved',
  rejected: 'payment_rejected',
  refunded: 'payment_refunded',
  cancelled: 'payment_cancelled',
  in_process: 'payment_in_process',
  pending: 'payment_pending',
  charged_back: 'payment_charged_back',
};

/**
 * Recebe as notificações do MercadoPago (ROADMAP_MONETIZACAO.txt, Fase 8).
 * Nunca confia no corpo da notificação por si só — valida a assinatura e
 * depois busca o preapproval de volta na API do MercadoPago pelo id, e é
 * esse objeto (a fonte de verdade do provedor) que vira o novo estado da
 * assinatura no Firestore. Isso também torna o processamento naturalmente
 * idempotente: reentregar a mesma notificação (o MercadoPago faz isso em
 * caso de timeout) só reaplica o mesmo estado, sem duplicar nada.
 *
 * Configure a URL deste endpoint em Suas integrações > Webhooks no painel do
 * MercadoPago, e copie o "Assinatura secreta" pra env var abaixo.
 *
 * Env vars necessárias:
 *   MERCADOPAGO_ACCESS_TOKEN
 *   MERCADOPAGO_WEBHOOK_SECRET — assinatura secreta do webhook.
 *   FIREBASE_SERVICE_ACCOUNT
 *
 * NÃO TESTADO contra notificações reais do MercadoPago. `payment.metadata`,
 * `payment.external_reference` e o mapeamento de status abaixo seguem a
 * documentação pública (uma cobrança gerada por um preapproval herda o
 * `external_reference` do preapproval que a originou), mas precisam ser
 * confirmados contra o payload real assim que houver uma conta de sandbox.
 */
export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const url = new URL(req.url);
  const dataIdFromQuery = url.searchParams.get('data.id') ?? url.searchParams.get('id');

  if (!process.env.MERCADOPAGO_WEBHOOK_SECRET) {
    console.error('mercadopago-webhook: MERCADOPAGO_WEBHOOK_SECRET não configurada');
    return new Response('server misconfigured', { status: 500 });
  }

  try {
    WebhookSignatureValidator.validate({
      xSignature: req.headers.get('x-signature'),
      xRequestId: req.headers.get('x-request-id'),
      dataId: dataIdFromQuery,
      secret: process.env.MERCADOPAGO_WEBHOOK_SECRET,
      toleranceSeconds: 300,
    });
  } catch (err) {
    console.error('mercadopago-webhook: assinatura inválida', err);
    return new Response('invalid signature', { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const type = body.type ?? url.searchParams.get('type');

  if (type !== 'subscription_preapproval' && type !== 'payment') {
    // Evento que ainda não tratamos — responde 200 pra o MercadoPago não
    // ficar reentregando, mas não faz nada com ele.
    return new Response('ok (evento ignorado)', { status: 200 });
  }

  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    console.error('mercadopago-webhook: MERCADOPAGO_ACCESS_TOKEN não configurada');
    return new Response('server misconfigured', { status: 500 });
  }

  const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });

  if (type === 'payment') return handlePaymentEvent(client, body, dataIdFromQuery);

  const preapprovalId = body.data?.id ?? dataIdFromQuery;
  if (!preapprovalId) return new Response('ok (sem id)', { status: 200 });

  try {
    const preapproval = await new PreApproval(client).get({ id: preapprovalId });

    const uid = preapproval.external_reference;
    if (!uid) {
      console.error('mercadopago-webhook: preapproval sem external_reference (uid)', preapprovalId);
      return new Response('ok (sem uid)', { status: 200 });
    }

    await applyMercadoPagoPreapproval(uid, preapproval);
    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('mercadopago-webhook: falha ao processar', err);
    // 500 faz o MercadoPago tentar reentregar depois — correto aqui, porque
    // o problema é nosso (rede/Firestore), não um evento inválido.
    return new Response('internal error', { status: 500 });
  }
};

/**
 * Cobrança individual gerada por uma assinatura recorrente. Não decide
 * plan/subscriptionStatus (isso continua sendo só o preapproval, tratado
 * acima) — só registra a cobrança no log de auditoria pra dar visibilidade
 * imediata de uma falha específica, sem esperar o próximo evento de
 * preapproval (que pode demorar a refletir uma única tentativa rejeitada).
 */
async function handlePaymentEvent(client, body, dataIdFromQuery) {
  const paymentId = body.data?.id ?? dataIdFromQuery;
  if (!paymentId) return new Response('ok (sem id)', { status: 200 });

  try {
    const payment = await new Payment(client).get({ id: paymentId });
    const uid = payment.external_reference ?? payment.metadata?.preapproval_uid;
    if (!uid) {
      console.error('mercadopago-webhook: payment sem external_reference (uid)', paymentId);
      return new Response('ok (sem uid)', { status: 200 });
    }

    await logSubscriptionChange(uid, {
      actor: 'mercadopago_webhook',
      source: 'mercadopago_payment',
      event: PAYMENT_STATUS_LABEL[payment.status] ?? `payment_${payment.status}`,
      paymentId: payment.id,
      preapprovalId: payment.metadata?.preapproval_id ?? null,
      status: payment.status,
      statusDetail: payment.status_detail ?? null,
      amount: payment.transaction_amount ?? null,
    });

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('mercadopago-webhook: falha ao processar payment', err);
    return new Response('internal error', { status: 500 });
  }
}
