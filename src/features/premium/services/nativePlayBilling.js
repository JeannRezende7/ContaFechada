import { Capacitor, registerPlugin } from '@capacitor/core';

const PlayBilling = registerPlugin('PlayBilling');

export function createNativePlayBillingAdapter() {
  return {
    async isAvailable() {
      if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return false;
      const result = await PlayBilling.isAvailable();
      return Boolean(result.available);
    },
    async purchase({ productId, obfuscatedAccountId }) {
      return PlayBilling.purchase({ productId, obfuscatedAccountId });
    },
    async restorePurchases() {
      const result = await PlayBilling.restorePurchases();
      return result.purchases ?? [];
    },
  };
}
