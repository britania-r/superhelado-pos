// src/components/ui/ConfirmDialog.tsx

import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { Modal } from './Modal';
import { Button } from './Button';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' para acciones destructivas (borrar, cerrar sesión) */
  tone?: 'primary' | 'danger';
  /** Ícono de Boxicons que acompaña al mensaje */
  icon?: string;
  /** Mientras es true, el botón muestra spinner y no se puede cerrar */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/* Reemplaza a window.confirm con el diseño de la app */
export const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'primary',
  icon = tone === 'danger' ? 'bx-error' : 'bx-help-circle',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => (
  <Modal
    isOpen={isOpen}
    onClose={onCancel}
    title={title}
    size="sm"
    dismissible={!loading}
    footer={
      <>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={tone} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </>
    }
  >
    <div className={styles.content}>
      <span className={cx(styles.icon, styles[tone])} aria-hidden="true">
        <i className={cx('bx', icon)} />
      </span>
      {message && <div className={styles.message}>{message}</div>}
    </div>
  </Modal>
);