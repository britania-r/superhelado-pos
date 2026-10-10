// src/components/layout/Topbar.tsx

import { NavLink, useLocation } from 'react-router-dom';
import { Logo } from '../ui/Logo';
import { IconButton } from '../ui/IconButton';
import { SIDEBAR_ID, getSectionLabel } from './navigation';
import styles from './Topbar.module.css';

interface TopbarProps {
  menuOpen: boolean;
  onOpenMenu: () => void;
}

/* Solo en celular y tablet: logo, sección actual y botón de menú (a la derecha) */
export const Topbar = ({ menuOpen, onOpenMenu }: TopbarProps) => {
  const { pathname } = useLocation();
  const section = getSectionLabel(pathname);

  return (
    <header className={styles.topbar}>
      <div className={styles.start}>
        <NavLink to="/" className={styles.brand} aria-label="Ir al punto de venta">
          <Logo className={styles.logo} alt="" />
        </NavLink>
        {section && <span className={styles.section}>{section}</span>}
      </div>

      <IconButton
        icon="bx-menu"
        label="Abrir menú"
        onClick={onOpenMenu}
        aria-expanded={menuOpen}
        aria-controls={SIDEBAR_ID}
        className={styles.menuButton}
      />
    </header>
  );
};