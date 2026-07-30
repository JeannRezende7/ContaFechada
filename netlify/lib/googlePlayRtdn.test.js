import { describe, expect, it, vi } from 'vitest';
import { GooglePlayRtdnError, parseGooglePlayRtdn, processGooglePlayRtdn } from './googlePlayRtdn.js';

function body(payload, messageId = 'm1') {
  return { message: { messageId, data: Buffer.from(JSON.stringify(payload)).toString('base64') } };
}

function fakeDb(paths) {
  const query = {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({
      docs: paths.map((path) => ({
        ref: { path },
        data: () => ({ subscriptionProvider: 'google_play' }),
      })),
    }),
  };
  return { collectionGroup: vi.fn(() => query) };
}

const payload = {
  packageName: 'com.contafechada.app',
  eventTimeMillis: '1785400000000',
  subscriptionNotification: { notificationType: 3, purchaseToken: 'token-1', subscriptionId: 'premium_anual' },
};

describe('Google Play RTDN', () => {
  it('decodifica a mensagem Pub/Sub', () => {
    expect(parseGooglePlayRtdn(body(payload))).toMatchObject({
      packageName: 'com.contafechada.app',
      purchaseToken: 'token-1',
      notificationType: 3,
      messageId: 'm1',
    });
  });

  it('reconsulta a Developer API e aplica o estado à única conta vinculada', async () => {
    const fetchPurchase = vi.fn().mockResolvedValue({ subscriptionState: 'SUBSCRIPTION_STATE_CANCELED' });
    const applySubscription = vi.fn().mockResolvedValue({ subscriptionStatus: 'canceled' });
    const result = await processGooglePlayRtdn({
      body: body(payload),
      expectedPackageName: payload.packageName,
      db: fakeDb(['users/u1/private/subscription']),
      getAccessToken: vi.fn().mockResolvedValue('access'),
      fetchPurchase,
      applySubscription,
    });
    expect(result.uid).toBe('u1');
    expect(fetchPurchase).toHaveBeenCalledWith(expect.objectContaining({ purchaseToken: 'token-1', accessToken: 'access' }));
    expect(applySubscription).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ purchaseToken: 'token-1', subscriptionState: 'SUBSCRIPTION_STATE_CANCELED' }),
      { actor: 'google_play_rtdn:3' }
    );
  });

  it('rejeita package diferente e token sem proprietário', async () => {
    const common = {
      body: body(payload),
      db: fakeDb([]),
      getAccessToken: vi.fn(),
      fetchPurchase: vi.fn(),
      applySubscription: vi.fn(),
    };
    await expect(processGooglePlayRtdn({ ...common, expectedPackageName: 'outro.app' })).rejects.toMatchObject({ status: 403 });
    await expect(processGooglePlayRtdn({ ...common, expectedPackageName: payload.packageName })).rejects.toMatchObject({ status: 404 });
  });

  it('rejeita payload inválido', () => {
    expect(() => parseGooglePlayRtdn({ message: { data: '***' } })).toThrow(GooglePlayRtdnError);
  });
});
