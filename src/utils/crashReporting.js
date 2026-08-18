import { Capacitor } from '@capacitor/core';

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const JWT = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const LONG_SECRET = /\b[A-Za-z0-9_-]{24,}\b/g;
const MONEY = /(?:R\$\s*)?\d{1,3}(?:\.\d{3})*,\d{2}\b/g;

export function sanitizeCrashText(value) {
  return String(value ?? 'Erro sem mensagem')
    .replace(EMAIL, '[email]')
    .replace(JWT, '[token]')
    .replace(LONG_SECRET, '[identificador]')
    .replace(MONEY, '[valor]')
    .slice(0, 500);
}

async function crashlytics() {
  if (!Capacitor.isNativePlatform()) return null;
  const { FirebaseCrashlytics } = await import('@capacitor-firebase/crashlytics');
  return FirebaseCrashlytics;
}

export async function reportError(error, area = 'app') {
  try {
    const client = await crashlytics();
    if (!client) return;
    await client.recordException({
      message: `${sanitizeCrashText(area)}: ${sanitizeCrashText(error?.message ?? error)}`,
    });
  } catch {
    // Observability must never interfere with the user flow.
  }
}

export function initializeCrashReporting() {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (event) => reportError(event.error ?? event.message, 'window_error'));
  window.addEventListener('unhandledrejection', (event) => reportError(event.reason, 'unhandled_rejection'));
}
