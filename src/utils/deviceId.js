const STORAGE_KEY = 'contafechada:deviceId';

let cached;

/**
 * Stable per-install identifier (Fase 2 do roadmap local-first). Generated
 * once with `crypto.randomUUID()` and persisted in `localStorage`, so every
 * record created on this device — online or offline, com ou sem conta —
 * carries the same `deviceId` across app restarts. Used to tell which
 * device produced a change (conflict resolution, Fase 7) and never sent
 * anywhere as an identity/auth credential.
 */
export function getDeviceId() {
  if (cached) return cached;
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  cached = id;
  return id;
}
