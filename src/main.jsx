import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ConfirmProvider } from './contexts/ConfirmContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { PremiumProvider } from './contexts/PremiumContext.jsx';
import { PrivacyProvider } from './contexts/PrivacyContext.jsx';
import './utils/pwaInstall.js';
import { initializeCrashReporting } from './utils/crashReporting.js';
import './index.css';

initializeCrashReporting();

if (__NATIVE_ANDROID_BUILD__) {
  document.documentElement.classList.add('native-app');
}

// Older Android builds accidentally installed the web/PWA service worker.
// Remove it in native builds so it cannot serve stale hashed chunks after an
// app update. Cache clearing here affects only web assets, not SQLite data.
if (__NATIVE_ANDROID_BUILD__ && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .then(() => globalThis.caches?.keys().then((names) => Promise.all(names.map((name) => globalThis.caches.delete(name)))))
    .catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ConfirmProvider>
            <PremiumProvider>
              <PrivacyProvider>
                <App />
              </PrivacyProvider>
            </PremiumProvider>
          </ConfirmProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
