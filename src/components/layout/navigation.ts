// src/components/layout/navigation.ts

import type { Profile } from '../../types';

type Role = Profile['role'];

/** id del menú (lo usan los botones que lo abren o contraen) */
export const SIDEBAR_ID = 'app-sidebar';

export interface NavItem {
  path: string;
  icon: string; // clase de Boxicons
  label: string;
  roles: Role[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/* Mismas rutas y permisos que antes; solo se agrupan */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operación',
    items: [
      { path: '/', icon: 'bx-grid-alt', label: 'Punto de venta', roles: ['admin', 'vendedor'] },
      { path: '/sales', icon: 'bx-receipt', label: 'Ventas', roles: ['admin', 'vendedor'] },
      { path: '/cash-daily', icon: 'bx-calculator', label: 'Caja diaria', roles: ['admin', 'vendedor'] },
      { path: '/reports', icon: 'bx-bar-chart-alt-2', label: 'Reportes', roles: ['admin'] },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { path: '/management/products', icon: 'bx-package', label: 'Productos', roles: ['admin'] },
      { path: '/management/categories', icon: 'bx-category', label: 'Categorías', roles: ['admin'] },
      { path: '/management/stores', icon: 'bx-store-alt', label: 'Tiendas', roles: ['admin'] },
      { path: '/management/users', icon: 'bx-group', label: 'Usuarios', roles: ['admin'] },
      { path: '/management/payment-methods', icon: 'bx-credit-card', label: 'Métodos de pago', roles: ['admin'] },
    ],
  },
];

/** Grupos con solo los enlaces que el rol puede ver (sin grupos vacíos) */
export const getNavGroupsForRole = (role: Role): NavGroup[] =>
  NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);

/** Nombre de la sección actual, para la barra superior del celular */
export const getSectionLabel = (pathname: string): string | undefined => {
  const items = NAV_GROUPS.flatMap((group) => group.items);
  const match = items
    .filter((item) =>
      item.path === '/' ? pathname === '/' : pathname === item.path || pathname.startsWith(`${item.path}/`)
    )
    .sort((a, b) => b.path.length - a.path.length)[0];
  return match?.label;
};