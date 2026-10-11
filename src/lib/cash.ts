// src/lib/cash.ts

import type { BadgeTone } from '../components/ui/Badge';

export interface CashDifferenceStatus {
  tone: BadgeTone;
  icon: string;
  label: string;
}

/* Diferencia entre lo contado y lo esperado en caja.
   Menos de medio céntimo cuenta como cero (los decimales de JS no son exactos). */
export const getCashDifferenceStatus = (difference: number): CashDifferenceStatus => {
  if (Math.abs(difference) < 0.005) return { tone: 'success', icon: 'bx-check-circle', label: 'Cuadra' };
  return difference < 0
    ? { tone: 'danger', icon: 'bx-trending-down', label: 'Faltante' }
    : { tone: 'warning', icon: 'bx-trending-up', label: 'Sobrante' };
};