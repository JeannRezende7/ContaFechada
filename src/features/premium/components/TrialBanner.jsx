import { Clock } from 'lucide-react';
import { usePremium } from '../../../contexts/PremiumContext.jsx';

/**
 * "Avisar quando faltarem 3 dias e 1 dia" (Fase 7) — implemented as one
 * continuous banner for trialDaysLeft <= 3 instead of two one-shot toasts:
 * simpler (no dismissed-state to track in localStorage) and still gives the
 * user the same warning window, just persistent instead of transient.
 */
export default function TrialBanner() {
  const { subscription, openPaywall } = usePremium();

  if (!subscription.isTrialing || subscription.trialDaysLeft == null || subscription.trialDaysLeft > 3) return null;

  const urgente = subscription.trialDaysLeft <= 1;

  return (
    <button
      onClick={() => openPaywall({})}
      className={`w-full flex items-center justify-center gap-2 py-2 text-xs md:text-sm font-medium text-center transition-colors ${
        urgente ? 'bg-signal-500 text-white hover:bg-signal-600' : 'bg-gold-50 text-gold-700 hover:bg-gold-50/80'
      }`}
    >
      <Clock size={14} strokeWidth={2.25} />
      {subscription.trialDaysLeft === 0
        ? 'Seu teste Premium termina hoje — assine para não perder o acesso.'
        : `Seu teste Premium termina em ${subscription.trialDaysLeft} dia(s) — assine para não perder o acesso.`}
    </button>
  );
}
