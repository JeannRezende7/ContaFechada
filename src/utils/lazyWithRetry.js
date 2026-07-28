import { lazy } from 'react';

const RELOAD_KEY = 'contafechada:chunk-recovery';
const RETRY_WINDOW_MS = 30_000;

function getLastReloadAttempt() {
  try {
    return Number(sessionStorage.getItem(RELOAD_KEY)) || 0;
  } catch {
    return 0;
  }
}

function markReloadAttempt() {
  try {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // Reload recovery still works when sessionStorage is unavailable.
  }
}

function clearReloadAttempt() {
  try {
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    // Nothing to clear.
  }
}

export function isChunkLoadError(error) {
  const message = String(error?.message ?? error ?? '');
  return (
    error?.name === 'ChunkLoadError' ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message)
  );
}

async function removeStalePwaPrecache() {
  if (!('caches' in globalThis)) return;
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => name.includes('workbox-precache'))
      .map((name) => caches.delete(name))
  );
}

async function requestServiceWorkerUpdate() {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  await registration?.update();
}

export async function importWithChunkRecovery(importer) {
  try {
    const module = await importer();
    clearReloadAttempt();
    return module;
  } catch (error) {
    if (!isChunkLoadError(error)) throw error;

    const lastAttempt = getLastReloadAttempt();
    if (Date.now() - lastAttempt < RETRY_WINDOW_MS) throw error;
    markReloadAttempt();

    await Promise.allSettled([
      removeStalePwaPrecache(),
      requestServiceWorkerUpdate(),
    ]);
    window.location.reload();

    // Keep React Suspense active while the browser starts the navigation.
    return new Promise(() => {});
  }
}

export function lazyWithRetry(importer) {
  return lazy(() => importWithChunkRecovery(importer));
}
