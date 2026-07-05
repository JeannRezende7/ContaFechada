import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { TriangleAlert } from 'lucide-react';

const ConfirmContext = createContext(null);

const CHOICE_TONE = {
  danger: 'bg-signal-500 text-white hover:bg-signal-600 hover:shadow-card-hover',
  primary: 'bg-ledger-500 text-white hover:bg-ledger-600 hover:shadow-card-hover',
  neutral: 'text-ink-500 hover:bg-ink-50',
};

/**
 * Two flavors of the same modal:
 *  - `confirm(message)` — drop-in async replacement for `window.confirm`,
 *    resolves true/false via Cancelar/Confirmar buttons.
 *  - `confirmChoice(message, choices)` — for when more than yes/no is
 *    needed (e.g. "delete just this, or this and future installments"),
 *    resolves with the clicked choice's `value`, or `null` if dismissed.
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { message, choices? } | null
  const resolveRef = useRef(null);

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ message, choices: null });
    });
  }, []);

  const confirmChoice = useCallback((message, choices) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ message, choices });
    });
  }, []);

  function handle(result) {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={{ confirm, confirmChoice }}>
      {children}
      {state && (
        <div
          className="fixed inset-0 bg-ink-900/50 backdrop-blur-[2px] flex items-center justify-center z-50 px-4"
          onKeyDown={(e) => e.key === 'Escape' && handle(state.choices ? null : false)}
        >
          <div className="bg-white dark:bg-ink-700 w-full max-w-sm rounded-card shadow-pop p-5">
            <div className="flex items-start gap-3 mb-5">
              <span className="w-9 h-9 rounded-full bg-signal-50 text-signal-500 flex items-center justify-center shrink-0">
                <TriangleAlert size={18} strokeWidth={2} />
              </span>
              <p className="text-sm text-ink-900 dark:text-ink-50 pt-1.5">{state.message}</p>
            </div>

            {state.choices ? (
              <div className="flex flex-col gap-2">
                {state.choices.map((choice) => (
                  <button
                    key={choice.value}
                    autoFocus={choice.tone === 'neutral'}
                    onClick={() => handle(choice.value)}
                    className={`w-full rounded-xl py-2.5 text-sm font-medium transition-all ${
                      CHOICE_TONE[choice.tone] ?? CHOICE_TONE.neutral
                    }`}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            ) : (
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
            )}
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
  return ctx.confirm;
}

/** @returns {(message: string, choices: Array<{value: string, label: string, tone?: 'danger'|'primary'|'neutral'}>) => Promise<string|null>} */
export function useConfirmChoice() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirmChoice deve ser usado dentro de <ConfirmProvider>');
  return ctx.confirmChoice;
}
