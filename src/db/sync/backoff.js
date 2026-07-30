/**
 * Espera progressiva (Fase 6: "Aplicar retry com espera progressiva").
 * Dobra a cada tentativa a partir de `baseMs`, sem passar de `maxMs`.
 */
export function nextRetryDelayMs(attempt, { baseMs = 2000, maxMs = 5 * 60 * 1000 } = {}) {
  const delay = baseMs * 2 ** Math.max(0, attempt);
  return Math.min(delay, maxMs);
}
