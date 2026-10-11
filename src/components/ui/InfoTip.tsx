// src/components/ui/InfoTip.tsx

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../lib/cx';
import styles from './InfoTip.module.css';

interface InfoTipProps {
  /** Para lectores de pantalla y al pasar el mouse, por ejemplo "Qué es el ticket promedio" */
  label: string;
  /** La explicación */
  children: ReactNode;
  className?: string;
}

const GAP = 6;
const MARGIN = 8;

/**
 * Botón "?" con una explicación corta.
 * Con mouse se ve al pasar por encima; con clic o toque se queda abierta hasta
 * tocar afuera o presionar Escape.
 */
export const InfoTip = ({ label, children, className }: InfoTipProps) => {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'hover' | 'pinned' | null>(null);
  const [position, setPosition] = useState<CSSProperties>({ visibility: 'hidden' });
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const open = mode !== null;

  /* Debajo del botón y centrada; arriba si no entra; nunca se sale de la pantalla */
  const measure = useCallback(() => {
    const trigger = triggerRef.current;
    const popup = popupRef.current;
    if (!trigger || !popup) return;
    const rect = trigger.getBoundingClientRect();
    const width = popup.offsetWidth;
    const height = popup.offsetHeight;
    const centered = rect.left + rect.width / 2 - width / 2;
    const left = Math.max(MARGIN, Math.min(centered, window.innerWidth - width - MARGIN));
    const fitsBelow = rect.bottom + GAP + height + MARGIN <= window.innerHeight;
    const top = fitsBelow || rect.top - GAP - height < MARGIN ? rect.bottom + GAP : rect.top - GAP - height;
    setPosition({ left, top });
  }, []);

  const show = (next: 'hover' | 'pinned') => {
    if (!triggerRef.current) return;
    setPortalTarget(triggerRef.current.closest<HTMLElement>('[role="dialog"]') ?? document.body);
    setPosition({ visibility: 'hidden' });
    setMode(next);
  };

  const hide = useCallback(() => setMode(null), []);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, measure]);

  /* Toque afuera o Escape: se cierra */
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || popupRef.current?.contains(target)) return;
      hide();
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      hide();
      triggerRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [open, hide]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={cx(styles.trigger, open && styles.active, className)}
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => (mode === 'pinned' ? hide() : show('pinned'))}
        onPointerEnter={(event) => event.pointerType === 'mouse' && mode === null && show('hover')}
        onPointerLeave={(event) => event.pointerType === 'mouse' && mode === 'hover' && hide()}
        onBlur={() => mode === 'hover' && hide()}
      >
        <i className="bx bx-help-circle" aria-hidden="true" />
      </button>

      {open &&
        portalTarget &&
        createPortal(
          <div ref={popupRef} id={id} role="tooltip" className={styles.popup} style={position}>
            {children}
          </div>,
          portalTarget
        )}
    </>
  );
};