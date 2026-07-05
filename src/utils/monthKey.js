export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const MESES_ABREV = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** 'YYYY-MM' for the current local month. */
export function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

function parseMonthKey(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return { year, month }; // month is 1-12
}

/** Moves a 'YYYY-MM' key by `delta` months (can be negative), handling year rollover. */
export function shiftMonthKey(monthKey, delta) {
  const { year, month } = parseMonthKey(monthKey);
  // Numeric Date constructor: local time, no string-parsing timezone bug.
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

/** 'YYYY-MM' -> 'Julho 2026'. */
export function formatMonthLabel(monthKey) {
  const { year, month } = parseMonthKey(monthKey);
  return `${MESES[month - 1]} ${year}`;
}

/** 'YYYY-MM' -> 'Jul/26' — compact label for chart axes. */
export function formatMonthShort(monthKey) {
  const { year, month } = parseMonthKey(monthKey);
  return `${MESES_ABREV[month - 1]}/${String(year).slice(-2)}`;
}

/** Number of days in the given 'YYYY-MM' month. */
export function daysInMonth(monthKey) {
  const { year, month } = parseMonthKey(monthKey);
  return new Date(year, month, 0).getDate();
}

/** Clamps a day-of-month (1-31) to the last real day of the given month. */
export function clampDayToMonth(monthKey, day) {
  return Math.min(day, daysInMonth(monthKey));
}

/**
 * Days left to budget for in `monthKey`: the whole month if it's still in
 * the future, 0 if it's already over, and "today through month-end"
 * (inclusive) if it's the current month.
 */
export function daysRemainingInMonth(monthKey) {
  const current = getCurrentMonthKey();
  if (monthKey < current) return 0;
  if (monthKey > current) return daysInMonth(monthKey);
  return daysInMonth(monthKey) - new Date().getDate() + 1;
}

/** Inclusive ['YYYY-MM-DD', 'YYYY-MM-DD'] bounds for a range query, safe as string comparison. */
export function monthRangeBounds(monthKey) {
  return { gte: `${monthKey}-01`, lte: `${monthKey}-31` };
}

/** 'YYYY-MM' for the local month of a Firestore Timestamp. */
export function monthKeyFromTimestamp(timestamp) {
  const d = timestamp.toDate();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}
