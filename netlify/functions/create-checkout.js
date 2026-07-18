import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { verifyIdToken } from '../lib/firebaseAdmin.js';
import { PRICING } from '../../src/config/premium.js';

/**
 * Cria uma assinatura recorrente (Preapproval) no MercadoPago e devolve a URL
 * de checkout pra onde o app redireciona o usuário (ROADMAP_MONETIZACAO.txt,
 * Fase 8). O Firestore só é atualizado depois, pelo webhook — esta função
 * nunca escreve em users/{uid}/private/subscription, exatamente pra não
 * liberar Premium "pelo retorno do navegador".
 *
 * Env vars necessárias (Netlify > Site configuration > Environment variables):
 *   MERCADOPAGO_ACCESS_TOKEN — Suas integrações > Credenciais de produção/teste.
 *   FIREBASE_SERVICE_ACCOUNT — ver netlify/lib/firebaseAdmin.js.
 *   APP_BASE_URL — ex: https://contafechada.netlify.app (usado no back_url).
 *
 * NÃO TESTADO contra a API real do MercadoPago — precisa de uma conta e
 * sandbox reais para validar o formato exato aceito por `PreApproval.create`.
 */
const PLAN_CONFIG = {
  mensal: { frequency: 1, frequency_type: 'months', amount: PRICING.mensal, label: 'Mensal' },
  anual: { frequency: 12, frequency_type: 'months', amount: PRICING.anual, label: 'Anual' },
};

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let user;
  try {
    user = await verifyIdToken(req.headers.get('authorization'));
  } catch (err) {
    console.error('create-checkout: token inválido', err);
    return json({ error: 'unauthorized' }, 401);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid body' }, 400);
  }

  const planConfig = PLAN_CONFIG[body.plan];
  if (!planConfig) return json({ error: 'invalid plan — use "mensal" ou "anual"' }, 400);

  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    return json({ error: 'MERCADOPAGO_ACCESS_TOKEN não configurada no servidor' }, 500);
  }

  const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
  const appBaseUrl = process.env.APP_BASE_URL || 'https://contafechada.netlify.app';

  try {
    const result = await new PreApproval(client).create({
      body: {
        reason: `Conta Fechada Premium — ${planConfig.label}`,
        external_reference: user.uid,
        payer_email: user.email,
        auto_recurring: {
          frequency: planConfig.frequency,
          frequency_type: planConfig.frequency_type,
          transaction_amount: planConfig.amount,
          currency_id: 'BRL',
        },
        back_url: `${appBaseUrl}/opcoes/meu-plano?checkout=retorno`,
        status: 'pending',
      },
    });

    return json({ checkoutUrl: result.init_point ?? result.sandbox_init_point });
  } catch (err) {
    console.error('create-checkout: falha ao criar preapproval no MercadoPago', err);
    return json({ error: 'falha ao criar checkout' }, 502);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}
