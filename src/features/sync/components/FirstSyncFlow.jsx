import { useEffect, useState } from 'react';
import FirstSyncPanel from './FirstSyncPanel.jsx';
import MigrationSummary from './MigrationSummary.jsx';

export default function FirstSyncFlow({ controller, onDownloadBackup, onComplete }) {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    controller.getState().then(async (saved) => {
      if (!active) return;
      if (['backing_up', 'running'].includes(saved.status)) {
        setBusy(true);
        try {
          saved = await controller.resume();
        } finally {
          setBusy(false);
        }
      } else if (saved.status === 'idle') {
        setBusy(true);
        try {
          saved = await controller.prepare();
        } finally {
          setBusy(false);
        }
      }
      if (active) setState(saved);
    }).catch((error) => active && setState({ status: 'error', error: error.message }));
    return () => { active = false; };
  }, [controller]);

  async function choose(choice) {
    setBusy(true);
    try {
      const next = await controller.execute(choice);
      setState(next);
      if (next.status === 'completed') onComplete?.(next);
    } catch {
      setState(await controller.getState());
    } finally {
      setBusy(false);
    }
  }

  if (!state) return <p role="status" className="text-sm text-ink-300">Preparando sincronização…</p>;
  if (state.status === 'completed') {
    return <MigrationSummary summary={state.result?.summary ?? state.result} completedAt={state.updatedAt} onDownloadBackup={onDownloadBackup} />;
  }
  return (
    <div aria-busy={busy}>
      <FirstSyncPanel preview={state.preview} busy={busy} onChoose={choose} />
      {state.error && <p role="alert" className="mt-3 rounded-xl bg-signal-50 p-3 text-sm text-signal-600 dark:bg-signal-500/10 dark:text-signal-400">{state.error}</p>}
    </div>
  );
}
