import { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import SyncDiagnosticsPanel from '../components/SyncDiagnosticsPanel.jsx';
import { buildDiagnosticsReport, downloadDiagnosticsReport } from '../services/diagnosticsExport.js';

export default function SyncDiagnosticsPage({ loadHealth, retryErrors, platform = 'unknown' }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setHealth(await loadHealth());
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setLoading(false);
    }
  }, [loadHealth]);

  useEffect(() => { refresh(); }, [refresh]);

  function exportReport() {
    downloadDiagnosticsReport(buildDiagnosticsReport(health, {
      appVersion: typeof __APP_VERSION__ === 'undefined' ? 'unknown' : __APP_VERSION__,
      platform,
    }));
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between gap-3">
        <div><h1 className="font-display text-xl font-semibold">Diagnóstico</h1><p className="text-sm text-ink-300">Informações técnicas deste aparelho.</p></div>
        <button type="button" onClick={exportReport} disabled={!health} className="flex items-center gap-2 rounded-pill bg-ink-50 px-3 py-2 text-sm disabled:opacity-50 dark:bg-ink-700">
          <Download size={15} /> Exportar
        </button>
      </div>
      {loading && !health && <p role="status" className="flex items-center gap-2 text-sm text-ink-300"><RefreshCw size={15} className="animate-spin" /> Carregando diagnóstico…</p>}
      {error && <p role="alert" className="rounded-xl bg-signal-50 p-3 text-sm text-signal-600 dark:bg-signal-500/10 dark:text-signal-400">{error}</p>}
      {health && <SyncDiagnosticsPanel health={health} loading={loading} onRefresh={refresh} onRetryErrors={retryErrors} />}
    </main>
  );
}
