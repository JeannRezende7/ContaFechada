import { PiggyBank } from 'lucide-react';

/** Shown instead of a page's content while its first data load is in flight — avoids the "zeroed values pop to real ones" flash. */
export default function LoadingScreen() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-ledger-500 flex items-center justify-center animate-bounce">
        <PiggyBank size={28} className="text-white" strokeWidth={1.75} />
      </div>
      <p className="text-sm text-ink-300 font-medium">Carregando...</p>
    </div>
  );
}
