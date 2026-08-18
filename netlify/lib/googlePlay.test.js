import { describe, expect, it, vi } from 'vitest';
import {
  GooglePlayApiError,
  acknowledgeOneTimeProductPurchase,
  acknowledgeSubscriptionPurchase,
  getOneTimeProductPurchase,
  getSubscriptionPurchaseV2,
} from './googlePlay.js';

describe('one-time product purchase', () => {
  it('queries an INAPP purchase by product and token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ purchaseState: 0 }) });
    await expect(getOneTimeProductPurchase({
      packageName: 'com.app', productId: 'pro_lifetime', purchaseToken: 'tok 1', accessToken: 'access', fetchImpl,
    })).resolves.toEqual({ purchaseState: 0 });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.app/purchases/products/pro_lifetime/tokens/tok%201',
      { headers: { authorization: 'Bearer access' } },
    );
  });

  it('acknowledges without consuming the lifetime product', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    await acknowledgeOneTimeProductPurchase({
      packageName: 'com.app', productId: 'pro_lifetime', purchaseToken: 'tok', accessToken: 'access', fetchImpl,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.app/purchases/products/pro_lifetime/tokens/tok:acknowledge',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('getSubscriptionPurchaseV2', () => {
  it('GETs the subscriptionsv2 endpoint with a bearer token and returns the parsed body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE' }) });

    const result = await getSubscriptionPurchaseV2({
      packageName: 'com.contafechada.app',
      purchaseToken: 'tok 123',
      accessToken: 'access-token',
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.contafechada.app/purchases/subscriptionsv2/tokens/tok%20123',
      { headers: { authorization: 'Bearer access-token' } }
    );
    expect(result).toEqual({ subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE' });
  });

  it('throws GooglePlayApiError when the response is not ok', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404, text: () => Promise.resolve('not found') });

    await expect(
      getSubscriptionPurchaseV2({ packageName: 'app', purchaseToken: 't', accessToken: 'a', fetchImpl })
    ).rejects.toThrow(GooglePlayApiError);
  });
});

describe('acknowledgeSubscriptionPurchase', () => {
  it('POSTs to the acknowledge endpoint for the given subscriptionId and token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });

    await acknowledgeSubscriptionPurchase({
      packageName: 'com.contafechada.app',
      subscriptionId: 'premium_anual',
      purchaseToken: 'tok123',
      accessToken: 'access-token',
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.contafechada.app/purchases/subscriptions/premium_anual/tokens/tok123:acknowledge',
      { method: 'POST', headers: { authorization: 'Bearer access-token', 'content-type': 'application/json' }, body: '{}' }
    );
  });

  it('throws GooglePlayApiError when acknowledgement fails', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 400, text: () => Promise.resolve('already acknowledged') });

    await expect(
      acknowledgeSubscriptionPurchase({ packageName: 'app', subscriptionId: 's', purchaseToken: 't', accessToken: 'a', fetchImpl })
    ).rejects.toThrow(GooglePlayApiError);
  });
});
