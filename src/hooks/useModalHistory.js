import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

const HISTORY_KEY = '__contafechadaModal';

/** Makes browser/Android Back close an open modal before leaving its page. */
export function useModalHistory(open, onClose) {
  const modalIdRef = useRef(`modal-${crypto.randomUUID()}`);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) return undefined;

    const modalId = modalIdRef.current;
    if (window.history.state?.[HISTORY_KEY] !== modalId) {
      window.history.pushState(
        { ...window.history.state, [HISTORY_KEY]: modalId },
        '',
        window.location.href
      );
    }

    const handlePopState = () => onClose();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !Capacitor.isNativePlatform()) return undefined;
    let handle;
    let disposed = false;
    App.addListener('backButton', () => onClose()).then((nextHandle) => {
      if (disposed) nextHandle.remove();
      else handle = nextHandle;
    });
    return () => {
      disposed = true;
      handle?.remove();
    };
  }, [open, onClose]);

  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;
    if (wasOpen && !open && window.history.state?.[HISTORY_KEY] === modalIdRef.current) {
      window.history.back();
    }
  }, [open]);
}
