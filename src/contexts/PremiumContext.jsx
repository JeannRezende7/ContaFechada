import { createContext, useCallback, useContext, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { checkGate } from '../config/premium.js';

const PremiumContext = createContext(null);

const MESSAGES = {
  premium_required: 'Esse recurso é exclusivo do plano Premium.',
  limit_reached: (limit) => `O plano gratuito permite até ${limit}. Assine o Premium para liberar sem limite.`,
};

/**
 * `guardFeature(feature, { count })` returns true/false synchronously — if
 * false, it also pops the upsell modal, so callers just do
 * `if (!guardFeature(...)) return;` right before the gated action.
 */
export function PremiumProvider({ children }) {
  const [blocked, setBlocked] = useState(null); // { reason, limit } | null

  const guardFeature = useCallback((feature, ctx) => {
    const result = checkGate(feature, ctx);
    if (!result.allowed) setBlocked(result);
    return result.allowed;
  }, []);

  return (
    <PremiumContext.Provider value={{ guardFeature }}>
      {children}
      {blocked && (
        <div className="fixed inset-0 bg-ink-900/50 backdrop-blur-[2px] flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-ink-700 w-full max-w-sm rounded-card shadow-pop p-5">
            <div className="flex items-start gap-3 mb-5">
              <span className="w-9 h-9 rounded-full bg-gold-50 text-gold-700 flex items-center justify-center shrink-0">
                <Sparkles size={18} strokeWidth={2} />
              </span>
              <div className="pt-1">
                <p className="text-sm font-medium text-ink-900 dark:text-ink-50 mb-0.5">Recurso Premium</p>
                <p className="text-sm text-ink-500">
                  {blocked.reason === 'limit_reached' ? MESSAGES.limit_reached(blocked.limit) : MESSAGES.premium_required}
                </p>
              </div>
            </div>
            <button
              autoFocus
              onClick={() => setBlocked(null)}
              className="w-full rounded-xl bg-ledger-500 text-white py-2.5 text-sm font-medium hover:bg-ledger-600 hover:shadow-card-hover transition-all"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium deve ser usado dentro de <PremiumProvider>');
  return ctx;
}
