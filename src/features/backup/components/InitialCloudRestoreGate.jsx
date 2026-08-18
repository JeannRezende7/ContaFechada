import { useEffect, useState } from 'react';
import { CloudDownload, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { isNativeLocalDatabaseAvailable } from '../../../db/localDatabase.js';
import { recoverLegacyCloudDataOnce, restoreCloudBackupIfLocalEmpty } from '../../../db/backup/cloudBackup.js';
import BrandIcon from '../../../components/ui/BrandIcon.jsx';

export default function InitialCloudRestoreGate({ children }) {
  const { firebaseUser } = useAuth();
  const [state, setState] = useState('checking');
  const [error, setError] = useState('');

  async function checkAndRestore() {
    if (!isNativeLocalDatabaseAvailable() || !firebaseUser?.uid) {
      setState('ready');
      return;
    }
    if (!navigator.onLine) {
      setError('Conecte-se à internet para verificar se esta conta possui um backup antes de começar.');
      setState('error');
      return;
    }
    setState('checking');
    setError('');
    try {
      const result = await restoreCloudBackupIfLocalEmpty(firebaseUser.uid);
      if (result.restored) {
        setState('restored');
        window.location.reload();
        return;
      }
      if (result.reason === 'local_not_empty') {
        const recovery = await recoverLegacyCloudDataOnce(firebaseUser.uid);
        if (recovery.recovered > 0) {
          setState('restored');
          window.location.reload();
          return;
        }
      }
      setState('ready');
    } catch (restoreError) {
      setError(restoreError.message || 'Não foi possível verificar seu backup na nuvem.');
      setState('error');
    }
  }

  useEffect(() => {
    checkAndRestore();
    // The uid is the only input; retry is explicit after connection failures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser?.uid]);

  if (state === 'ready') return children;
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper p-6 text-center dark:bg-ink-900">
      <section className="w-full max-w-sm rounded-card bg-white p-6 shadow-pop dark:bg-ink-700">
        <BrandIcon size={56} className="mx-auto h-14 w-14" />
        {state !== 'error' ? (
          <>
            <Loader2 className="mx-auto mt-5 animate-spin text-ledger-600" size={22} />
            <h1 className="mt-3 font-display text-lg font-semibold">Recuperando seus dados</h1>
            <p className="mt-2 text-sm text-ink-300"><CloudDownload className="mr-1 inline" size={15} />Verificando o backup desta conta antes de abrir o aplicativo.</p>
          </>
        ) : (
          <>
            <h1 className="mt-5 font-display text-lg font-semibold">Precisamos verificar seu backup</h1>
            <p className="mt-2 text-sm text-signal-500">{error}</p>
            <button type="button" onClick={checkAndRestore} className="mt-5 inline-flex items-center gap-2 rounded-pill bg-ledger-500 px-4 py-2.5 text-sm font-medium text-white"><RefreshCw size={15} />Tentar novamente</button>
          </>
        )}
      </section>
    </main>
  );
}
