// src/components/ui/Modal.tsx

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../lib/cx';
import { lockScroll } from '../../lib/scrollLock';
import { isTopModal, pushModal, removeModal } from '../../lib/modalStack';
import { IconButton } from './IconButton';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Texto corto bajo el título */
  description?: string;
  children: ReactNode;
  /** Botones fijos al pie (por ejemplo Cancelar · Guardar) */
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** false: no se cierra con Escape ni clic afuera (útil mientras guarda) */
  dismissible?: boolean;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/* Mantiene el foco del teclado dentro del modal */
const trapTab = (event: KeyboardEvent, container: HTMLElement) => {
  const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element.offsetParent !== null
  );
  if (items.length === 0) {
    event.preventDefault();
    container.focus();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || active === container)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
};

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  dismissible = true,
}: ModalProps) => {
  const modalId = useId();
  const titleId = `${modalId}-title`;
  const descriptionId = `${modalId}-description`;
  const panelRef = useRef<HTMLDivElement>(null);

  // Las últimas versiones de onClose y dismissible, sin reiniciar el efecto
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  useEffect(() => {
    onCloseRef.current = onClose;
    dismissibleRef.current = dismissible;
  });

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const unlockScroll = lockScroll();
    pushModal(modalId);
    panelRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopModal(modalId)) return;
      if (event.key === 'Escape' && dismissibleRef.current) {
        event.preventDefault();
        onCloseRef.current();
      } else if (event.key === 'Tab' && panelRef.current) {
        trapTab(event, panelRef.current);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      removeModal(modalId);
      unlockScroll();
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [isOpen, modalId]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        // Solo si el clic empieza en el fondo (no al soltar un arrastre desde un campo)
        if (event.target === event.currentTarget && dismissible) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cx(styles.panel, styles[size])}
      >
        <header className={styles.header}>
          <div className={styles.headings}>
            <h2 id={titleId} className={styles.title}>{title}</h2>
            {description && (
              <p id={descriptionId} className={styles.description}>{description}</p>
            )}
          </div>
          <IconButton icon="bx-x" label="Cerrar" onClick={onClose} disabled={!dismissible} />
        </header>

        <div className={styles.body}>{children}</div>

        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>,
    document.body
  );
};