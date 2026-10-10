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
  /** false: desactiva la X (útil mientras guarda) */
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

/* Solo se cierra a mano: con la X o con los botones del propio modal.
   Ni el clic afuera ni Escape lo cierran, para no perder lo escrito. */
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

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const unlockScroll = lockScroll();
    pushModal(modalId);
    panelRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab' && isTopModal(modalId) && panelRef.current) {
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

  /* Clic en el fondo: no cierra, solo un pequeño rebote para indicar
     que hay que usar los botones */
  const nudge = () => {
    const panel = panelRef.current;
    if (!panel || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    panel.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.015)' }, { transform: 'scale(1)' }],
      { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    );
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) nudge();
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