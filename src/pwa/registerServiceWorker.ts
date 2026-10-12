// src/pwa/registerServiceWorker.ts

/**
 * Registra el service worker (public/sw.js) solo en producción:
 * en desarrollo (pnpm dev) guardaría copias viejas y confundiría al programar.
 */
export const registerServiceWorker = () => {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('No se pudo registrar el service worker:', error);
    });
  });
};