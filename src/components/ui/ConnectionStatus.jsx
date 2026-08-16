import { useEffect, useState } from 'react';
import { Cloud, CloudOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function ConnectionStatus() {
  const { isLocalSession } = useAuth();
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isLocalSession) return null;

  return (
    <span
      title={online ? 'Internet disponível' : 'Sem internet — seus dados continuam salvos no aparelho'}
      aria-label={online ? 'Internet disponível' : 'Sem internet. Seus dados continuam salvos no aparelho.'}
      className={`inline-flex items-center gap-1.5 rounded-pill px-2 py-1 text-[10px] font-medium ${
        online
          ? 'text-ledger-600'
          : 'bg-pending-50 text-pending-700 dark:bg-ink-700 dark:text-pending-200'
      }`}
    >
      {online ? <Cloud size={15} /> : <CloudOff size={15} />}
      <span className={online ? 'hidden lg:inline' : 'hidden sm:inline'}>
        {online ? 'Online' : 'Sem internet'}
      </span>
    </span>
  );
}
