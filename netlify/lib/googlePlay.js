/**
 * Chamadas à Google Play Developer API usadas por
 * `functions/validate-android-purchase.js` (ROADMAP_MONETIZACAO.txt, Fase
 * 9). Extraídas pra cá pra poder testar cada chamada isoladamente
 * (mockando `fetch`) sem precisar simular a function serverless inteira.
 *
 * NÃO TESTADO contra a API real do Google Play — sem Android Studio, conta
 * Google Play Console nem uma compra de teste real neste ambiente (mesma
 * limitação já registrada em ROADMAP_MONETIZACAO.txt), só dá pra confirmar
 * a forma da requisição/resposta contra a documentação pública, não o
 * comportamento real do servidor do Google.
 */

const BASE_URL = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';

export class GooglePlayApiError extends Error {
  constructor(status, body) {
    super(`Google Play Developer API respondeu ${status}: ${body}`);
    this.name = 'GooglePlayApiError';
    this.status = status;
    this.body = body;
  }
}

/** GET .../purchases/subscriptionsv2/tokens/{token} — o estado atual da assinatura. */
export async function getSubscriptionPurchaseV2({ packageName, purchaseToken, accessToken, fetchImpl = fetch }) {
  const url = `${BASE_URL}/${packageName}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
  const res = await fetchImpl(url, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    throw new GooglePlayApiError(res.status, await res.text());
  }
  return res.json();
}

/**
 * Confirma o recebimento da compra junto ao Google — obrigatório em até 3
 * dias pela Play Billing Library; sem isso o Google reembolsa a compra
 * automaticamente. `subscriptionId` é o id do produto/plano (o `productId`
 * que o cliente já envia pro validate-android-purchase, mas que até agora
 * não era usado pra nada).
 *
 * Se a compra já tiver sido reconhecida antes (ex.: um retry depois de uma
 * falha de rede no passo anterior), o comportamento exato do Google não
 * está confirmado aqui — pela documentação pública, chamar de novo deveria
 * ser inofensivo, mas isso só é validado contra uma conta/sandbox real.
 */
export async function acknowledgeSubscriptionPurchase({ packageName, subscriptionId, purchaseToken, accessToken, fetchImpl = fetch }) {
  const url = `${BASE_URL}/${packageName}/purchases/subscriptions/${encodeURIComponent(subscriptionId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new GooglePlayApiError(res.status, await res.text());
  }
}
