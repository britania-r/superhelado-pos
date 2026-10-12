// src/components/layout/MainLayout.tsx

import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { cx } from '../../lib/cx';
import { lockScroll } from '../../lib/scrollLock';
import { isAnyModalOpen } from '../../lib/modalStack';
import { DESKTOP_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { InstallBanner } from '../pwa/InstallBanner';
import styles from './MainLayout.module.css';

const COLLAPSED_KEY = 'chepys.sidebar.collapsed';

/* El navegador puede bloquear el almacenamiento (modo privado): no debe romper nada */
const readCollapsed = (): boolean => {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
};

export const MainLayout = () => {
  const { pathname } = useLocation();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  // Escritorio: menú contraído o no (se recuerda entre visitas)
  const [collapsed, setCollapsed] = useState(readCollapsed);

  // Celular: el menú queda abierto solo en la página donde se abrió,
  // así se cierra solo al navegar (también con el botón "atrás")
  const [menuOpenAt, setMenuOpenAt] = useState<string | null>(null);
  const mobileMenuOpen = !isDesktop && menuOpenAt === pathname;
  const closeMobileMenu = () => setMenuOpenAt(null);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
      // Sin almacenamiento: el menú vuelve a su estado normal al recargar
    }
  }, [collapsed]);

  // Con el menú móvil abierto: sin scroll de fondo y Escape lo cierra
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const unlockScroll = lockScroll();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isAnyModalOpen()) setMenuOpenAt(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      unlockScroll();
    };
  }, [mobileMenuOpen]);

  return (
    <div className={cx(styles.layout, collapsed && styles.collapsed)}>
      <Topbar menuOpen={mobileMenuOpen} onOpenMenu={() => setMenuOpenAt(pathname)} />

      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={closeMobileMenu}
      />

      <div
        className={cx(styles.backdrop, mobileMenuOpen && styles.backdropVisible)}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />

      <main className={styles.content}>
        <Outlet />
      </main>

      <InstallBanner placement="layout" />
    </div>
  );
};