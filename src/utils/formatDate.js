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

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** 'YYYY-MM-DD' for the current local date. */
export function getTodayISODate() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Shifts a 'YYYY-MM-DD' string by `deltaDays` (can be negative) — local time, no UTC drift. */
export function shiftISODate(isoDateStr, deltaDays) {
  const [year, month, day] = isoDateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day + deltaDays);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
