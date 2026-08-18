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
