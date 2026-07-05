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

/**
 * Guards against native <input type="date"> letting the year segment overflow
 * past 4 digits when typed quickly (e.g. "31/12/275760") — reject anything
 * outside a sane range instead of storing garbage.
 */
export function isSaneISODate(value) {
  if (!value) return true;
  const match = value.match(/^(\d{4})-\d{2}-\d{2}$/);
  if (!match) return false;
  const year = Number(match[1]);
  return year >= 1900 && year <= 2100;
}
