import { AlertTriangle, CheckCircle2, CloudUpload } from 'lucide-react';

export default function PendingOperationsStatus({ pending = 0, errors = 0, lastSyncAt = null }) {
  const healthy = pending === 0 && errors === 0;
  return (
    <section className="rounded-card bg-white p-4 shadow-card dark:bg-ink-700" aria-label="Estado da sincronização" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-full ${healthy ? 'bg-ledger-50 text-ledger-600 dark:bg-ledger-700/20' : 'bg-pending-400/15 text-pending-500'}`}>
          {healthy ? <CheckCircle2 size={18} /> : <CloudUpload size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink-900 dark:text-ink-50">
            {pending ? `${pending} alteração${pending === 1 ? '' : 'ões'} pendente${pending === 1 ? '' : 's'}` : 'Tudo sincronizado'}
          </p>
          <p className="mt-0.5 text-xs text-ink-300">
            {lastSyncAt ? `Última sincronização: ${new Date(lastSyncAt).toLocaleString('pt-BR')}` : 'Este aparelho ainda não sincronizou.'}
          </p>
        </div>
      </div>
      {errors > 0 && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-signal-50 px-3 py-2 text-xs text-signal-600 dark:bg-signal-500/10 dark:text-signal-400">
          <AlertTriangle size={14} /> {errors} operação{errors === 1 ? '' : 'ões'} precisa{errors === 1 ? '' : 'm'} de atenção.
        </p>
      )}
    </section>
  );
}
