// src/lib/labels.ts

import type { Profile } from '../types';

/* Textos para mostrar en pantalla (los valores de la BD no cambian) */
export const ROLE_LABELS: Record<Profile['role'], string> = {
  admin: 'Administrador',
  vendedor: 'Vendedor',
};

/** "María Pérez López" → "MP" */
export const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const second = parts.length > 1 ? parts[1][0] : parts[0][1] ?? '';
  return (first + second).toUpperCase();
};