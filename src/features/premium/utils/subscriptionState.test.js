import { describe, expect, it } from 'vitest';
import { toSubscriptionState } from './subscriptionState.js';

describe('toSubscriptionState', () => {
  it('returns free for a missing or legacy recurring document', () => {
    expect(toSubscriptionState(null)).toMatchObject({ plan: 'free', status: 'free', hasProAccess: false });
    expect(toSubscriptionState({ plan: 'premium', subscriptionStatus: 'active' }))
      .toMatchObject({ plan: 'free', status: 'free', hasProAccess: false, hasCloudAccess: false });
  });

  it('grants lifetime Pro from the server entitlement', () => {
    expect(toSubscriptionState({ plan: 'pro', proLifetime: true, subscriptionProvider: 'google_play' }))
      .toEqual({
        plan: 'pro',
        status: 'pro',
        isPremium: true,
        hasProAccess: true,
        hasCloudAccess: false,
        provider: 'google_play',
      });
  });

  it('accepts proLifetime even while an old recurring status is expired', () => {
    expect(toSubscriptionState({ proLifetime: true, subscriptionStatus: 'expired' }).hasProAccess).toBe(true);
  });
});
