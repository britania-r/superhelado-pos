// src/pwa/installPrompt.ts
// Guarda el aviso de instalación del navegador apenas llega (puede llegar antes
// de que React dibuje el banner) y le avisa a quien esté escuchando.

import { useSyncExternalStore } from 'react';

/** Evento de Chrome, Edge y Android (aún no está en los tipos de TypeScript) */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallSupport =
  /** Ya está instalada (se abrió como app) */
  | 'installed'
  /** El navegador ofrece instalar con un botón (Chrome, Edge, Android) */
  | 'prompt'
  /** iPhone/iPad en Safari: se instala a mano desde Compartir */
  | 'ios'
  /** Aún no hay forma de instalar (o el navegador no lo permite) */
  | 'none';

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/* iPhone, iPod o iPad (el iPad moderno se presenta como Mac con pantalla táctil), en Safari */
const isIosSafari = () => {
  const ua = navigator.userAgent;
  const iosDevice = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const otherBrowser = /crios|fxios|edgios|opios/i.test(ua);
  return iosDevice && !otherBrowser;
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // usamos nuestro banner en lugar del aviso del navegador
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    notify();
  });
}

const getSupport = (): InstallSupport => {
  if (installed || isStandalone()) return 'installed';
  if (deferred) return 'prompt';
  if (isIosSafari()) return 'ios';
  return 'none';
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Muestra el aviso de instalación del navegador. Devuelve true si la persona aceptó. */
export const promptInstall = async (): Promise<boolean> => {
  const event = deferred;
  if (!event) return false;
  deferred = null; // el aviso solo se puede usar una vez
  await event.prompt();
  const { outcome } = await event.userChoice;
  notify();
  return outcome === 'accepted';
};

export const useInstallSupport = () => useSyncExternalStore(subscribe, getSupport, () => 'none' as const);