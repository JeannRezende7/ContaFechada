let deferredInstallPrompt = null;
const listeners = new Set();

function notifyListeners() {
  listeners.forEach((listener) => listener(getPwaInstallState()));
}

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

function isNativeApp() {
  return window.Capacitor?.isNativePlatform?.() === true;
}

export function getPwaInstallState() {
  return {
    isBrowser: !isNativeApp(),
    isInstalled: isStandalone(),
    canPrompt: Boolean(deferredInstallPrompt),
  };
}

export function subscribeToPwaInstall(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function requestPwaInstall() {
  if (!deferredInstallPrompt) return { outcome: 'unavailable' };

  const prompt = deferredInstallPrompt;
  deferredInstallPrompt = null;
  await prompt.prompt();
  const choice = await prompt.userChoice;
  notifyListeners();
  return choice;
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    notifyListeners();
  });
}
