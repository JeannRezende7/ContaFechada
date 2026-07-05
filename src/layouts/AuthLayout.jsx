import { Outlet } from 'react-router-dom';
import { PiggyBank } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-900 to-ink-700 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-ledger-500 flex items-center justify-center shadow-pop mb-4">
            <PiggyBank className="w-7 h-7 text-white" strokeWidth={1.75} />
          </div>
          <span className="font-display text-2xl font-semibold text-paper tracking-tight">
            Conta Fechada
          </span>
          <p className="text-ink-100 text-sm mt-1.5">Sua planilha financeira mensal, mês a mês</p>
        </div>
        <div className="bg-paper text-ink-900 rounded-card shadow-pop p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
