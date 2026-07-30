/** Fase 0 do roadmap local-first: decisão registrada em FASE0_DECISOES.md. */
export const CLOUD_RETENTION_DAYS = 90;

/**
 * Fase 11: data em que a cópia na nuvem deixa de ser retida depois do fim
 * do período pago. `currentPeriodEndIso` vem do documento de assinatura
 * (`private/subscription`, ROADMAP_MONETIZACAO.txt); `null` quando não há
 * um fim de período conhecido (conta nunca assinou).
 */
export function cloudDeletionDate(currentPeriodEndIso, retentionDays = CLOUD_RETENTION_DAYS) {
  if (!currentPeriodEndIso) return null;
  const end = new Date(currentPeriodEndIso);
  end.setUTCDate(end.getUTCDate() + retentionDays);
  return end.toISOString();
}
