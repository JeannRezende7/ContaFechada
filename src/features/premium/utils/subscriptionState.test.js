import { describe, it, expect } from 'vitest';
import { toSubscriptionState } from './subscriptionState.js';

const NOW = new Date('2026-07-18T12:00:00Z').getTime();
const DAY = 86_400_000;

function ts(ms) {
  return { toMillis: () => ms };
}

describe('toSubscriptionState — no doc / fresh account', () => {
  it('treats a missing doc as a plain free account, never premium', () => {
    expect(toSubscriptionState(null, NOW)).toEqual({
      plan: 'free',
      status: 'none',
      isPremium: false,
      isTrialing: false,
      trialDaysLeft: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      provider: null,
      founder: false,
    });
  });
});

describe('toSubscriptionState — active subscription', () => {
  it('is premium while currentPeriodEnd is in the future', () => {
    const state = toSubscriptionState(
      { plan: 'premium', subscriptionStatus: 'active', currentPeriodEnd: ts(NOW + 10 * DAY) },
      NOW
    );
    expect(state.isPremium).toBe(true);
    expect(state.status).toBe('active');
  });

  it('is downgraded to expired once currentPeriodEnd has passed, even if the stored status is still "active"', () => {
    const state = toSubscriptionState(
      { plan: 'premium', subscriptionStatus: 'active', currentPeriodEnd: ts(NOW - DAY) },
      NOW
    );
    expect(state.isPremium).toBe(false);
    expect(state.status).toBe('expired');
  });
});

describe('toSubscriptionState — trial', () => {
  it('is premium and reports days left while inside the trial window', () => {
    const state = toSubscriptionState(
      { plan: 'premium', subscriptionStatus: 'trialing', trialEndsAt: ts(NOW + 3 * DAY) },
      NOW
    );
    expect(state.isPremium).toBe(true);
    expect(state.isTrialing).toBe(true);
    expect(state.trialDaysLeft).toBe(3);
  });

  it('falls back to free once the trial window has passed', () => {
    const state = toSubscriptionState(
      { plan: 'premium', subscriptionStatus: 'trialing', trialEndsAt: ts(NOW - DAY) },
      NOW
    );
    expect(state.isPremium).toBe(false);
    expect(state.status).toBe('expired');
  });
});

describe('toSubscriptionState — cancellation preserves access until period end', () => {
  it('a canceled subscription still inside the paid period behaves as active', () => {
    const state = toSubscriptionState(
      { plan: 'premium', subscriptionStatus: 'canceled', currentPeriodEnd: ts(NOW + 5 * DAY), cancelAtPeriodEnd: true },
      NOW
    );
    expect(state.isPremium).toBe(true);
    expect(state.status).toBe('active');
    expect(state.cancelAtPeriodEnd).toBe(true);
  });

  it('loses access once the paid period actually ends', () => {
    const state = toSubscriptionState(
      { plan: 'premium', subscriptionStatus: 'canceled', currentPeriodEnd: ts(NOW - DAY), cancelAtPeriodEnd: true },
      NOW
    );
    expect(state.isPremium).toBe(false);
    expect(state.status).toBe('expired');
  });
});

describe('toSubscriptionState — past_due (inadimplencia) grace period', () => {
  it('keeps access while past_due but still inside currentPeriodEnd (periodo de tolerancia)', () => {
    const state = toSubscriptionState(
      { plan: 'premium', subscriptionStatus: 'past_due', currentPeriodEnd: ts(NOW + 2 * DAY) },
      NOW
    );
    expect(state.isPremium).toBe(true);
    expect(state.status).toBe('past_due');
  });

  it('expires once the grace period date has passed', () => {
    const state = toSubscriptionState(
      { plan: 'premium', subscriptionStatus: 'past_due', currentPeriodEnd: ts(NOW - DAY) },
      NOW
    );
    expect(state.isPremium).toBe(false);
  });
});

describe('toSubscriptionState — plan/status transitions never crash on missing dates', () => {
  it('a brand-new free doc (all dated fields null) resolves cleanly', () => {
    const state = toSubscriptionState(
      {
        plan: 'free',
        subscriptionStatus: 'none',
        subscriptionProvider: 'manual',
        currentPeriodEnd: null,
        trialEndsAt: null,
        cancelAtPeriodEnd: false,
        founder: false,
      },
      NOW
    );
    expect(state.isPremium).toBe(false);
    expect(state.status).toBe('none');
    expect(state.provider).toBe('manual');
  });
});
