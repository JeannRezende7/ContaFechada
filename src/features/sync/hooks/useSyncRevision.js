import { useEffect, useState } from 'react';

/** Changes only after remote data has been applied to the local database. */
export function useSyncRevision() {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setRevision((current) => current + 1);
    window.addEventListener('contafechada:sync-complete', refresh);
    return () => window.removeEventListener('contafechada:sync-complete', refresh);
  }, []);

  return revision;
}
