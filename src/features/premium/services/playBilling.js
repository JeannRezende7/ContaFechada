export class PlayBillingUnavailableError extends Error {
  constructor() {
    super('Google Play Billing nao esta disponivel neste aparelho.');
    this.name = 'PlayBillingUnavailableError';
  }
}

export function assertPlayBillingAdapter(adapter) {
  for (const method of ['isAvailable', 'purchase', 'restorePurchases']) {
    if (typeof adapter?.[method] !== 'function') throw new TypeError(`Play Billing adapter sem ${method}()`);
  }
  return adapter;
}

export function createPlayBillingService({ adapter, getIdToken, fetchImpl = fetch }) {
  assertPlayBillingAdapter(adapter);

  async function validatePurchase(purchase) {
    if (!purchase?.purchaseToken || !purchase?.productId) throw new TypeError('Compra sem purchaseToken ou productId.');
    if (purchase.purchaseState === 'pending') return { pending: true };
    if (purchase.purchaseState && purchase.purchaseState !== 'purchased') throw new Error('A compra nao foi concluida.');

    const token = await getIdToken();
    const response = await fetchImpl('/api/validate-android-purchase', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ purchaseToken: purchase.purchaseToken, productId: purchase.productId }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 202 || data.pending) return { pending: true };
    if (!response.ok) throw new Error(data.error || 'Nao foi possivel validar a compra.');
    return data;
  }

  async function purchase(productId, { obfuscatedAccountId } = {}) {
    if (!(await adapter.isAvailable())) throw new PlayBillingUnavailableError();
    const purchaseResult = await adapter.purchase({ productId, obfuscatedAccountId });
    const validation = await validatePurchase(purchaseResult);
    return { purchase: purchaseResult, validation, pending: Boolean(validation.pending) };
  }

  async function restore() {
    if (!(await adapter.isAvailable())) throw new PlayBillingUnavailableError();
    const purchases = await adapter.restorePurchases();
    const results = [];
    for (const item of purchases) {
      try {
        const validation = await validatePurchase(item);
        results.push({ purchase: item, validation, pending: Boolean(validation.pending), ok: true });
      } catch (error) {
        results.push({ purchase: item, error: error.message, ok: false });
      }
    }
    return results;
  }

  return { purchase, restore, validatePurchase };
}

export function createFakePlayBillingAdapter({ available = true, purchases = [] } = {}) {
  const stored = [...purchases];
  return {
    async isAvailable() { return available; },
    async purchase({ productId }) {
      const item = { productId, purchaseToken: `fake-${productId}-${stored.length + 1}`, purchaseState: 'purchased' };
      stored.push(item);
      return item;
    },
    async restorePurchases() { return [...stored]; },
  };
}
