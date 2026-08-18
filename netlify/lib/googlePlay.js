const BASE_URL = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';

export class GooglePlayApiError extends Error {
  constructor(status, body) {
    super(`Google Play Developer API respondeu ${status}.`);
    this.name = 'GooglePlayApiError';
    this.status = status;
    this.body = body;
  }
}

export async function getOneTimeProductPurchase({ packageName, productId, purchaseToken, accessToken, fetchImpl = fetch }) {
  const url = `${BASE_URL}/${packageName}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;
  const res = await fetchImpl(url, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new GooglePlayApiError(res.status, await res.text());
  return res.json();
}

export async function acknowledgeOneTimeProductPurchase({ packageName, productId, purchaseToken, accessToken, fetchImpl = fetch }) {
  const url = `${BASE_URL}/${packageName}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new GooglePlayApiError(res.status, await res.text());
}
