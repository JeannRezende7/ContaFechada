import { MercadoPagoConfig, PreApproval, WebhookSignatureValidator } from 'mercadopago';
import { applyMercadoPagoPreapproval } from '../lib/subscriptionWriter.js';

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
 * NÃO TESTADO contra notificações reais do MercadoPago. Em especial, o
 * tratamento de eventos `type: "payment"` (cada cobrança recorrente
 * individual) ficou deliberadamente de fora — só `subscription_preapproval`
 * está coberto, que já reflete o estado agregado da assinatura. Cobrir
 * `payment` também (pra reagir mais rápido a uma falha de cobrança
 * específica, por exemplo) fica anotado pra quando houver uma conta de
 * sandbox real pra confirmar o formato exato do payload.
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

  if (type !== 'subscription_preapproval') {
    // Evento que ainda não tratamos (ex: "payment") — responde 200 pra o
    // MercadoPago não ficar reentregando, mas não faz nada com ele.
    return new Response('ok (evento ignorado)', { status: 200 });
  }

  const preapprovalId = body.data?.id ?? dataIdFromQuery;
  if (!preapprovalId) return new Response('ok (sem id)', { status: 200 });

  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    console.error('mercadopago-webhook: MERCADOPAGO_ACCESS_TOKEN não configurada');
    return new Response('server misconfigured', { status: 500 });
  }

  try {
    const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
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
