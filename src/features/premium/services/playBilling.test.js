import { describe, expect, it, vi } from 'vitest';
import {
  createFakePlayBillingAdapter,
  createPlayBillingService,
  PlayBillingUnavailableError,
} from './playBilling.js';

function response(ok, data) {
  return { ok, json: () => Promise.resolve(data) };
}

describe('Play Billing abstraction', () => {
  it('purchases through the adapter and validates only on the server', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(true, { subscription: { status: 'active' } }));
    const service = createPlayBillingService({
      adapter: createFakePlayBillingAdapter(),
      getIdToken: vi.fn().mockResolvedValue('firebase-token'),
      fetchImpl,
    });
    const result = await service.purchase('premium_anual', { obfuscatedAccountId: 'account-hash' });
    expect(result.subscription.status).toBe('active');
    expect(fetchImpl).toHaveBeenCalledWith('/api/validate-android-purchase', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ authorization: 'Bearer firebase-token' }),
    }));
  });

  it('restores every purchase independently and reports partial failures', async () => {
    const adapter = createFakePlayBillingAdapter({
      purchases: [
        { productId: 'mensal', purchaseToken: 'ok' },
        { productId: 'anual', purchaseToken: 'bad' },
      ],
    });
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(true, { subscription: { status: 'active' } }))
      .mockResolvedValueOnce(response(false, { error: 'token inválido' }));
    const result = await createPlayBillingService({ adapter, getIdToken: async () => 't', fetchImpl }).restore();
    expect(result.map((item) => item.ok)).toEqual([true, false]);
  });

  it('fails explicitly when Billing is unavailable', async () => {
    const service = createPlayBillingService({
      adapter: createFakePlayBillingAdapter({ available: false }),
      getIdToken: async () => 't',
    });
    await expect(service.purchase('anual')).rejects.toBeInstanceOf(PlayBillingUnavailableError);
  });
});
