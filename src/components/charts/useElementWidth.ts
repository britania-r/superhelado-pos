// src/components/charts/useElementWidth.ts

import { useCallback, useLayoutEffect, useState } from 'react';

/**
 * Ancho real de un elemento (se actualiza al cambiar el tamaño de la pantalla o del panel).
 * Los gráficos lo usan para dibujar en píxeles reales: textos nítidos y del mismo tamaño siempre.
 */
export const useElementWidth = <T extends HTMLElement>() => {
  const [node, setNode] = useState<T | null>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    if (!node) return;
    setWidth(node.clientWidth);
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  const ref = useCallback((element: T | null) => setNode(element), []);
  return [ref, width] as const;
};