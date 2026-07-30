/**
 * Fase 11 do roadmap local-first: quando a sincronização (Fases 6/7) pode
 * rodar. Cancelar ou perder o Premium NUNCA bloqueia o SQLite local — ele
 * já funciona sozinho desde a Fase 3 — só pausa o envio/recebimento com a
 * nuvem.
 */
export function canSync({ isPremium, isOnline }) {
  return Boolean(isPremium) && Boolean(isOnline);
}
