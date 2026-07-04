export default function GoogleButton({ onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 rounded-xl border border-ink-100
                 bg-white py-3 text-sm font-medium text-ink-900 hover:shadow-card-hover hover:-translate-y-px
                 transition-all disabled:opacity-60 disabled:translate-y-0 disabled:shadow-none"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92C16.66 14.2 17.64 11.9 17.64 9.2Z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.55-1.85.87-3.04.87-2.34 0-4.32-1.58-5.03-3.71H.98v2.33A9 9 0 0 0 9 18Z" />
        <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.98a9 9 0 0 0 0 8.1l2.99-2.33Z" />
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .98 4.95l2.99 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
      </svg>
      {loading ? 'Entrando…' : 'Entrar com o Google'}
    </button>
  );
}
