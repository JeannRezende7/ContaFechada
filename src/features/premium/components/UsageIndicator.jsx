import { usePremium } from '../../../contexts/PremiumContext.jsx';
import { PREMIUM_ENFORCED } from '../../../config/premium.js';

/**
 * "2 de 2 recorrências utilizadas" — only rendered once enforcement is live
 * and for free users (Fase 4 discovery point). Silent no-op otherwise, so
 * call sites can render it unconditionally next to the relevant list.
 */
export default function UsageIndicator({ feature, count, label }) {
  const { isPremium, getLimit } = usePremium();
  const limit = getLimit(feature);
  if (!PREMIUM_ENFORCED || isPremium || limit == null) return null;

  const atLimit = count >= limit;

  return (
    <p className={`text-xs ${atLimit ? 'text-signal-500' : 'text-ink-300'}`}>
      {Math.min(count, limit)} de {limit} {label} utilizados
    </p>
  );
}
