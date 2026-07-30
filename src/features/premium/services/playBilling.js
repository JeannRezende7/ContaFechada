export class PlayBillingUnavailableError extends Error {
  constructor() {
    super('Google Play Billing não está disponível neste aparelho.');
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
    if (!purchase?.purchaseToken || !purchase?.productId) {
      throw new TypeError('Compra sem purchaseToken ou productId.');
    }
    const token = await getIdToken();
    const response = await fetchImpl('/api/validate-android-purchase', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ purchaseToken: purchase.purchaseToken, productId: purchase.productId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Não foi possível validar a compra.');
    return data.subscription;
  }

  async function purchase(productId, { obfuscatedAccountId } = {}) {
    if (!(await adapter.isAvailable())) throw new PlayBillingUnavailableError();
    const purchaseResult = await adapter.purchase({ productId, obfuscatedAccountId });
    const subscription = await validatePurchase(purchaseResult);
    return { purchase: purchaseResult, subscription };
  }

  async function restore() {
    if (!(await adapter.isAvailable())) throw new PlayBillingUnavailableError();
    const purchases = await adapter.restorePurchases();
    const results = [];
    for (const item of purchases) {
      try {
        results.push({ purchase: item, subscription: await validatePurchase(item), ok: true });
      } catch (error) {
        results.push({ purchase: item, error: error.message, ok: false });
      }
    }
    return results;
  }

  return { purchase, restore, validatePurchase };
}

/** Adapter determinístico para testes e desenvolvimento sem Play Store. */
export function createFakePlayBillingAdapter({ available = true, purchases = [] } = {}) {
  const stored = [...purchases];
  return {
    async isAvailable() {
      return available;
    },
    async purchase({ productId }) {
      const item = { productId, purchaseToken: `fake-${productId}-${stored.length + 1}` };
      stored.push(item);
      return item;
    },
    async restorePurchases() {
      return [...stored];
    },
  };
}
