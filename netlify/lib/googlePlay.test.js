import { describe, expect, it, vi } from 'vitest';
import { acknowledgeOneTimeProductPurchase, getOneTimeProductPurchase, GooglePlayApiError } from './googlePlay.js';

describe('Google Play one-time products', () => {
  it('fetches a non-consumable product purchase', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ purchaseState: 0 }) });
    await expect(getOneTimeProductPurchase({
      packageName: 'com.contafechada.app', productId: 'pro', purchaseToken: 'token 1', accessToken: 'access', fetchImpl,
    })).resolves.toEqual({ purchaseState: 0 });
    expect(fetchImpl.mock.calls[0][0]).toContain('/purchases/products/pro/tokens/token%201');
  });

  it('acknowledges without consuming the product', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    await acknowledgeOneTimeProductPurchase({
      packageName: 'app', productId: 'pro', purchaseToken: 'token', accessToken: 'access', fetchImpl,
    });
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining(':acknowledge'), expect.objectContaining({ method: 'POST' }));
  });

  it('does not include the provider response in the public error message', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 401, text: () => Promise.resolve('secret token') });
    const error = await getOneTimeProductPurchase({ packageName: 'app', productId: 'pro', purchaseToken: 'x', accessToken: 'x', fetchImpl }).catch((cause) => cause);
    expect(error).toBeInstanceOf(GooglePlayApiError);
    expect(error.message).not.toContain('secret token');
  });
});
