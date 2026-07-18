import { auth } from '../../../firebase/config.js';

/** Calls one of the Netlify Functions in netlify/functions/, authenticated with the current Firebase ID token. */
async function callApi(path, body) {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado.');
  const token = await user.getIdToken();

  const res = await fetch(`/api/${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Falha em /api/${path} (HTTP ${res.status})`);
  return data;
}

/**
 * Starts a MercadoPago checkout for the given plan ('mensal' | 'anual') and
 * returns the URL to redirect the user to. Backed by
 * netlify/functions/create-checkout.js (ROADMAP_MONETIZACAO.txt, Fase 8) —
 * requires MERCADOPAGO_ACCESS_TOKEN configured on Netlify, so this will
 * fail until that's set up.
 */
export function createCheckout(plan) {
  return callApi('create-checkout', { plan });
}

/** Cancels the user's Web subscription. Backed by netlify/functions/cancel-subscription.js. */
export function cancelWebSubscription() {
  return callApi('cancel-subscription', {});
}
