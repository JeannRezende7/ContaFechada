import { MESES, MESES_ABREV, shiftMonthKey, formatMonthLabel, monthRangeBounds } from './monthKey.js';
import { shiftISODate, formatDateBR } from './formatDate.js';

/** Filter granularities offered on the Lançamentos period switcher. */
export const PERIOD_TYPES = [
  { key: 'dia', label: 'Dia' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mês' },
  { key: 'ano', label: 'Ano' },
  { key: 'periodo', label: 'Período' },
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function parseISODate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day };
}

/** Sunday-anchored start of the week containing `iso` ('YYYY-MM-DD'). */
export function startOfWeek(iso) {
  const { year, month, day } = parseISODate(iso);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() - d.getDay());
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDayLong(iso) {
  const { year, month, day } = parseISODate(iso);
  return `${day} de ${MESES[month - 1].toLowerCase()} de ${year}`;
}

function formatDayShort(iso) {
  const { month, day } = parseISODate(iso);
  return `${day} de ${MESES_ABREV[month - 1].toLowerCase()}.`;
}

/** Inclusive { gte, lte } date-string bounds for the given period type, anchored at `anchor`. */
export function getRangeForPeriod(periodType, anchor, customRange) {
  switch (periodType) {
    case 'dia':
      return { gte: anchor, lte: anchor };
    case 'semana': {
      const start = startOfWeek(anchor);
      return { gte: start, lte: shiftISODate(start, 6) };
    }
    case 'ano': {
      const year = anchor.slice(0, 4);
      return { gte: `${year}-01-01`, lte: `${year}-12-31` };
    }
    case 'periodo':
      return { gte: customRange?.de || anchor, lte: customRange?.ate || anchor };
    case 'mes':
    default:
      return monthRangeBounds(anchor.slice(0, 7));
  }
}

/** Moves the anchor date by one step of the given period type (delta: -1 | 1). */
export function shiftAnchor(periodType, anchor, delta) {
  switch (periodType) {
    case 'dia':
      return shiftISODate(anchor, delta);
    case 'semana':
      return shiftISODate(anchor, delta * 7);
    case 'ano':
      return `${Number(anchor.slice(0, 4)) + delta}-01-01`;
    case 'mes':
    default:
      return `${shiftMonthKey(anchor.slice(0, 7), delta)}-01`;
  }
}

/** Human label for the current period selection, e.g. '28 de jun. – 4 de jul.'. */
export function formatPeriodLabel(periodType, anchor, customRange) {
  switch (periodType) {
    case 'dia':
      return formatDayLong(anchor);
    case 'semana': {
      const start = startOfWeek(anchor);
      return `${formatDayShort(start)} – ${formatDayShort(shiftISODate(start, 6))}`;
    }
    case 'ano':
      return anchor.slice(0, 4);
    case 'periodo':
      return customRange?.de && customRange?.ate
        ? `${formatDateBR(customRange.de)} – ${formatDateBR(customRange.ate)}`
        : 'Selecione o período';
    case 'mes':
    default:
      return formatMonthLabel(anchor.slice(0, 7));
  }
}

/** Every 'YYYY-MM' month key intersecting [gte, lte] — used to backfill recorrências across the range. */
export function monthKeysInRange(gte, lte) {
  const keys = [];
  let mk = gte.slice(0, 7);
  const endMk = lte.slice(0, 7);
  let guard = 0;
  while (mk <= endMk && guard < 240) {
    keys.push(mk);
    mk = shiftMonthKey(mk, 1);
    guard += 1;
  }
  return keys;
}
