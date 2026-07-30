import { AlertTriangle, Clock3, Database, RefreshCw } from 'lucide-react';
import PendingOperationsStatus from './PendingOperationsStatus.jsx';

function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function SyncDiagnosticsPanel({ health, loading = false, onRefresh, onRetryErrors }) {
  if (!health) return null;
  const lastSync = Object.values(health.ultimaSincronizacaoPorEntidade ?? {}).filter(Boolean).sort().at(-1) ?? null;
  const errors = health.filaPorStatus?.error ?? 0;
  return (
    <section className="flex flex-col gap-3" aria-label="Diagnóstico de sincronização">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">Diagnóstico de sincronização</h2>
        <button type="button" onClick={onRefresh} disabled={loading} aria-label="Atualizar diagnóstico de sincronização" className="flex items-center gap-1.5 text-xs text-ledger-600 disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>
      <PendingOperationsStatus pending={health.filaPendente} errors={errors} lastSyncAt={lastSync} />
      {health.alertas?.map((alert) => (
        <p key={alert.type} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${alert.severity === 'error' ? 'bg-signal-50 text-signal-600 dark:bg-signal-500/10 dark:text-signal-400' : 'bg-pending-400/15 text-pending-500'}`}>
          <AlertTriangle size={14} /> {alert.message}
        </p>
      ))}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric icon={Clock3} label="Duração média" value={health.metricas?.duracaoMediaMs == null ? '—' : `${health.metricas.duracaoMediaMs} ms`} />
        <Metric icon={Database} label="Enviado / baixado" value={`${formatBytes(health.metricas?.bytesUploaded)} / ${formatBytes(health.metricas?.bytesDownloaded)}`} />
        <Metric icon={AlertTriangle} label="Erros acumulados" value={health.metricas?.errors ?? 0} />
        <Metric icon={RefreshCw} label="Ciclos concluídos" value={health.metricas?.cycles ?? 0} />
      </div>
      {errors > 0 && onRetryErrors && <button type="button" onClick={onRetryErrors} className="self-start text-sm font-medium text-signal-500">Tentar operações com erro novamente</button>}
      {health.conflitosRecentes?.length > 0 && (
        <details className="rounded-card bg-white p-4 shadow-card dark:bg-ink-700">
          <summary className="cursor-pointer text-sm font-medium">Conflitos recentes ({health.conflitosRecentes.length})</summary>
          <ul className="mt-3 flex flex-col gap-2 text-xs text-ink-300">
            {health.conflitosRecentes.map((item) => <li key={item.id}>{item.entidade} · {item.registroId} · {item.motivo}</li>)}
          </ul>
        </details>
      )}
    </section>
  );
}

function Metric({ icon: Icon, label, value }) {
  return <div className="rounded-xl bg-ink-50 p-3 dark:bg-ink-900"><Icon size={15} className="text-ledger-600" /><p className="mt-2 text-[11px] text-ink-300">{label}</p><p className="mt-0.5 text-sm font-semibold">{value}</p></div>;
}
