import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-display text-2xl font-semibold text-paper tracking-tight">
            Contas
          </span>
          <p className="text-ink-300 text-sm mt-1">Gestão financeira sem planilha</p>
        </div>
        <div className="bg-paper rounded-card shadow-card p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
