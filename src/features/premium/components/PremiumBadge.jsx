import { Crown } from 'lucide-react';
import { usePremium } from '../../../contexts/PremiumContext.jsx';
import { PREMIUM_ENFORCED } from '../../../config/premium.js';

/**
 * Small "PRO" pill for advanced/premium-only sections. Never shown to a
 * premium user (Fase 4: "Remover publicidade de Premium para quem ja
 * assina") nor before enforcement launches (no point advertising a gate
 * that isn't active yet).
 */
export default function PremiumBadge({ className = '' }) {
  const { isPremium } = usePremium();
  if (!PREMIUM_ENFORCED || isPremium) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill bg-gold-50 text-gold-700 px-2 py-0.5 text-[10px] font-semibold ${className}`}
    >
      <Crown size={11} strokeWidth={2.5} />
      PRO
    </span>
  );
}
