import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { TriangleAlert } from 'lucide-react';

const ConfirmContext = createContext(null);

/**
 * Drop-in async replacement for `window.confirm` — same call shape
 * (`await confirm(message)` resolves true/false), but renders the app's own
 * dialog instead of the browser-chrome popup.
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { message } | null
  const resolveRef = useRef(null);

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ message });
    });
  }, []);

  function handle(result) {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="fixed inset-0 bg-ink-900/50 backdrop-blur-[2px] flex items-center justify-center z-50 px-4"
          onKeyDown={(e) => e.key === 'Escape' && handle(false)}
        >
          <div className="bg-white dark:bg-ink-700 w-full max-w-sm rounded-card shadow-pop p-5">
            <div className="flex items-start gap-3 mb-5">
              <span className="w-9 h-9 rounded-full bg-signal-50 text-signal-500 flex items-center justify-center shrink-0">
                <TriangleAlert size={18} strokeWidth={2} />
              </span>
              <p className="text-sm text-ink-900 dark:text-ink-50 pt-1.5">{state.message}</p>
            </div>
            <div className="flex gap-2">
              <button
                autoFocus
                onClick={() => handle(false)}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium text-ink-500 hover:bg-ink-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handle(true)}
                className="flex-1 rounded-xl bg-signal-500 text-white py-2.5 text-sm font-medium hover:bg-signal-600 hover:shadow-card-hover transition-all"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

/** @returns {(message: string) => Promise<boolean>} */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm deve ser usado dentro de <ConfirmProvider>');
  return ctx;
}
