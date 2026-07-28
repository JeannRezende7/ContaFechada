import { createContext, useContext, useEffect, useState } from 'react';

const PrivacyContext = createContext(null);
const KEY = 'contafechada:privacy-mode';

export function PrivacyProvider({ children }) {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(KEY) === 'true');

  useEffect(() => {
    localStorage.setItem(KEY, String(enabled));
    document.documentElement.classList.toggle('privacy-mode', enabled);
    return () => document.documentElement.classList.remove('privacy-mode');
  }, [enabled]);

  return (
    <PrivacyContext.Provider value={{ enabled, setEnabled, toggle: () => setEnabled((current) => !current) }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (!context) throw new Error('usePrivacy deve ser usado dentro de PrivacyProvider');
  return context;
}
