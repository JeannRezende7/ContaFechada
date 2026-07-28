const SOURCES = {
  32: '/brand-mark-32.png',
  36: '/brand-mark-36.png',
  56: '/brand-mark-56.png',
};

export default function BrandIcon({ size = 36, className = '' }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-ledger-500 ${className}`}
      aria-hidden="true"
    >
      <img
        src={SOURCES[size] ?? '/brand-mark-transparent.png'}
        alt=""
        width={size}
        height={size}
        className="w-full h-full object-contain"
      />
    </span>
  );
}
