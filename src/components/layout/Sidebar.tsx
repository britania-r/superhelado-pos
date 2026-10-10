// src/components/layout/Sidebar.tsx

import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useUserStore } from '../../store/userStore';
import { useStores } from '../../hooks/queries';
import { cx } from '../../lib/cx';
import { ROLE_LABELS, getInitials } from '../../lib/labels';
import { Logo } from '../ui/Logo';
import { IconButton } from '../ui/IconButton';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { SIDEBAR_ID, getNavGroupsForRole } from './navigation';
import styles from './Sidebar.module.css';

interface SidebarProps {
  /** Escritorio: menú angosto, solo íconos */
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Celular y tablet: panel abierto desde la derecha */
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar = ({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }: SidebarProps) => {
  const logout = useUserStore((state) => state.logout);
  const { profile, isLoading: isProfileLoading } = useUserStore();
  const { data: stores = [] } = useStores();
  const navigate = useNavigate();

  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Al abrir el panel en celular, el foco va al botón de cerrar
  useEffect(() => {
    if (mobileOpen) closeButtonRef.current?.focus({ preventScroll: true });
  }, [mobileOpen]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
      toast.success('Sesión cerrada con éxito.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cerrar sesión.');
    } finally {
      setIsLoggingOut(false);
      setIsLogoutConfirmOpen(false);
    }
  };

  const groups = !isProfileLoading && profile ? getNavGroupsForRole(profile.role) : [];

  const displayName = profile?.full_name?.trim() || 'Usuario';
  const roleLabel = profile ? ROLE_LABELS[profile.role] : '';
  const storeLabel =
    profile?.role === 'admin'
      ? 'Todas las tiendas'
      : stores.find((store) => store.id === profile?.store_id)?.name ?? 'Sin tienda';

  return (
    <aside
      id={SIDEBAR_ID}
      className={cx(styles.sidebar, collapsed && styles.collapsed, mobileOpen && styles.open)}
      aria-label="Menú principal"
    >
      {/* ── Marca ── */}
      <div className={styles.header}>
        <NavLink to="/" className={styles.brand} onClick={onCloseMobile} aria-label="Ir al punto de venta">
          <span className={styles.logoSign}>
            <Logo variant="full" className={styles.logoFull} alt="" />
            <Logo variant="mark" className={styles.logoMark} alt="" />
          </span>
        </NavLink>

        {/* Escritorio: contraer / expandir */}
        <IconButton
          icon="bx-chevron-left"
          label={collapsed ? 'Expandir menú' : 'Contraer menú'}
          variant="secondary"
          size="sm"
          className={styles.collapseButton}
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          aria-controls={SIDEBAR_ID}
        />

        {/* Celular: cerrar el panel */}
        <IconButton
          ref={closeButtonRef}
          icon="bx-x"
          label="Cerrar menú"
          variant="onBrand"
          className={styles.closeButton}
          onClick={onCloseMobile}
        />
      </div>

      {/* ── Enlaces ── */}
      <nav className={styles.nav}>
        {groups.map((group) => (
          <div key={group.label} className={styles.group}>
            <p className={styles.groupLabel}>{group.label}</p>
            <ul className={styles.list}>
              {group.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    onClick={onCloseMobile}
                    data-tooltip={item.label}
                    className={({ isActive }) => cx(styles.link, isActive && styles.active)}
                  >
                    <i className={cx('bx', item.icon, styles.linkIcon)} aria-hidden="true" />
                    <span className={styles.linkText}>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Usuario ── */}
      <div className={styles.footer}>
        <div className={styles.user}>
          <span className={styles.avatar} aria-hidden="true">{getInitials(displayName)}</span>
          <div className={styles.userText}>
            <p className={styles.userName}>{displayName}</p>
            <p className={styles.userMeta}>
              {roleLabel}
              {roleLabel && ' · '}
              {storeLabel}
            </p>
          </div>
        </div>
        <IconButton
          icon="bx-log-out"
          label="Cerrar sesión"
          variant="onBrand"
          className={styles.logoutButton}
          data-tooltip="Cerrar sesión"
          onClick={() => setIsLogoutConfirmOpen(true)}
        />
      </div>

      <ConfirmDialog
        isOpen={isLogoutConfirmOpen}
        title="¿Cerrar sesión?"
        message="Tendrás que volver a ingresar con tu correo y contraseña."
        confirmLabel="Cerrar sesión"
        tone="danger"
        icon="bx-log-out"
        loading={isLoggingOut}
        onConfirm={handleLogout}
        onCancel={() => setIsLogoutConfirmOpen(false)}
      />
    </aside>
  );
};