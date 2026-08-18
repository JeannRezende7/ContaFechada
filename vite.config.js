import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Read directly from package.json instead of relying on `process.env.npm_package_version` —
// that env var is only set by npm's own script-runner and isn't reliably present in every
// CI/build environment (e.g. it came back empty on Netlify, leaving `__APP_VERSION__`
// undefined and crashing at runtime).
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));

export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __NATIVE_ANDROID_BUILD__: JSON.stringify(mode.startsWith('android')),
    __ADMOB_TESTING__: JSON.stringify(mode === 'android-test'),
  },
  plugins: [
    react(),
    !mode.startsWith('android') && {
      name: 'publish-android-download',
      closeBundle() {
        const apk = new URL('./downloads/conta-fechada.apk', import.meta.url);
        if (existsSync(apk)) {
          copyFileSync(apk, new URL('./dist/conta-fechada.apk', import.meta.url));
          copyFileSync(apk, new URL(`./dist/conta-fechada-${version}.apk`, import.meta.url));
        }
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      manifest: {
        name: 'Conta Fechada: Gestor Pessoal',
        short_name: 'Conta Fechada',
        description: 'Sua planilha financeira mensal, mês a mês',
        lang: 'pt-BR',
        theme_color: '#0F172A',
        background_color: '#F8FAFC',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@firebase/analytics') || id.includes('/firebase/analytics')) {
            return 'firebase-analytics';
          }
          if (
            id.includes('@firebase/firestore') ||
            id.includes('@firebase/webchannel-wrapper') ||
            id.includes('/firebase/firestore')
          ) {
            return 'firebase-firestore';
          }
          if (id.includes('@firebase/auth') || id.includes('/firebase/auth')) {
            return 'firebase-auth';
          }
          if (id.includes('@firebase/') || id.includes('/firebase/')) return 'firebase-core';
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router') ||
            id.includes('/scheduler/')
          ) {
            return 'react-vendor';
          }
          if (id.includes('/lucide-react/')) return 'icons';
          if (id.includes('/recharts/') || id.includes('/d3-')) return 'charts';
          if (id.includes('/pdfjs-dist/')) return 'pdf';
          return undefined;
        },
      },
    },
  },
}));
