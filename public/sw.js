// public/sw.js
// Service worker de POS Helados Chepys.
// Hace que la app se pueda instalar y cargue rápido. NO guarda datos de ventas:
// todo lo de Supabase (ventas, caja, reportes) va siempre directo a internet.
//
// Estrategias:
//   · Páginas (navegación): primero internet; sin conexión, la última versión guardada.
//   · /assets/* (JS y CSS con hash en el nombre): primero la copia guardada (nunca cambian).
//   · Íconos, logo y manifest: la copia guardada al instante y se actualiza por detrás.
//
// Si cambias la lógica de este archivo, sube VERSION para limpiar las copias viejas.

const VERSION = 'v1';
const SHELL_CACHE = `chepys-shell-${VERSION}`;
const ASSET_CACHE = `chepys-assets-${VERSION}`;
const MAX_ASSETS = 80;

const SHELL_URLS = ['/', '/manifest.webmanifest', '/favicon.ico', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('chepys-') && key !== SHELL_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* Borra las copias más antiguas para que la caché no crezca sin límite */
const trimCache = async (name, max) => {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((key) => cache.delete(key)));
};

const networkFirstPage = async (request) => {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put('/', response.clone());
    return response;
  } catch {
    return (await cache.match('/')) ?? Response.error();
  }
};

const cacheFirst = async (request) => {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(ASSET_CACHE);
    await cache.put(request, response.clone());
    trimCache(ASSET_CACHE, MAX_ASSETS);
  }
  return response;
};

const staleWhileRevalidate = async (request) => {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached ?? Response.error());
  return cached ?? network;
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  /* Supabase, fuentes e íconos de otros dominios: sin tocar */
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (url.pathname.startsWith('/icons/') || url.pathname.startsWith('/brand/') || url.pathname === '/manifest.webmanifest' || url.pathname === '/favicon.ico') {
    event.respondWith(staleWhileRevalidate(request));
  }
});