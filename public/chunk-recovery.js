const RECOVERY_KEY = 'contafechada:legacy-chunk-recovery';
const RETRY_WINDOW_MS = 30_000;

let lastAttempt = 0;
try {
  lastAttempt = Number(sessionStorage.getItem(RECOVERY_KEY)) || 0;
} catch {
  // A reload still works when sessionStorage is unavailable.
}

if (Date.now() - lastAttempt >= RETRY_WINDOW_MS) {
  try {
    sessionStorage.setItem(RECOVERY_KEY, String(Date.now()));
  } catch {
    // Nothing else is required before reloading.
  }
  window.location.reload();
}

// React.lazy from an old build still expects a valid default export while the
// reload starts. Returning an empty component prevents a second render error.
export default function StaleBuildRecovery() {
  return null;
}
