// src/components/layout/Sidebar.tsx

import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import styles from './Sidebar.module.css';
import { useUserStore } from '../../store/userStore';
import { Modal } from '../ui/Modal';
import toast from 'react-hot-toast';

const allNavLinks = [
  { path: '/', icon: 'bx-grid-alt', label: 'Punto de Venta', roles: ['admin', 'vendedor'] },
  { path: '/sales', icon: 'bx-dollar', label: 'Ventas', roles: ['admin', 'vendedor'] },
  { path: '/reports', icon: 'bx-bar-chart-alt-2', label: 'Reportes', roles: ['admin'] },
  { path: '/cash-daily', icon: 'bx-calculator', label: 'Caja Diaria', roles: ['admin', 'vendedor'] }, // <-- Enlace a la nueva página
  { path: '/management/products', icon: 'bx-package', label: 'Productos', roles: ['admin'] },
  { path: '/management/categories', icon: 'bxs-category', label: 'Categorías', roles: ['admin'] },
  { path: '/management/stores', icon: 'bxs-store', label: 'Tiendas', roles: ['admin'] },
  { path: '/management/users', icon: 'bx-group', label: 'Usuarios', roles: ['admin'] },
  { path: '/management/payment-methods', icon: 'bx-credit-card-alt', label: 'Métodos de Pago', roles: ['admin'] },
];

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
}

export const Sidebar = ({ isCollapsed, setIsCollapsed }: SidebarProps) => {
  const logout = useUserStore(state => state.logout);
  const { profile, isLoading: isProfileLoading } = useUserStore();
  const navigate = useNavigate();

  const [isLogoutConfirmModalOpen, setIsLogoutConfirmModalOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      toast.success("Sesión cerrada con éxito.");
    } catch (error: any) {
      toast.error(error.message || "Error al cerrar sesión.");
    } finally {
      setIsLogoutConfirmModalOpen(false);
    }
  };

  const filteredNavLinks = allNavLinks.filter(link => {
    if (isProfileLoading || !profile) {
      return false;
    }
    if (!link.roles) {
      return false;
    }
    return link.roles.includes(profile.role);
  });

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.brand}>
        <i className={`bx bxs-store-alt ${styles.brandIcon}`}></i>
        <span className={styles.brandText}>Super Helado</span>
        <button 
          className={styles.toggleButton} 
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <i className='bx bx-chevron-left'></i>
        </button>
      </div>

      <nav className={styles.nav}>
        {filteredNavLinks.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) => 
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            <i className={`bx ${link.icon}`}></i>
            <span className={styles.navText}>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.logout}>
        <button onClick={() => setIsLogoutConfirmModalOpen(true)} className={styles.navLink}>
          <i className='bx bx-log-out'></i>
          <span className={styles.navText}>Cerrar Sesión</span>
        </button>
      </div>

      <Modal
        isOpen={isLogoutConfirmModalOpen}
        onClose={() => setIsLogoutConfirmModalOpen(false)}
        title="Confirmar Cierre de Sesión"
      >
        <div className={styles.confirmContent}>
          <p>¿Estás seguro de que quieres cerrar la sesión?</p>
          <div className={styles.confirmActions}>
            <button 
              onClick={() => setIsLogoutConfirmModalOpen(false)} 
              className={styles.cancelButton}
            >
              No
            </button>
            <button 
              onClick={handleLogout} 
              className={styles.confirmButton}
            >
              Sí, Cerrar Sesión
            </button>
          </div>
        </div>
      </Modal>
    </aside>
  );
};