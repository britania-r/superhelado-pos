// src/hooks/useMediaQuery.ts

import { useSyncExternalStore } from 'react';

/* Mismos cortes que el CSS */
export const DESKTOP_QUERY = '(min-width: 1024px)';
export const PHONE_QUERY = '(max-width: 640px)';

/** true mientras la pantalla cumpla la media query; se actualiza al cambiar de tamaño */
export const useMediaQuery = (query: string): boolean =>
  useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );