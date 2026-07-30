/**
 * Firestore only ever stores a `corKey` (e.g. 'azul'), never a raw Tailwind
 * class name — Tailwind's JIT only emits classes that appear literally in a
 * scanned source file, so a class name coming from data would be purged in
 * production builds. This map is the single place those literal classes
 * live; `Object.keys(COLOR_MAP)` is also the closed set of swatches offered
 * when creating a custom category.
 */
/**
 * `hex` mirrors `dot` as an actual color value (not a Tailwind class) — SVG
 * chart libraries (recharts) set `fill` as a style/attribute, so a class name
 * has no effect there the way it does on a `<span>`.
 */
export const COLOR_MAP = {
  verde: { dot: 'bg-ledger-600', chipBg: 'bg-ledger-50 dark:bg-ledger-700/20', chipText: 'text-ledger-700 dark:text-ledger-400', hex: '#059669' },
  verdeClaro: { dot: 'bg-ledger-400', chipBg: 'bg-ledger-50 dark:bg-ledger-700/20', chipText: 'text-ledger-600 dark:text-ledger-400', hex: '#34D399' },
  menta: { dot: 'bg-mint-500', chipBg: 'bg-mint-50 dark:bg-mint-700/20', chipText: 'text-mint-700 dark:text-mint-500', hex: '#14B8A6' },
  azul: { dot: 'bg-indigo-600', chipBg: 'bg-indigo-50 dark:bg-indigo-950/40', chipText: 'text-indigo-700 dark:text-indigo-300', hex: '#4F46E5' },
  azulClaro: { dot: 'bg-cyan-600', chipBg: 'bg-cyan-50 dark:bg-cyan-950/40', chipText: 'text-cyan-700 dark:text-cyan-300', hex: '#0891B2' },
  cinza: { dot: 'bg-slate-500', chipBg: 'bg-slate-100 dark:bg-slate-900/60', chipText: 'text-slate-700 dark:text-slate-300', hex: '#64748B' },
  roxo: { dot: 'bg-purple-500', chipBg: 'bg-purple-50 dark:bg-purple-950/40', chipText: 'text-purple-700 dark:text-purple-300', hex: '#A855F7' },
  amarelo: { dot: 'bg-amber-500', chipBg: 'bg-amber-50 dark:bg-amber-950/40', chipText: 'text-amber-700 dark:text-amber-300', hex: '#F59E0B' },
  vermelho: { dot: 'bg-rose-500', chipBg: 'bg-rose-50 dark:bg-rose-950/40', chipText: 'text-rose-700 dark:text-rose-300', hex: '#F43F5E' },
  dourado: { dot: 'bg-gold-500', chipBg: 'bg-gold-50 dark:bg-gold-700/20', chipText: 'text-gold-700 dark:text-gold-500', hex: '#CA8A04' },
  rosa: { dot: 'bg-pink-500', chipBg: 'bg-pink-50 dark:bg-pink-950/40', chipText: 'text-pink-700 dark:text-pink-300', hex: '#EC4899' },
  laranja: { dot: 'bg-orange-500', chipBg: 'bg-orange-50 dark:bg-orange-950/40', chipText: 'text-orange-700 dark:text-orange-300', hex: '#F97316' },
  violeta: { dot: 'bg-violet-500', chipBg: 'bg-violet-50 dark:bg-violet-950/40', chipText: 'text-violet-700 dark:text-violet-300', hex: '#8B5CF6' },
  lima: { dot: 'bg-lime-500', chipBg: 'bg-lime-50 dark:bg-lime-950/40', chipText: 'text-lime-700 dark:text-lime-300', hex: '#84CC16' },
  fucsia: { dot: 'bg-fuchsia-500', chipBg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40', chipText: 'text-fuchsia-700 dark:text-fuchsia-300', hex: '#D946EF' },
};

export function getColor(corKey) {
  return COLOR_MAP[corKey] ?? COLOR_MAP.cinza;
}
