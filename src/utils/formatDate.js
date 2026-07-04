/**
 * Formats a 'YYYY-MM-DD' string as 'DD/MM/YYYY' via split, never via `new Date(str)` —
 * parsing a date-only ISO string with Date() reads it as UTC midnight, which in a
 * UTC-negative timezone (Brazil) renders as the previous day.
 */
export function formatDateBR(isoDateStr) {
  if (!isoDateStr) return '';
  const [year, month, day] = isoDateStr.split('-');
  return `${day}/${month}/${year}`;
}
